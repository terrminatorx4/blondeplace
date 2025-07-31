console.log('📦 Starting post-build process...');

// Файл: postbuild.js (Динамический sitemap как в Butler Factory)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://blondeplace.netlify.app';
const DIST_DIR = path.join(__dirname, 'dist');

async function scanHtmlFiles(dir) {
    const urls = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            const subUrls = await scanHtmlFiles(fullPath);
            urls.push(...subUrls);
        } else if (entry.name === 'index.html') {
            // Получаем относительный путь от dist директории
            const relativePath = path.relative(DIST_DIR, fullPath);
            const urlPath = path.dirname(relativePath).replace(/\\/g, '/');
            
            // Формируем правильный URL
            let url;
            if (urlPath === '.' || urlPath === '') {
                url = SITE_URL;
            } else {
                url = `${SITE_URL}/${urlPath}/`;
            }
            
            urls.push(url);
        }
    }
    
    return urls;
}

async function generateSitemap() {
    try {
        console.log('🗺️ Генерируем динамический sitemap...');
        
        // Проверяем существование dist директории
        try {
            await fs.access(DIST_DIR);
        } catch (error) {
            console.error('❌ Директория dist не найдена. Запустите сначала build.');
            return;
        }
        
        // Сканируем HTML файлы
        const urls = await scanHtmlFiles(DIST_DIR);
        
        // Сортируем URLs для консистентности
        urls.sort();
        
        console.log(`📊 Найдено ${urls.length} страниц:`);
        urls.forEach(url => console.log(`  - ${url}`));
        
        // Генерируем XML sitemap
        const now = new Date().toISOString();
        
        let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
        
        urls.forEach(url => {
            // Определяем приоритет и частоту изменений
            let priority = '0.8';
            let changefreq = 'weekly';
            
            if (url === SITE_URL) {
                priority = '1.0';
                changefreq = 'daily';
            } else if (url.includes('/blog/') && !url.endsWith('/blog/')) {
                priority = '0.9';
                changefreq = 'monthly';
            } else if (url.endsWith('/blog/')) {
                priority = '0.9';
                changefreq = 'daily';
            }
            
            sitemapXml += `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
        });
        
        sitemapXml += `</urlset>`;
        
        // Записываем sitemap
        const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');
        await fs.writeFile(sitemapPath, sitemapXml, 'utf8');
        
        console.log(`✅ Sitemap успешно создан: ${sitemapPath}`);
        console.log(`📍 Доступен по адресу: ${SITE_URL}/sitemap.xml`);
        
        // Генерируем robots.txt
        const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`;
        
        const robotsPath = path.join(DIST_DIR, 'robots.txt');
        await fs.writeFile(robotsPath, robotsTxt, 'utf8');
        
        console.log(`🤖 Robots.txt обновлен: ${robotsPath}`);
        
    } catch (error) {
        console.error('❌ Ошибка при генерации sitemap:', error);
        throw error;
    }
}

// Запускаем если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    generateSitemap();
}

export default generateSitemap;
```

### ШАГ 4: ЗАМЕНА NETLIFY.TOML ДЛЯ ОПТИМАЛЬНОЙ КОНФИГУРАЦИИ

**Файл:** `netlify.toml`

**Действие:** Полностью замените содержимое файла на код ниже:

```toml
[build]
  command = "npm run build && node postbuild.js"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-sitemap"

[plugins.inputs]
  buildDir = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.svg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/sitemap.xml"
  [headers.values]
    Cache-Control = "public, max-age=3600"
    Content-Type = "application/xml"

[[headers]]
  for = "/robots.txt"
  [headers.values]
    Cache-Control = "public, max-age=3600"
    Content-Type = "text/plain"

[[redirects]]
  from = "/blog/index.html"
  to = "/blog/"
  status = 301

[[redirects]]
  from = "/index.html"
  to = "/"
  status = 301

# Security headers для улучшения SEO и безопасности (как в Butler Factory)
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.unsplash.com https://mc.yandex.ru; media-src 'self'; connect-src 'self' https://api.indexnow.org; frame-src 'none';"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"

# Кеширование для лучшей производительности
[[headers]]
  for = "/blog/*"
  [headers.values]
    Cache-Control = "public, max-age=3600, s-maxage=86400"

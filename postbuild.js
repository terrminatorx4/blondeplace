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
            
            // ФИЛЬТРУЕМ СЛУЖЕБНЫЕ ДИРЕКТОРИИ
            const excludePatterns = [
                '_astro',           // Astro служебные файлы
                'admin',            // Админ панели
                'private',          // Приватные файлы
                '_next',            // Next.js файлы
                '_nuxt',            // Nuxt.js файлы
                'api',              // API эндпоинты
                '.well-known',      // Служебные файлы
                'verification'      // Файлы верификации
            ];
            
            // Проверяем, не содержит ли путь исключаемые паттерны
            const shouldExclude = excludePatterns.some(pattern => 
                urlPath.includes(pattern) || urlPath.startsWith(pattern)
            );
            
            if (shouldExclude) {
                return; // Пропускаем этот URL
            }
            
            // Формируем правильный URL
            let url;
            if (urlPath === '.' || urlPath === '') {
                url = SITE_URL;
            } else {
                url = `${SITE_URL}/${urlPath}/`;
            }
            
            urls.push(url);
        } else if (entry.name.endsWith('.html') && !entry.name.startsWith('google') && !entry.name.startsWith('yandex') && !entry.name.includes('verification')) {
            // ОБРАБАТЫВАЕМ ДРУГИЕ HTML ФАЙЛЫ (исключая верификации)
            const relativePath = path.relative(DIST_DIR, fullPath);
            const urlPath = relativePath.replace(/\\/g, '/').replace('.html', '');
            
            // Исключаем служебные файлы
            if (!urlPath.includes('_astro') && !urlPath.includes('admin') && !urlPath.includes('api')) {
                const url = `${SITE_URL}/${urlPath}`;
                urls.push(url);
            }
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

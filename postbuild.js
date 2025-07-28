// BlondePlace Postbuild - Copied from Butler Logic
import fs from 'fs/promises';
import path from 'path';

const SITE_URL = 'https://blondeplace.netlify.app';
const DIST_DIR = './blondeplace-blog/dist';

async function findHtmlFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function generateSitemap() {
  console.log('--- BlondePlace Sitemap Generator (Butler Logic) ---');
  try {
    // Проверяем существование dist директории
    try {
      await fs.access(DIST_DIR);
    } catch (error) {
      console.log('[INFO] Dist directory not found, skipping sitemap generation');
      return;
    }

    // Рекурсивно ищем все HTML файлы в папке сборки 'dist'
    const files = await findHtmlFiles(DIST_DIR);

    const urls = files.map(file => {
      // Превращаем путь к файлу в URL
      let relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/');
      if (relativePath.endsWith('index.html')) {
        // Убираем 'index.html' для корневых страниц директорий
        relativePath = relativePath.slice(0, -10);
      } else {
        // Убираем '.html' для всех остальных
        relativePath = relativePath.slice(0, -5);
      }
      
      // Убираем начальный слеш если есть
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
      
      return `
    <url>
        <loc>${SITE_URL}/${relativePath}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>0.8</priority>
        <changefreq>daily</changefreq>
    </url>`;
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.join('')}
</urlset>`;

    await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemapContent);
    console.log(`[✔] BlondePlace Sitemap.xml successfully generated! Found ${urls.length} pages.`);

  } catch (error) {
    console.error('[!] Error generating sitemap:', error);
    // НЕ прерываем сборку из-за sitemap
  }
}

// Запускаем генерацию sitemap
generateSitemap();

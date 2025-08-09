import fs from 'fs';
import path from 'path';

// УЛЬТРА-ПРОСТОЙ POSTBUILD ДЛЯ ЭКОНОМИИ ПАМЯТИ
console.log('🚀 Starting ultra-light postbuild process...');

const distDir = './dist';
const sitemapPath = path.join(distDir, 'sitemap.xml');
const robotsPath = path.join(distDir, 'robots.txt');

try {
  // ГЕНЕРИРУЕМ МИНИМАЛЬНЫЙ SITEMAP БЕЗ ОБХОДА ФАЙЛОВ
  const simpleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://blondeplace.netlify.app/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://blondeplace.netlify.app/blog/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>`;

  // ЗАПИСЫВАЕМ ПРОСТОЙ SITEMAP
  fs.writeFileSync(sitemapPath, simpleSitemap, 'utf8');
  console.log('✅ Basic sitemap generated');

  // ГЕНЕРИРУЕМ ROBOTS.TXT
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://blondeplace.netlify.app/sitemap.xml`;

  fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
  console.log('✅ Robots.txt generated');

  console.log('🎯 Postbuild completed successfully with minimal resource usage!');

} catch (error) {
  console.error('❌ Postbuild error:', error.message);
  // НЕ ПРЕРЫВАЕМ БИЛД ИЗ-ЗА ОШИБОК POSTBUILD
  process.exit(0);
} 
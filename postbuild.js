console.log('📦 Starting post-build process...');

// ПРОСТАЯ SITEMAP ГЕНЕРАЦИЯ
import fs from 'fs';
import path from 'path';

const siteUrl = 'https://blondeplace.netlify.app';
const distDir = './dist';

function generateSitemap() {
  console.log('🗺️ Generating sitemap...');
  
  const urls = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/services/', priority: '0.9', changefreq: 'weekly' },
    { url: '/about/', priority: '0.8', changefreq: 'monthly' },
    { url: '/contacts/', priority: '0.8', changefreq: 'monthly' },
    { url: '/beauty-coworking/', priority: '0.7', changefreq: 'monthly' },
    { url: '/blog/', priority: '0.6', changefreq: 'daily' }
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${siteUrl}${item.url}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
  console.log('✅ Sitemap generated');
}

function generateRobots() {
  console.log('🤖 Generating robots.txt...');
  
  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
  console.log('✅ Robots.txt generated');
}

// ГЕНЕРИРУЕМ ФАЙЛЫ
try {
  if (fs.existsSync(distDir)) {
    generateSitemap();
    generateRobots();
    console.log('✅ Post-build completed successfully');
  } else {
    console.error('❌ Dist directory not found');
  }
} catch (error) {
  console.error('❌ Post-build error:', error.message);
}

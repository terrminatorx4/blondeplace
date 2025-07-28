// Emergency Simplified Postbuild
import { readdir, writeFile, access } from 'fs/promises';
import { join, relative } from 'path';

const SITE_URL = 'https://blondeplace.netlify.app';
const DIST_DIR = './blondeplace-blog/dist';

async function findHtmlFiles(dir) {
  try {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await findHtmlFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
    
    return files;
  } catch (error) {
    console.log('Error reading directory:', error.message);
    return [];
  }
}

async function generateSitemap() {
  console.log('--- Emergency Sitemap Generator ---');
  
  try {
    // Check if dist exists
    await access(DIST_DIR);
  } catch (error) {
    console.log('Dist directory not found, skipping sitemap');
    return;
  }

  try {
    const files = await findHtmlFiles(DIST_DIR);
    
    if (files.length === 0) {
      console.log('No HTML files found');
      return;
    }

    const urls = files.map(file => {
      let relativePath = relative(DIST_DIR, file).replace(/\\/g, '/');
      
      if (relativePath.endsWith('index.html')) {
        relativePath = relativePath.slice(0, -10);
      } else if (relativePath.endsWith('.html')) {
        relativePath = relativePath.slice(0, -5);
      }
      
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
      
      return `    <url>
        <loc>${SITE_URL}/${relativePath}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>0.8</priority>
    </url>`;
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    await writeFile(join(DIST_DIR, 'sitemap.xml'), sitemapContent);
    console.log(`✅ Sitemap generated with ${urls.length} pages`);

  } catch (error) {
    console.log('Error generating sitemap:', error.message);
  }
}

// Run sitemap generation
generateSitemap().catch(console.error);

/**
 * Generate sitemap.xml from collections data
 * Run: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://playlabgardens.com';
const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const outputPath = path.join(__dirname, '..', 'sitemap.xml');

const collections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const today = new Date().toISOString().split('T')[0];

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/seeds.html', priority: '0.8', changefreq: 'weekly' },
  { path: '/cultivators.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/share.html', priority: '0.6', changefreq: 'monthly' },
];

const collectionPages = collections.map(col => ({
  path: `/collection.html?id=${col.id}`,
  priority: col.id === 'flowers' ? '0.9' : '0.7',
  changefreq: 'weekly',
}));

const allPages = [...staticPages, ...collectionPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${DOMAIN}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(outputPath, xml);
console.log(`Sitemap generated: ${outputPath}`);
console.log(`  ${staticPages.length} static pages + ${collectionPages.length} collection pages = ${allPages.length} total URLs`);

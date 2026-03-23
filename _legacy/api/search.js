const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Build a flat deduplicated list of all apps for search
const appMap = new Map();
for (const col of allCollections) {
  for (const app of col.apps) {
    if (!appMap.has(app.id)) appMap.set(app.id, app);
  }
}
const allApps = [...appMap.values()];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.status(200).json({ results: [] });
  }

  const results = allApps
    .filter(app => app.name.toLowerCase().includes(q))
    .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
    .slice(0, 50);

  res.status(200).json({ results });
};

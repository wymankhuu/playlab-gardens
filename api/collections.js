const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Filter out seed collections (they have their own page)
  const nonSeedCollections = allCollections.filter(col => col.type !== 'seed');

  // Return collections with first 6 apps as previews
  const summary = nonSeedCollections.map(col => ({
    id: col.id,
    name: col.name,
    description: col.description,
    type: col.type,
    iconColor: col.iconColor,
    iconEmoji: col.iconEmoji,
    appCount: col.appCount,
    previewApps: col.apps.slice(0, 6),
  }));

  res.status(200).json(summary);
};

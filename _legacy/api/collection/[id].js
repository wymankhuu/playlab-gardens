const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const col = allCollections.find(c => c.id === id);

  if (!col) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  res.status(200).json({
    id: col.id,
    name: col.name,
    description: col.description,
    type: col.type,
    iconColor: col.iconColor,
    iconEmoji: col.iconEmoji,
    appCount: col.appCount,
    apps: col.apps,
  });
};

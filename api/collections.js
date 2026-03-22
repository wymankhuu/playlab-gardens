const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/**
 * Check if an app name looks like a Ghana/Y1/Y2 curriculum app.
 */
function isGhanaApp(name) {
  var lower = (name || '').toLowerCase();
  if (lower.indexOf('ghana') !== -1) return true;
  if (lower.match(/^y[12]\s*[-–]/)) return true;
  if (lower.match(/^year\s*[12]\s*[-–]/)) return true;
  return false;
}

/**
 * Pick N diverse preview apps from a list sorted by sessions.
 * - Skips Ghana/Y1/Y2 apps entirely (unless it's the Ghana collection)
 * - Limits to 1 app per creator for variety
 */
function pickDiversePreview(apps, n, collectionName) {
  var isGhanaCollection = (collectionName || '').toLowerCase().trim() === 'ghana';
  var picked = [];
  var seenCreators = {};

  for (var i = 0; i < apps.length && picked.length < n; i++) {
    var app = apps[i];

    // Skip Ghana/Y1/Y2 apps outside the Ghana collection
    if (!isGhanaCollection && isGhanaApp(app.name)) continue;

    // Limit 1 per creator for variety (skip unknown/empty creators)
    var creator = (app.creator || '').toLowerCase().trim();
    if (creator && seenCreators[creator]) continue;

    picked.push(app);
    if (creator) seenCreators[creator] = true;
  }

  // If we didn't fill N, do a second pass relaxing creator uniqueness
  if (picked.length < n) {
    for (var j = 0; j < apps.length && picked.length < n; j++) {
      if (picked.indexOf(apps[j]) !== -1) continue;
      if (!isGhanaCollection && isGhanaApp(apps[j].name)) continue;
      picked.push(apps[j]);
    }
  }

  return picked;
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Filter out seed collections (they have their own page)
  const nonSeedCollections = allCollections.filter(col => col.type !== 'seed');

  // Return collections with diverse preview apps (max 2 Ghana/Y1/Y2 per preview)
  const summary = nonSeedCollections.map(col => ({
    id: col.id,
    name: col.name,
    description: col.description,
    type: col.type,
    iconColor: col.iconColor,
    iconEmoji: col.iconEmoji,
    appCount: col.appCount,
    previewApps: pickDiversePreview(col.apps, 6, col.name),
  }));

  res.status(200).json(summary);
};

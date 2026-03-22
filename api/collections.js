const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Ghana/Y1/Y2 pattern — skip entirely in previews (except the Ghana collection itself)
const GHANA_Y_RE = /^y[12]\s*[-–]|^year\s*[12]\s*[-–]|ghana/i;

/**
 * Pick N diverse preview apps from a list sorted by sessions.
 * - Skips Ghana/Y1/Y2 apps entirely (unless it's the Ghana collection)
 * - Limits to 1 app per creator for variety
 */
function pickDiversePreview(apps, n, collectionName) {
  const isGhanaCollection = /^ghana$/i.test((collectionName || '').trim());
  const picked = [];
  const seenCreators = new Set();

  for (const app of apps) {
    if (picked.length >= n) break;

    // Skip Ghana/Y1/Y2 apps outside the Ghana collection
    if (!isGhanaCollection && GHANA_Y_RE.test(app.name)) continue;

    // Limit 1 per creator for variety (skip unknown/empty creators)
    const creator = (app.creator || '').toLowerCase().trim();
    if (creator && seenCreators.has(creator)) continue;

    picked.push(app);
    if (creator) seenCreators.add(creator);
  }

  // If we didn't fill 6 (strict filters), do a second pass relaxing creator uniqueness
  if (picked.length < n) {
    for (const app of apps) {
      if (picked.length >= n) break;
      if (picked.includes(app)) continue;
      if (!isGhanaCollection && GHANA_Y_RE.test(app.name)) continue;
      picked.push(app);
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

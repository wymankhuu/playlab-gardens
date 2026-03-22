const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Ghana/Y1/Y2 pattern — these apps tend to dominate by session count
const GHANA_Y_RE = /^y[12]\s*[-–]/i|^year\s*[12]\s*[-–]/i|ghana/i;

/**
 * Pick N diverse preview apps from a list sorted by sessions.
 * Caps Ghana/Y1/Y2 apps at 2 so other creators get visibility.
 */
function pickDiversePreview(apps, n) {
  const picked = [];
  let ghanaCount = 0;
  const MAX_GHANA = 2;

  for (const app of apps) {
    if (picked.length >= n) break;
    const isGhanaY = GHANA_Y_RE.test(app.name);
    if (isGhanaY && ghanaCount >= MAX_GHANA) continue;
    picked.push(app);
    if (isGhanaY) ghanaCount++;
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
    previewApps: pickDiversePreview(col.apps, 6),
  }));

  res.status(200).json(summary);
};

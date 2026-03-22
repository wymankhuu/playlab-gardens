const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Collections to hide from the Gardens page
const HIDDEN_COLLECTIONS = ['religious studies'];

// Collections that are allowed to show Y1/Y2/Ghana apps
const GHANA_ALLOWED = ['ghana', 'flowers'];

function isGhanaApp(name) {
  var lower = name.toLowerCase();
  if (lower.indexOf('ghana') >= 0) return true;
  if (lower.substring(0, 2) === 'y1' || lower.substring(0, 2) === 'y2') return true;
  if (lower.substring(0, 6) === 'year 1' || lower.substring(0, 6) === 'year 2') return true;
  return false;
}

function pickPreview(apps, count, collectionName) {
  var colLower = collectionName.toLowerCase();
  var allowGhana = GHANA_ALLOWED.indexOf(colLower) >= 0;
  var picked = [];
  var seenCreators = {};

  // Pass 1: unique creators, skip Ghana apps if not allowed
  for (var i = 0; i < apps.length; i++) {
    if (picked.length >= count) break;
    if (!allowGhana && isGhanaApp(apps[i].name)) continue;
    var creator = (apps[i].creator || '').toLowerCase().trim();
    if (creator && seenCreators[creator]) continue;
    picked.push(apps[i]);
    if (creator) seenCreators[creator] = true;
  }

  // Pass 2: relax creator uniqueness if we didn't fill enough
  if (picked.length < count) {
    for (var j = 0; j < apps.length; j++) {
      if (picked.length >= count) break;
      if (picked.indexOf(apps[j]) !== -1) continue;
      if (!allowGhana && isGhanaApp(apps[j].name)) continue;
      picked.push(apps[j]);
    }
  }

  // Pass 3: last resort, allow any app
  if (picked.length < count) {
    for (var k = 0; k < apps.length; k++) {
      if (picked.length >= count) break;
      if (picked.indexOf(apps[k]) === -1) picked.push(apps[k]);
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

  // Filter out seed collections and hidden collections
  var filtered = allCollections.filter(function(col) {
    if (col.type === 'seed') return false;
    if (HIDDEN_COLLECTIONS.indexOf(col.name.toLowerCase()) >= 0) return false;
    return true;
  });

  var summary = filtered.map(function(col) {
    return {
      id: col.id,
      name: col.name,
      description: col.description,
      type: col.type,
      iconColor: col.iconColor,
      iconEmoji: col.iconEmoji,
      appCount: col.appCount,
      previewApps: pickPreview(col.apps, 6, col.name),
    };
  });

  res.status(200).json(summary);
};

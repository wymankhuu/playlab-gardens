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

  // Separate pinned from unpinned
  var pinnedApps = [];
  var unpinnedApps = [];
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].pinned) {
      pinnedApps.push(apps[i]);
    } else {
      unpinnedApps.push(apps[i]);
    }
  }

  var picked = [];
  var seenCreators = {};

  // Phase 1: Add pinned apps first (respecting Ghana filter)
  for (var p = 0; p < pinnedApps.length; p++) {
    if (picked.length >= count) break;
    if (!allowGhana && isGhanaApp(pinnedApps[p].name)) continue;
    picked.push(pinnedApps[p]);
    var pc = (pinnedApps[p].creator || '').toLowerCase().trim();
    if (pc) seenCreators[pc] = true;
  }

  // Phase 2: Fill remaining with unpinned, unique creators
  for (var j = 0; j < unpinnedApps.length; j++) {
    if (picked.length >= count) break;
    if (!allowGhana && isGhanaApp(unpinnedApps[j].name)) continue;
    var creator = (unpinnedApps[j].creator || '').toLowerCase().trim();
    if (creator && seenCreators[creator]) continue;
    picked.push(unpinnedApps[j]);
    if (creator) seenCreators[creator] = true;
  }

  // Phase 3: Relax creator uniqueness
  if (picked.length < count) {
    for (var k = 0; k < unpinnedApps.length; k++) {
      if (picked.length >= count) break;
      if (picked.indexOf(unpinnedApps[k]) !== -1) continue;
      if (!allowGhana && isGhanaApp(unpinnedApps[k].name)) continue;
      picked.push(unpinnedApps[k]);
    }
  }

  // Phase 4: Last resort, allow any app
  if (picked.length < count) {
    for (var m = 0; m < apps.length; m++) {
      if (picked.length >= count) break;
      if (picked.indexOf(apps[m]) === -1) picked.push(apps[m]);
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
    var previewCount = 9;

    return {
      id: col.id,
      name: col.name,
      description: col.description,
      type: col.type,
      iconColor: col.iconColor,
      iconEmoji: col.iconEmoji,
      appCount: col.appCount,
      previewApps: pickPreview(col.apps, previewCount, col.name),
    };
  });

  res.status(200).json(summary);
};

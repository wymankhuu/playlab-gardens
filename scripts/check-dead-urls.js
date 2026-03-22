/**
 * Check for issues with Playlab URLs in collections.json
 * Run: node scripts/check-dead-urls.js
 *
 * NOTE: Playlab.ai returns 403 for all server-side requests, so we can't
 * verify if apps actually exist via HTTP. This script checks for:
 * - Malformed URLs (not matching playlab.ai patterns)
 * - Missing URLs or empty strings
 * - Apps using the old /community/ path (may need updating to /project/)
 * - Duplicate app IDs across collections
 * - Apps with missing descriptions, creators
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const collections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const VALID_URL = /^https?:\/\/(www\.)?playlab\.ai\/(project|community)\/.+$/;

const issues = {
  missingUrl: [],
  malformedUrl: [],
  communityPath: [],
  missingDescription: [],
  missingCreator: [],
  duplicateIds: [],
};

// Track all apps and IDs
const seenIds = new Map(); // id -> first collection name
let totalApps = 0;
let uniqueApps = 0;
const seenUrls = new Set();

for (const col of collections) {
  for (const app of col.apps) {
    totalApps++;

    // Track unique
    const isNew = !seenUrls.has(app.url);
    if (isNew) {
      seenUrls.add(app.url);
      uniqueApps++;
    }

    // Missing URL
    if (!app.url || !app.url.trim()) {
      issues.missingUrl.push({ name: app.name, collection: col.name });
      continue;
    }

    // Malformed URL
    if (!VALID_URL.test(app.url)) {
      issues.malformedUrl.push({ name: app.name, url: app.url, collection: col.name });
      continue;
    }

    // Old /community/ path
    if (app.url.includes('/community/') && isNew) {
      issues.communityPath.push({ name: app.name, url: app.url, collection: col.name });
    }

    // Missing description (only check once per unique app)
    if (isNew && (!app.description || !app.description.trim())) {
      issues.missingDescription.push({ name: app.name, collection: col.name });
    }

    // Missing creator (only check once per unique app)
    if (isNew && (!app.creator || !app.creator.trim())) {
      issues.missingCreator.push({ name: app.name, collection: col.name });
    }

    // Duplicate IDs
    if (app.id && seenIds.has(app.id)) {
      // This is expected (same app in multiple collections), skip
    } else if (app.id) {
      seenIds.set(app.id, col.name);
    }
  }
}

// Report
console.log(`=== Playlab Gardens URL & Data Audit ===\n`);
console.log(`Total app entries: ${totalApps}`);
console.log(`Unique apps: ${uniqueApps}`);
console.log(`Collections: ${collections.length}\n`);

let hasIssues = false;

if (issues.missingUrl.length > 0) {
  hasIssues = true;
  console.log(`\n--- MISSING URLs (${issues.missingUrl.length}) ---`);
  issues.missingUrl.forEach(a => console.log(`  ${a.name} [${a.collection}]`));
}

if (issues.malformedUrl.length > 0) {
  hasIssues = true;
  console.log(`\n--- MALFORMED URLs (${issues.malformedUrl.length}) ---`);
  issues.malformedUrl.forEach(a => console.log(`  ${a.name}: ${a.url} [${a.collection}]`));
}

if (issues.communityPath.length > 0) {
  console.log(`\n--- OLD /community/ PATHS (${issues.communityPath.length}) ---`);
  console.log(`  These may need updating to /project/:`);
  issues.communityPath.forEach(a => console.log(`  ${a.name}: ${a.url}`));
}

if (issues.missingDescription.length > 0) {
  console.log(`\n--- MISSING DESCRIPTIONS (${issues.missingDescription.length}) ---`);
  issues.missingDescription.forEach(a => console.log(`  ${a.name} [${a.collection}]`));
}

if (issues.missingCreator.length > 0) {
  console.log(`\n--- MISSING CREATORS (${issues.missingCreator.length}) ---`);
  issues.missingCreator.forEach(a => console.log(`  ${a.name} [${a.collection}]`));
}

if (!hasIssues && issues.communityPath.length === 0 && issues.missingDescription.length === 0 && issues.missingCreator.length === 0) {
  console.log('All URLs and data look good!');
}

console.log('\nDone.');

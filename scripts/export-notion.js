/**
 * Export collection data from the "Showcase Apps Master" Notion database.
 * Groups apps by their "Collection" multi_select column.
 * Run locally: node scripts/export-notion.js
 * Requires .env with NOTION_API_KEY and NOTION_MASTER_DB_ID.
 */

require('dotenv/config');
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID || '32aa9d3778c580e89f18c2771cc02004';

// Colors drawn from the Playlab Gardens illustrations
const ICON_COLORS = [
  '#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A',
  '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D',
];

async function main() {
  console.log('Querying Showcase Apps Master database...');

  // 1. Fetch all rows from the database
  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`Fetched ${rows.length} apps from database.\n`);

  // 2. Parse each row into an app object and group by collection
  const collectionMap = {}; // collectionName → { apps: [], featured: false }

  for (const row of rows) {
    const props = row.properties;
    const app = parseRow(props);
    if (!app) continue;

    // Get collection tags
    const collections = (props['Collection']?.multi_select || []).map(s => s.name);
    if (collections.length === 0) continue;

    // Store collection tags on the app
    app.tags = collections;

    // Check featured flag
    const isFeatured = props['Featured']?.select?.name === 'Featured';

    for (const colName of collections) {
      if (!collectionMap[colName]) {
        collectionMap[colName] = { apps: [], hasFeatured: false };
      }
      // Clone app so each collection gets its own copy
      collectionMap[colName].apps.push({ ...app });
      if (isFeatured) collectionMap[colName].hasFeatured = true;
    }
  }

  // 3. Build collections array
  const collectionNames = Object.keys(collectionMap).sort();
  console.log(`Found ${collectionNames.length} collections:\n`);

  const collections = collectionNames.map((name, index) => {
    let { apps } = collectionMap[name];

    // Deduplicate by app ID and name, keeping the entry with the longest content
    const appByKey = {};
    for (const app of apps) {
      const key = app.id || app.name.toLowerCase().trim();
      const existing = appByKey[key];
      if (!existing) {
        appByKey[key] = app;
      } else {
        const existingLen = (existing.description || '').length + (existing.usage || '').length + (existing.impact || '').length;
        const newLen = (app.description || '').length + (app.usage || '').length + (app.impact || '').length;
        if (newLen > existingLen) {
          appByKey[key] = app;
        }
      }
    }
    // Also dedup by name (different IDs, same app)
    const appByName = {};
    for (const app of Object.values(appByKey)) {
      const nameKey = app.name.toLowerCase().trim();
      const existing = appByName[nameKey];
      if (!existing) {
        appByName[nameKey] = app;
      } else {
        const existingLen = (existing.description || '').length + (existing.usage || '').length + (existing.impact || '').length;
        const newLen = (app.description || '').length + (app.usage || '').length + (app.impact || '').length;
        if (newLen > existingLen) {
          appByName[nameKey] = app;
        }
      }
    }
    apps = Object.values(appByName);

    // Sort apps by sessions descending
    apps.sort((a, b) => (b.sessions || 0) - (a.sessions || 0));

    const col = {
      id: generateCollectionId(name),
      name,
      description: '',
      type: inferType(name),
      iconColor: ICON_COLORS[index % ICON_COLORS.length],
      iconEmoji: null,
      appCount: apps.length,
      apps,
    };

    console.log(`  ${name}: ${apps.length} apps (${col.type})`);
    return col;
  });

  // 4. Write to data/collections.json
  const outPath = path.join(__dirname, '..', 'data', 'collections.json');
  fs.writeFileSync(outPath, JSON.stringify(collections, null, 2));

  const totalApps = collections.reduce((sum, c) => sum + c.apps.length, 0);
  console.log(`\nExported ${collections.length} collections (${totalApps} app entries) to ${outPath}`);

  // 5. Export Cultivators
  await exportCultivators();
}

async function exportCultivators() {
  const CULTIVATORS_DB_ID = '32aa9d3778c580958a83fb9a78a86021';
  console.log('\nFetching cultivators...');

  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: CULTIVATORS_DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  const cultivators = rows.map(row => {
    const props = row.properties;
    const name = (props['Name']?.title || []).map(t => t.plain_text).join('').trim();
    if (!name) return null;

    const role = (props['Role']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const org = (props['Organization']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const about = (props['About']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const usage = (props['How It\'s Used']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const impact = (props['Impact']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const blogLink = (props['Link to Blog']?.rich_text || []).map(t => t.plain_text).join('').trim();

    // Headshot — get the URL from files property
    let headshotUrl = '';
    const headshot = props['Headshot']?.files || [];
    if (headshot.length > 0) {
      const file = headshot[0];
      headshotUrl = file.file?.url || file.external?.url || '';
    }

    return {
      name,
      role,
      organization: org,
      about,
      usage,
      impact,
      blogLink,
      headshotUrl,
    };
  }).filter(Boolean);

  const outPath = path.join(__dirname, '..', 'data', 'cultivators.json');
  fs.writeFileSync(outPath, JSON.stringify(cultivators, null, 2));
  console.log(`Exported ${cultivators.length} cultivators to ${outPath}`);
}

function parseRow(props) {
  // App name (title)
  const nameArr = props['App Name']?.title || [];
  const name = nameArr.map(t => t.plain_text).join('').trim();
  if (!name) return null;

  // URL
  const url = props['URL']?.url || '';

  // Extract app ID from URL
  let appId = '';
  if (url) {
    const match = url.match(/\/project\/([a-zA-Z0-9]+)/);
    if (match) appId = match[1];
  }

  // Creator
  const creator = richTextToString(props['Creator']);

  // Role
  const role = richTextToString(props['Role']);

  // Description
  const description = richTextToString(props['Description']);

  // How It's Being Used
  const usage = richTextToString(props['How It\'s Being Used']);

  // Impact
  const impact = richTextToString(props['Impact']);

  return {
    id: appId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description,
    url,
    creator,
    role,
    usage,
    impact,
    sessions: 0,
    iterations: 0,
  };
}

function richTextToString(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map(t => t.plain_text).join('').trim();
}

function generateCollectionId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function inferType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('showcase') || lower.includes('district') || lower.includes('ciob') ||
      lower.includes('kipp') || lower.includes('leading educators') || lower.includes('amplify') ||
      lower.includes('ghana') || lower.includes('nyc') || lower.includes('texas') ||
      lower.includes('fairfax') || lower.includes('california')) {
    return 'org';
  }
  return 'topic';
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});

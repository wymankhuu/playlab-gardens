/**
 * Fetch Sessions and Iterations from the original 5,400-entry database,
 * then update the master showcase database with the matched values.
 *
 * Run: node scripts/update-master-sessions.js
 */

require('dotenv/config');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const ORIGINAL_DB_ID = process.env.NOTION_DATABASE_ID; // 328a9d37...
const MASTER_DB_ID = process.env.NOTION_MASTER_DB_ID || '32aa9d3778c580e89f18c2771cc02004';

async function fetchAllRows(databaseId, filterProperties) {
  const rows = [];
  let cursor;
  let page = 0;
  do {
    page++;
    const params = {
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    };
    if (filterProperties) {
      params.filter_properties = filterProperties;
    }
    const response = await notion.databases.query(params);
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
    process.stdout.write(`\r  Fetched ${rows.length} rows (page ${page})...`);
  } while (cursor);
  console.log(`\n  Total: ${rows.length} rows`);
  return rows;
}

function extractProjectId(url) {
  if (!url) return '';
  // Handle both /project/ and /community/ URLs
  const match = url.match(/\/(project|community)\/([a-zA-Z0-9_-]+)/);
  return match ? match[2] : '';
}

async function main() {
  console.log('=== Step 1: Fetch original database (5,400 entries) ===');
  console.log(`Database ID: ${ORIGINAL_DB_ID}`);

  // Fetch only the fields we need: Sessions, Iterations, ID (URL), App Name
  const originalRows = await fetchAllRows(ORIGINAL_DB_ID, ['?vii', 't]Uo', 's?h=', 'title']);

  // Build lookup: projectId -> { sessions, iterations, name }
  const lookup = {};
  let withData = 0;

  for (const row of originalRows) {
    const props = row.properties;
    const sessions = props['Sessions']?.number;
    const iterations = props['Iterations']?.number;

    // Get URL from ID field (rich_text containing the Playlab URL)
    const idField = props['ID']?.rich_text || [];
    const url = idField.length > 0 ? idField[0].plain_text : '';
    const projectId = extractProjectId(url);

    const name = (props['App Name']?.title || []).map(t => t.plain_text).join('');

    if (projectId && (sessions !== null || iterations !== null)) {
      // Keep the entry with highest sessions if there are duplicates
      if (!lookup[projectId] || (sessions || 0) > (lookup[projectId].sessions || 0)) {
        lookup[projectId] = { sessions, iterations, name, url };
      }
      withData++;
    }
  }

  console.log(`\nOriginal DB: ${originalRows.length} total rows`);
  console.log(`Rows with session/iteration data: ${withData}`);
  console.log(`Unique project IDs with data: ${Object.keys(lookup).length}`);

  // Show top 10 by sessions
  const sorted = Object.entries(lookup).sort((a, b) => (b[1].sessions || 0) - (a[1].sessions || 0));
  console.log('\nTop 10 apps by sessions:');
  for (const [pid, data] of sorted.slice(0, 10)) {
    console.log(`  ${data.name}: sessions=${data.sessions}, iterations=${data.iterations}`);
  }

  console.log('\n=== Step 2: Fetch master database entries ===');
  console.log(`Database ID: ${MASTER_DB_ID}`);

  const masterRows = await fetchAllRows(MASTER_DB_ID);

  // Find matches and prepare updates
  const updates = [];
  let alreadyPopulated = 0;
  let matched = 0;
  let noMatch = 0;
  let noUrl = 0;

  for (const row of masterRows) {
    const props = row.properties;
    const currentSessions = props['Sessions']?.number;
    const currentIterations = props['Iterations']?.number;
    const url = props['URL']?.url || '';
    const name = (props['App Name']?.title || []).map(t => t.plain_text).join('');
    const projectId = extractProjectId(url);

    if (currentSessions !== null && currentIterations !== null) {
      alreadyPopulated++;
      continue;
    }

    if (!projectId) {
      noUrl++;
      continue;
    }

    if (lookup[projectId]) {
      const source = lookup[projectId];
      updates.push({
        pageId: row.id,
        name,
        projectId,
        sessions: source.sessions,
        iterations: source.iterations,
        sourceName: source.name,
      });
      matched++;
    } else {
      noMatch++;
    }
  }

  console.log(`\nMaster DB: ${masterRows.length} total rows`);
  console.log(`Already populated: ${alreadyPopulated}`);
  console.log(`Matched for update: ${matched}`);
  console.log(`No match found: ${noMatch}`);
  console.log(`No URL: ${noUrl}`);

  console.log('\n=== Step 3: Updating master database ===');

  let updated = 0;
  let errors = 0;

  for (const update of updates) {
    try {
      await notion.pages.update({
        page_id: update.pageId,
        properties: {
          'Sessions': { number: update.sessions },
          'Iterations': { number: update.iterations },
        },
      });
      updated++;
      if (updated % 10 === 0) {
        process.stdout.write(`\r  Updated ${updated}/${updates.length}...`);
      }
    } catch (err) {
      errors++;
      console.error(`\n  Error updating "${update.name}": ${err.message}`);
      // Rate limiting: wait a bit
      if (err.code === 'rate_limited') {
        console.log('  Rate limited, waiting 1 second...');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Already had data: ${alreadyPopulated}`);
  console.log(`No match in original DB: ${noMatch}`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});

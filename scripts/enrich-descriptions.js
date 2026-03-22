#!/usr/bin/env node
/**
 * Enrich short app descriptions in Notion master DB.
 * Uses existing fields (name, usage, impact, creator, role) to generate
 * a more descriptive 1-2 sentence description for apps with < 120 chars.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const MASTER_DB = '32aa9d37-78c5-80e8-9f18-c2771cc02004';

const BATCH_SIZE = 3; // concurrent updates
const DELAY_MS = 350; // rate limit buffer

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getText(prop) {
  if (!prop) return '';
  const arr = prop.rich_text || prop.title || [];
  return arr.map(t => t.plain_text).join('').trim();
}

function generateDescription(app) {
  const { name, usage, impact, creator, role } = app;

  // Try to build from usage first (most descriptive)
  if (usage && usage.length > 40) {
    // Take the first sentence or two from usage, max ~200 chars
    let desc = usage;
    // Get first 1-2 sentences
    const sentences = desc.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      desc = sentences.slice(0, 2).join('').trim();
      if (desc.length > 220) desc = sentences[0].trim();
    }
    if (desc.length > 220) desc = desc.slice(0, 217) + '...';
    return desc;
  }

  // Fall back to impact
  if (impact && impact.length > 40) {
    const sentences = impact.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      let desc = sentences[0].trim();
      if (desc.length > 220) desc = desc.slice(0, 217) + '...';
      return desc;
    }
  }

  // Last resort: expand the short description with context
  const shortDesc = app.description || '';
  if (role && creator) {
    return `${shortDesc || name} — built by ${creator} (${role}) to support educators and students.`;
  }
  if (creator) {
    return `${shortDesc || name} — built by ${creator} to support educators and students.`;
  }

  return shortDesc || name;
}

async function main() {
  console.log('Fetching all apps from master DB...');

  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: MASTER_DB,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`Fetched ${rows.length} apps.`);

  // Find apps with short descriptions
  const toUpdate = [];
  for (const row of rows) {
    const props = row.properties;
    const name = getText(props['App Name']);
    const description = getText(props['Description']);
    const usage = getText(props["How It's Being Used"]);
    const impact = getText(props['Impact']);
    const creator = getText(props['Creator']);
    const role = getText(props['Role']);

    if (description.length < 120) {
      const newDesc = generateDescription({ name, description, usage, impact, creator, role });
      if (newDesc.length > description.length + 10) {
        toUpdate.push({ id: row.id, name, oldDesc: description, newDesc });
      }
    }
  }

  console.log(`\nFound ${toUpdate.length} apps to enrich.\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (app) => {
      try {
        await notion.pages.update({
          page_id: app.id,
          properties: {
            'Description': {
              rich_text: [{ text: { content: app.newDesc.slice(0, 2000) } }]
            }
          }
        });
        updated++;
        console.log(`  [${updated}/${toUpdate.length}] ${app.name}`);
        console.log(`    OLD: ${app.oldDesc.slice(0, 60) || '(empty)'}...`);
        console.log(`    NEW: ${app.newDesc.slice(0, 80)}...`);
      } catch (err) {
        failed++;
        console.error(`  FAIL: ${app.name} — ${err.message}`);
      }
    });
    await Promise.all(promises);
    if (i + BATCH_SIZE < toUpdate.length) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

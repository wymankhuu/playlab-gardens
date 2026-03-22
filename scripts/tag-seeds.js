#!/usr/bin/env node
/**
 * Add tags to seed apps based on their name and description.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SEEDS_DB = '32aa9d3778c58188ab27fe250c849732';

const DELAY_MS = 350;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Tag rules: keyword patterns → tag names
const TAG_RULES = [
  { tag: 'Math', patterns: [/math/i, /algebra/i, /geometry/i, /calculus/i, /fraction/i, /decimal/i, /equation/i] },
  { tag: 'ELA', patterns: [/reading/i, /writing/i, /literacy/i, /vocabulary/i, /grammar/i, /book/i, /text/i, /story/i, /creative writing/i, /novel/i, /essay/i, /comprehension/i] },
  { tag: 'Science', patterns: [/science/i, /biology/i, /chemistry/i, /physics/i, /lab/i, /experiment/i, /stem/i, /coding/i, /code/i] },
  { tag: 'Social Studies', patterns: [/history/i, /social studies/i, /civics/i, /government/i, /geography/i, /debate/i, /citizen/i] },
  { tag: 'SEL', patterns: [/sel\b/i, /emotion/i, /check.?in/i, /wellbeing/i, /wellness/i, /self.?care/i, /conflict/i, /feelings/i, /coping/i] },
  { tag: 'Assessment', patterns: [/assess/i, /quiz/i, /exit ticket/i, /rubric/i, /test/i, /score/i, /data analy/i, /feedback/i, /progress report/i, /grade/i] },
  { tag: 'Writing', patterns: [/writ/i, /draft/i, /essay/i, /story/i, /creative writing/i, /podcast/i, /script/i] },
  { tag: 'Career', patterns: [/career/i, /internship/i, /job/i, /professional/i, /resume/i, /finance/i] },
  { tag: 'Teacher Tools', patterns: [/lesson plan/i, /teacher/i, /sub plan/i, /substitute/i, /bellringer/i, /do now/i, /warm.?up/i, /newsletter/i, /parent email/i, /parent conference/i, /hook gen/i, /iep/i, /onboard/i, /meeting agenda/i, /plc/i, /observation/i, /coaching/i, /standards/i, /unpack/i, /grant/i, /budget/i, /event/i, /policy/i, /school goal/i, /staff/i, /back.?to.?school/i] },
  { tag: 'Study Partner', patterns: [/student/i, /study/i, /homework/i, /practice partner/i, /tutor/i, /companion/i, /helper/i, /explorer/i, /discussion/i, /socratic/i, /project design/i] },
];

function inferTags(name, desc) {
  const text = `${name} ${desc}`;
  const tags = new Set();
  for (const rule of TAG_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        tags.add(rule.tag);
        break;
      }
    }
  }
  return [...tags];
}

async function main() {
  console.log('Fetching seeds...');
  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: SEEDS_DB,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`Fetched ${rows.length} seeds.\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const props = row.properties;
    const name = (props['App Name']?.title || []).map(t => t.plain_text).join('').trim();
    const desc = (props['Description']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const existingTags = (props['Tags']?.multi_select || []).map(t => t.name);

    if (!name) { skipped++; continue; }

    const inferredTags = inferTags(name, desc);
    // Merge with existing tags
    const allTags = [...new Set([...existingTags, ...inferredTags])];

    if (allTags.length === 0 || (allTags.length === existingTags.length && allTags.every(t => existingTags.includes(t)))) {
      if (allTags.length === 0) {
        console.log(`  SKIP (no match): ${name}`);
      }
      skipped++;
      continue;
    }

    try {
      await notion.pages.update({
        page_id: row.id,
        properties: {
          'Tags': {
            multi_select: allTags.map(t => ({ name: t }))
          }
        }
      });
      updated++;
      console.log(`  [${updated}] ${name}`);
      console.log(`    Tags: ${allTags.join(', ')}`);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  FAIL: ${name} — ${err.message}`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

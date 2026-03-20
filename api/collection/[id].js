const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing collection ID' });
  }

  const pageId = formatNotionId(id);

  try {
    // 1. Fetch the collection page itself
    const page = await notion.pages.retrieve({ page_id: pageId });
    const title = extractTitle(page);
    const type = inferType(title);

    // 2. Fetch all child blocks
    const blocks = [];
    let cursor;
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    // 3. Parse blocks into description + apps
    // First paragraph = description, bulleted list items = apps
    let description = '';
    const apps = [];

    for (const block of blocks) {
      const richText = block[block.type]?.rich_text || [];
      if (richText.length === 0) continue;

      if (block.type === 'paragraph' && !description) {
        // First paragraph is the collection description
        description = richText.map(s => s.plain_text).join('');
      }

      if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
        const app = parseAppFromBlock(richText);
        if (app) apps.push(app);
      }
    }

    res.status(200).json({
      id,
      name: title,
      description,
      type,
      iconColor: getCollectionColor(type),
      iconEmoji: getPageEmoji(page),
      appCount: apps.length,
      apps,
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

/**
 * Parse an app entry from a bulleted list item's rich text.
 * Format: [App Name](playlab.ai/project/ID) — Description (X sessions, Y iterations)
 */
function parseAppFromBlock(richText) {
  let name = '';
  let url = '';
  let descPart = '';
  let appId = '';

  for (const segment of richText) {
    if (segment.href && segment.href.includes('playlab.ai')) {
      name = segment.plain_text.trim();
      url = segment.href;
      // Extract ID from URL: playlab.ai/project/XXXXX
      const match = segment.href.match(/\/project\/([a-zA-Z0-9]+)/);
      if (match) appId = match[1];
    } else {
      descPart += segment.plain_text;
    }
  }

  if (!name) {
    // No hyperlink — try to use plain text as name
    const fullText = richText.map(s => s.plain_text).join('');
    if (!fullText.trim()) return null;
    name = fullText.split('—')[0].trim();
    descPart = fullText.includes('—') ? fullText.split('—').slice(1).join('—') : '';
  }

  // Parse description and stats from the desc part
  // Format: " — Description text (X sessions, Y iterations)"
  let description = '';
  let sessions = 0;
  let iterations = 0;

  if (descPart) {
    // Remove leading " — "
    let cleaned = descPart.replace(/^\s*—\s*/, '').trim();

    // Extract stats from parenthetical at the end
    const statsMatch = cleaned.match(/\(([^)]+)\)\s*$/);
    if (statsMatch) {
      const statsStr = statsMatch[1];
      const sessMatch = statsStr.match(/([\d,]+)\s*sessions?/i);
      const iterMatch = statsStr.match(/([\d,]+)\s*iterations?/i);
      if (sessMatch) sessions = parseInt(sessMatch[1].replace(/,/g, ''), 10);
      if (iterMatch) iterations = parseInt(iterMatch[1].replace(/,/g, ''), 10);
      cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/, '').trim();
    }
    description = cleaned;
  }

  return {
    id: appId || generateId(name),
    name,
    creator: '',
    description,
    sessions,
    iterations,
    url: url || (appId ? `https://playlab.ai/project/${appId}` : ''),
  };
}

function generateId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatNotionId(id) {
  const clean = id.replace(/-/g, '');
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}

function extractTitle(page) {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title' && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function getPageEmoji(page) {
  if (page.icon?.type === 'emoji') return page.icon.emoji;
  return null;
}

function inferType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('showcase') || lower.includes('district') || lower.includes('ciob') || lower.includes('kipp') || lower.includes('leading educators') || lower.includes('amplify')) {
    return 'org';
  }
  return 'topic';
}

function getCollectionColor(type) {
  return type === 'org' ? '#3656EA' : '#00983F';
}

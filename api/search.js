const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, cursor } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'App Name',
        title: {
          contains: q.trim(),
        },
      },
      sorts: [{ property: 'Sessions', direction: 'descending' }],
      page_size: 20,
      start_cursor: cursor || undefined,
    });

    const results = response.results.map((page) => {
      const name = extractTitle(page);
      const creator = extractProperty(page.properties, 'Creator') || '';
      const description = extractProperty(page.properties, 'Context') || '';
      const sessions = extractNumber(page.properties, 'Sessions') || 0;
      const iterations = extractNumber(page.properties, 'Iterations') || 0;
      const rawId = extractProperty(page.properties, 'ID') || '';
      // ID field may be a full URL like "https://www.playlab.ai/project/xxx"
      const idMatch = rawId.match(/\/project\/([a-zA-Z0-9]+)/);
      const appId = idMatch ? idMatch[1] : page.id.replace(/-/g, '');
      const url = rawId.startsWith('http') ? rawId : `https://playlab.ai/project/${appId}`;

      return {
        id: appId,
        name,
        creator,
        description,
        sessions,
        iterations,
        url,
      };
    });

    // Deduplicate by app ID
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    res.status(200).json({
      results: unique,
      hasMore: response.has_more,
      cursor: response.next_cursor,
    });
  } catch (error) {
    console.error('Error searching apps:', error);
    res.status(500).json({ error: 'Failed to search apps' });
  }
};

function extractTitle(page) {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title' && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function extractProperty(properties, name) {
  const prop = properties[name];
  if (!prop) return '';
  if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text.map(t => t.plain_text).join('');
  }
  if (prop.type === 'select' && prop.select) {
    return prop.select.name;
  }
  return '';
}

function extractNumber(properties, name) {
  const prop = properties[name];
  if (!prop) return null;
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'rollup' && prop.rollup?.type === 'number') return prop.rollup.number;
  return null;
}

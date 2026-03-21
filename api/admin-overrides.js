const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const OVERRIDES_DB_ID = process.env.NOTION_OVERRIDES_DB_ID;

/**
 * GET /api/admin-overrides
 * Returns all app overrides from the Notion overrides database.
 * Response: { overrides: { [appId]: { creator, role, description, usage, resources } } }
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OVERRIDES_DB_ID) {
    return res.status(200).json({ overrides: {} });
  }

  try {
    const overrides = {};
    let cursor;

    do {
      const response = await notion.databases.query({
        database_id: OVERRIDES_DB_ID,
        start_cursor: cursor || undefined,
        page_size: 100,
      });

      for (const page of response.results) {
        const appId = getRichText(page.properties, 'App ID');
        if (!appId) continue;

        overrides[appId] = {
          creator: getRichText(page.properties, 'Creator') || '',
          role: getRichText(page.properties, 'Role') || '',
          description: getRichText(page.properties, 'Description') || '',
          usage: getRichText(page.properties, 'Usage') || '',
          resources: getRichText(page.properties, 'Resources') || '',
          notionPageId: page.id,
        };
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    res.status(200).json({ overrides });
  } catch (error) {
    console.error('Error fetching overrides:', error);
    res.status(500).json({ error: 'Failed to fetch overrides' });
  }
};

function getRichText(properties, name) {
  const prop = properties[name];
  if (!prop) return '';
  if (prop.type === 'title' && prop.title.length > 0) {
    return prop.title.map(t => t.plain_text).join('');
  }
  if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text.map(t => t.plain_text).join('');
  }
  return '';
}

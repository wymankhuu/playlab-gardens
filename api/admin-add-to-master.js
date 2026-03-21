const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const MASTER_DB_ID = process.env.NOTION_MASTER_DB_ID || '32aa9d3778c580e89f18c2771cc02004';
const ORIGINAL_DB_ID = process.env.NOTION_ORIGINAL_DB_ID || '328a9d3778c58051afe3eb3594e663f6';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * POST /api/admin-add-to-master
 * Search the original 5,400-entry database and add an app to the master database.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // Search the original database
    const { password, q } = req.query;
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    try {
      const response = await notion.databases.query({
        database_id: ORIGINAL_DB_ID,
        filter: {
          property: 'App Name',
          title: { contains: q.trim() },
        },
        page_size: 20,
      });

      const results = response.results.map(row => {
        const props = row.properties;
        const name = (props['App Name']?.title || []).map(t => t.plain_text).join('').trim();
        const url = (props['ID']?.rich_text || []).map(t => t.plain_text).join('').trim();
        const creator = (props['Creator']?.rich_text || []).map(t => t.plain_text).join('').trim();
        const sessions = props['Sessions']?.number || 0;
        const iterations = props['Iterations']?.number || 0;
        return { id: row.id, name, url, creator, sessions, iterations };
      }).filter(r => r.name);

      return res.status(200).json({ results });
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, appName, url, creator, role, description, usage, impact, sessions, iterations, collections } = req.body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!appName) {
    return res.status(400).json({ error: 'Missing app name' });
  }

  try {
    // Check if app already exists in master DB by name
    const existing = await notion.databases.query({
      database_id: MASTER_DB_ID,
      filter: {
        property: 'App Name',
        title: { equals: appName },
      },
      page_size: 1,
    });

    if (existing.results.length > 0) {
      return res.status(409).json({ error: 'App already exists in master database' });
    }

    // Build properties
    const properties = {
      'App Name': { title: [{ text: { content: appName.slice(0, 2000) } }] },
    };

    if (url) properties['URL'] = { url };
    if (creator) properties['Creator'] = { rich_text: [{ text: { content: creator.slice(0, 2000) } }] };
    if (role) properties['Role'] = { rich_text: [{ text: { content: role.slice(0, 2000) } }] };
    if (description) properties['Description'] = { rich_text: [{ text: { content: description.slice(0, 2000) } }] };
    if (usage) properties['How It\'s Being Used'] = { rich_text: [{ text: { content: usage.slice(0, 2000) } }] };
    if (impact) properties['Impact'] = { rich_text: [{ text: { content: impact.slice(0, 2000) } }] };
    if (sessions) properties['Sessions'] = { number: sessions };
    if (iterations) properties['Iterations'] = { number: iterations };
    if (collections && collections.length > 0) {
      properties['Collection'] = { multi_select: collections.map(name => ({ name })) };
    }

    const page = await notion.pages.create({
      parent: { database_id: MASTER_DB_ID },
      properties,
    });

    res.status(200).json({ success: true, pageId: page.id });
  } catch (error) {
    console.error('Error adding app:', error);
    res.status(500).json({ error: 'Failed to add app' });
  }
};

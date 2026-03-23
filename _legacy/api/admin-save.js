const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID;
if (!DATABASE_ID) throw new Error('NOTION_MASTER_DB_ID is required');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * POST /api/admin-save
 * Update an app's fields directly in the Showcase Apps Master database.
 * Finds the app by name and updates its properties.
 */
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = origin.includes('playlabgardens.com') || origin.includes('localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://playlabgardens.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, appName, creator, role, description, usage, impact } = req.body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!appName) {
    return res.status(400).json({ error: 'Missing app name' });
  }

  try {
    // Find the app in the master database by name
    const results = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'App Name',
        title: { equals: appName },
      },
      page_size: 1,
    });

    if (results.results.length === 0) {
      return res.status(404).json({ error: 'App not found in database' });
    }

    const pageId = results.results[0].id;
    const properties = {};

    if (creator !== undefined) {
      properties['Creator'] = { rich_text: [{ text: { content: (creator || '').slice(0, 2000) } }] };
    }
    if (role !== undefined) {
      properties['Role'] = { rich_text: [{ text: { content: (role || '').slice(0, 2000) } }] };
    }
    if (description !== undefined) {
      properties['Description'] = { rich_text: [{ text: { content: (description || '').slice(0, 2000) } }] };
    }
    if (usage !== undefined) {
      properties['How It\'s Being Used'] = { rich_text: [{ text: { content: (usage || '').slice(0, 2000) } }] };
    }
    if (impact !== undefined) {
      properties['Impact'] = { rich_text: [{ text: { content: (impact || '').slice(0, 2000) } }] };
    }

    await notion.pages.update({ page_id: pageId, properties });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving app:', JSON.stringify({
      message: error.message,
      code: error.code,
      appName: appName?.trim(),
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({ error: 'Failed to save changes' });
  }
};

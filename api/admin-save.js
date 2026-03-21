const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const OVERRIDES_DB_ID = process.env.NOTION_OVERRIDES_DB_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * POST /api/admin-save
 * Create or update an app override in the Notion overrides database.
 * Body: { password, appId, appName, creator, role, description, usage, resources, notionPageId? }
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OVERRIDES_DB_ID) {
    return res.status(500).json({ error: 'Overrides database not configured' });
  }

  const { password, appId, appName, creator, role, description, usage, resources, notionPageId } = req.body;

  // Authenticate
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!appId) {
    return res.status(400).json({ error: 'Missing appId' });
  }

  try {
    const properties = {
      'App ID': { title: [{ text: { content: appId } }] },
      'App Name': { rich_text: [{ text: { content: appName || '' } }] },
      'Creator': { rich_text: [{ text: { content: creator || '' } }] },
      'Role': { rich_text: [{ text: { content: role || '' } }] },
      'Description': { rich_text: [{ text: { content: (description || '').slice(0, 2000) } }] },
      'Usage': { rich_text: [{ text: { content: (usage || '').slice(0, 2000) } }] },
      'Resources': { rich_text: [{ text: { content: (resources || '').slice(0, 2000) } }] },
    };

    if (notionPageId) {
      // Update existing override
      await notion.pages.update({
        page_id: notionPageId,
        properties,
      });
    } else {
      // Check if an override already exists for this appId
      const existing = await notion.databases.query({
        database_id: OVERRIDES_DB_ID,
        filter: {
          property: 'App ID',
          title: { equals: appId },
        },
        page_size: 1,
      });

      if (existing.results.length > 0) {
        // Update existing
        await notion.pages.update({
          page_id: existing.results[0].id,
          properties,
        });
      } else {
        // Create new
        await notion.pages.create({
          parent: { database_id: OVERRIDES_DB_ID },
          properties,
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving override:', error);
    res.status(500).json({ error: 'Failed to save override' });
  }
};

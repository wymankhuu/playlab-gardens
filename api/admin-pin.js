const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID;
if (!DATABASE_ID) throw new Error('NOTION_MASTER_DB_ID is required');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MAX_PINNED = 9;

/**
 * POST /api/admin-pin
 * Toggle the Homepage checkbox for an app in the Showcase Apps Master database.
 * Enforces a cap of 9 pinned apps per collection.
 */
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = origin.includes('playlabgardens.com') || origin.includes('localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://playlabgardens.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, appName, pinned, collectionName } = req.body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!appName) {
    return res.status(400).json({ error: 'Missing app name' });
  }

  try {
    // If pinning, enforce cap of 9 per collection
    if (pinned && collectionName) {
      const countResults = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          and: [
            { property: 'Homepage', checkbox: { equals: true } },
            { property: 'Collection', multi_select: { contains: collectionName } },
          ],
        },
      });

      if (countResults.results.length >= MAX_PINNED) {
        return res.status(400).json({
          error: 'This collection already has ' + MAX_PINNED + ' pinned apps. Unpin one first.',
        });
      }
    }

    // Find the app by name
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

    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Homepage': { checkbox: !!pinned },
      },
    });

    res.status(200).json({ success: true, pinned: !!pinned });
  } catch (error) {
    console.error('Error pinning app:', JSON.stringify({
      message: error.message,
      code: error.code,
      appName: appName,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({ error: 'Failed to update pin status' });
  }
};

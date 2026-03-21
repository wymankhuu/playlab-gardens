const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID || '32aa9d3778c580e89f18c2771cc02004';

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

  const { appName, url, creator, role, description, usage, impact, publicConsent } = req.body;

  // Validate required fields
  if (!appName || !appName.trim()) {
    return res.status(400).json({ error: 'App Name is required' });
  }
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'App URL is required' });
  }
  if (!creator || !creator.trim()) {
    return res.status(400).json({ error: 'Creator name is required' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const properties = {
      'App Name': {
        title: [{ text: { content: appName.trim() } }],
      },
      'URL': {
        url: url.trim(),
      },
      'Creator': {
        rich_text: [{ text: { content: creator.trim() } }],
      },
      'Description': {
        rich_text: [{ text: { content: description.trim() } }],
      },
    };

    if (role && role.trim()) {
      properties['Role'] = {
        rich_text: [{ text: { content: role.trim() } }],
      };
    }

    if (usage && usage.trim()) {
      properties['How It\'s Being Used'] = {
        rich_text: [{ text: { content: usage.trim() } }],
      };
    }

    if (impact && impact.trim()) {
      properties['Impact'] = {
        rich_text: [{ text: { content: impact.trim() } }],
      };
    }

    await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting app:', error);
    res.status(500).json({ error: 'Failed to submit app. Please try again.' });
  }
};

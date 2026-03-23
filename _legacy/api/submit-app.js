const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID;
if (!DATABASE_ID) throw new Error('NOTION_MASTER_DB_ID is required');

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
  if (!/^https?:\/\/(www\.)?playlab\.ai\/project\/.+$/.test(url.trim())) {
    return res.status(400).json({ error: 'URL must be a valid Playlab project link (playlab.ai/project/...)' });
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

    // Send Slack notification (fire and forget)
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🌱 New app submitted to Playlab Gardens!`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*🌱 New App Submission*\n*${appName.trim()}* by ${creator.trim()}${role ? ` (${role.trim()})` : ''}\n${description.trim()}\n<${url.trim()}|Open in Playlab>`
                }
              }
            ]
          }),
        });
      } catch (slackErr) {
        console.warn('Slack notification failed:', slackErr.message);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting app:', JSON.stringify({
      message: error.message,
      code: error.code,
      status: error.status,
      appName: appName?.trim(),
      timestamp: new Date().toISOString(),
    }));

    // Send error alert to Slack
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ Playlab Gardens submission error: ${error.message} (app: ${appName?.trim() || 'unknown'})`,
          }),
        });
      } catch (_) {}
    }

    res.status(500).json({ error: 'Failed to submit app. Please try again.' });
  }
};

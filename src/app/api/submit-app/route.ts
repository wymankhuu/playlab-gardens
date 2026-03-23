import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { appName, url, creator, role, description, usage, impact } = body;

  // Validate required fields
  if (!appName || !appName.trim()) {
    return NextResponse.json({ error: 'App Name is required' }, { status: 400, headers: corsHeaders });
  }
  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'App URL is required' }, { status: 400, headers: corsHeaders });
  }
  if (!/^https?:\/\/(www\.)?playlab\.ai\/project\/.+$/.test(url.trim())) {
    return NextResponse.json(
      { error: 'URL must be a valid Playlab project link (playlab.ai/project/...)' },
      { status: 400, headers: corsHeaders },
    );
  }
  if (!creator || !creator.trim()) {
    return NextResponse.json({ error: 'Creator name is required' }, { status: 400, headers: corsHeaders });
  }
  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400, headers: corsHeaders });
  }

  try {
    const properties: Record<string, unknown> = {
      'App Name': {
        title: [{ text: { content: appName.trim() } }],
      },
      URL: {
        url: url.trim(),
      },
      Creator: {
        rich_text: [{ text: { content: creator.trim() } }],
      },
      Description: {
        rich_text: [{ text: { content: description.trim() } }],
      },
    };

    if (role && role.trim()) {
      properties['Role'] = {
        rich_text: [{ text: { content: role.trim() } }],
      };
    }
    if (usage && usage.trim()) {
      properties["How It's Being Used"] = {
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
      properties: properties as any,
    });

    // Fire-and-forget Slack notification
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New app submitted to Playlab Gardens!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*New App Submission*\n*${appName.trim()}* by ${creator.trim()}${role ? ` (${role.trim()})` : ''}\n${description.trim()}\n<${url.trim()}|Open in Playlab>`,
              },
            },
          ],
        }),
      }).catch(err => console.warn('Slack notification failed:', err.message));
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; status?: number };
    console.error('Error submitting app:', JSON.stringify({
      message: err.message,
      code: err.code,
      status: err.status,
      appName: appName?.trim(),
      timestamp: new Date().toISOString(),
    }));

    // Send error alert to Slack
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Playlab Gardens submission error: ${err.message} (app: ${appName?.trim() || 'unknown'})`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: 'Failed to submit app. Please try again.' },
      { status: 500, headers: corsHeaders },
    );
  }
}

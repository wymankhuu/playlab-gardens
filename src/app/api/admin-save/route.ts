import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function getAdminCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowed = origin.includes('playlabgardens.com') || origin.includes('localhost');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://playlabgardens.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getAdminCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = getAdminCorsHeaders(request);

  const body = await request.json();
  const { password, appName, creator, role, description, usage, impact } = body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!appName) {
    return NextResponse.json({ error: 'Missing app name' }, { status: 400, headers });
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
      return NextResponse.json({ error: 'App not found in database' }, { status: 404, headers });
    }

    const pageId = results.results[0].id;
    const properties: Record<string, unknown> = {};

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
      properties["How It's Being Used"] = { rich_text: [{ text: { content: (usage || '').slice(0, 2000) } }] };
    }
    if (impact !== undefined) {
      properties['Impact'] = { rich_text: [{ text: { content: (impact || '').slice(0, 2000) } }] };
    }

    await notion.pages.update({ page_id: pageId, properties: properties as any });

    revalidatePath('/');

    return NextResponse.json({ success: true }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Error saving app:', JSON.stringify({
      message: err.message,
      code: err.code,
      appName: appName?.trim(),
      timestamp: new Date().toISOString(),
    }));
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500, headers });
  }
}

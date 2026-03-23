import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { revalidatePath } from 'next/cache';

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
  const { password, appOrder } = body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!appOrder || !Array.isArray(appOrder) || appOrder.length === 0) {
    return NextResponse.json({ error: 'Missing or empty appOrder array' }, { status: 400, headers });
  }

  try {
    // Update each app's Homepage Order and ensure Homepage is checked
    const updates = appOrder.map(async (item: { appName: string; order: number }) => {
      // Find the app by name
      const results = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          property: 'App Name',
          title: { equals: item.appName },
        },
        page_size: 1,
      });

      if (results.results.length === 0) {
        console.warn(`App not found for reorder: ${item.appName}`);
        return;
      }

      const pageId = results.results[0].id;

      await notion.pages.update({
        page_id: pageId,
        properties: {
          'Homepage': { checkbox: true },
          'Homepage Order': { number: item.order },
        },
      });
    });

    await Promise.all(updates);

    // Revalidate home page cache
    revalidatePath('/');

    return NextResponse.json({ success: true, updated: appOrder.length }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Error reordering apps:', JSON.stringify({
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
    }));
    return NextResponse.json({ error: 'Failed to update app order' }, { status: 500, headers });
  }
}

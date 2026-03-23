import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MAX_PINNED = 9;

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
  const { password, appName, pinned, collectionName } = body;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!appName) {
    return NextResponse.json({ error: 'Missing app name' }, { status: 400, headers });
  }

  try {
    // If pinning, enforce cap of MAX_PINNED per collection
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
        return NextResponse.json(
          { error: `This collection already has ${MAX_PINNED} pinned apps. Unpin one first.` },
          { status: 400, headers },
        );
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
      return NextResponse.json({ error: 'App not found in database' }, { status: 404, headers });
    }

    const pageId = results.results[0].id;

    await notion.pages.update({
      page_id: pageId,
      properties: {
        Homepage: { checkbox: !!pinned },
      },
    });

    revalidatePath('/');

    return NextResponse.json({ success: true, pinned: !!pinned }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Error pinning app:', JSON.stringify({
      message: err.message,
      code: err.code,
      appName,
      timestamp: new Date().toISOString(),
    }));
    return NextResponse.json({ error: 'Failed to update pin status' }, { status: 500, headers });
  }
}

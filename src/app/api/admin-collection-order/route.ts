import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  sequentialUpdate,
} from '@/lib/notion';

export async function OPTIONS(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const body = await request.json();
  const { password, collection, appOrder } = body;

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!appOrder || !Array.isArray(appOrder) || appOrder.length === 0) {
    return NextResponse.json({ error: 'Missing or empty appOrder array' }, { status: 400, headers });
  }

  try {
    console.log(`Updating collection order for "${collection || 'unknown'}": ${appOrder.length} apps`);

    const items = appOrder.map((entry: { notionId: string; order: number }) => ({
      notionId: entry.notionId,
      properties: {
        'Collection Order': { number: entry.order },
      },
    }));

    await sequentialUpdate(items);

    revalidatePath('/');

    return NextResponse.json({ success: true, updated: appOrder.length }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error saving collection order:', err.message);
    return NextResponse.json({ error: 'Failed to save collection order' }, { status: 500, headers });
  }
}

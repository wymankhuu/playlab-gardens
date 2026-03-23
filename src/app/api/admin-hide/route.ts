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
  const { password, apps } = body;

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!apps || !Array.isArray(apps) || apps.length === 0) {
    return NextResponse.json({ error: 'Missing or empty apps array' }, { status: 400, headers });
  }

  try {
    const items = apps.map((app: { notionId: string; hidden: boolean }) => ({
      notionId: app.notionId,
      properties: {
        'Homepage Hidden': { checkbox: !!app.hidden },
      },
    }));

    await sequentialUpdate(items);

    revalidatePath('/');

    return NextResponse.json({ success: true, updated: apps.length }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error toggling hidden:', err.message);
    return NextResponse.json({ error: 'Failed to update hidden status' }, { status: 500, headers });
  }
}

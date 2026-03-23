import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  findAppByNotionId,
  updateNotionPage,
  getNotionClient,
  getMasterDbId,
} from '@/lib/notion';

export async function OPTIONS(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers });
}

export async function GET(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const password = request.nextUrl.searchParams.get('password') || '';

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  try {
    const notion = getNotionClient();
    const db = await notion.databases.retrieve({ database_id: getMasterDbId() });
    const collectionProp = (db as any).properties['Collection'];
    const options = collectionProp?.multi_select?.options || [];
    const tags = options.map((o: any) => ({ name: o.name, color: o.color }));

    return NextResponse.json({ tags }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error fetching tags:', err.message);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const body = await request.json();
  const { password, notionId, action, tag } = body;

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!notionId || !action || !tag) {
    return NextResponse.json({ error: 'Missing required fields: notionId, action, tag' }, { status: 400, headers });
  }

  if (action !== 'add' && action !== 'remove') {
    return NextResponse.json({ error: 'Action must be "add" or "remove"' }, { status: 400, headers });
  }

  try {
    const page = await findAppByNotionId(notionId) as any;
    const currentTags: { name: string }[] = page.properties['Collection']?.multi_select || [];

    let updatedTags: { name: string }[];

    if (action === 'add') {
      const alreadyExists = currentTags.some(
        (t: any) => t.name.toLowerCase() === tag.toLowerCase()
      );
      if (alreadyExists) {
        return NextResponse.json({ error: 'Tag already exists on this app' }, { status: 400, headers });
      }
      updatedTags = [...currentTags.map((t: any) => ({ name: t.name })), { name: tag }];
    } else {
      updatedTags = currentTags
        .filter((t: any) => t.name.toLowerCase() !== tag.toLowerCase())
        .map((t: any) => ({ name: t.name }));
    }

    await updateNotionPage(notionId, {
      Collection: { multi_select: updatedTags },
    });

    revalidatePath('/');

    return NextResponse.json({ success: true }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error updating tags:', err.message);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500, headers });
  }
}

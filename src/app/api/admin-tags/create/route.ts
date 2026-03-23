import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  getNotionClient,
  getMasterDbId,
} from '@/lib/notion';

export async function OPTIONS(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const body = await request.json();
  const { password, tagName } = body;

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!tagName || !tagName.trim()) {
    return NextResponse.json({ error: 'Missing tagName' }, { status: 400, headers });
  }

  try {
    const notion = getNotionClient();
    const dbId = getMasterDbId();

    // Retrieve current options to check for duplicates
    const db = await notion.databases.retrieve({ database_id: dbId });
    const collectionProp = (db as any).properties['Collection'];
    const existingOptions: any[] = collectionProp?.multi_select?.options || [];

    const duplicate = existingOptions.some(
      (o: any) => o.name.toLowerCase() === tagName.trim().toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400, headers });
    }

    // Add the new option to the database schema
    const mappedOptions = existingOptions.map((o: any) => ({ name: o.name }));
    await notion.databases.update({
      database_id: dbId,
      properties: {
        Collection: {
          multi_select: {
            options: [...mappedOptions, { name: tagName.trim() }],
          },
        },
      },
    });

    revalidatePath('/');

    return NextResponse.json({ success: true }, { headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error creating tag:', err.message);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500, headers });
  }
}

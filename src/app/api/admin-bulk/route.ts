import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  findAppByNotionId,
  updateNotionPage,
} from '@/lib/notion';

export async function OPTIONS(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const body = await request.json();
  const { password, notionIds, action, tag } = body;

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  if (!notionIds || !Array.isArray(notionIds) || notionIds.length === 0) {
    return NextResponse.json({ error: 'Missing or empty notionIds array' }, { status: 400, headers });
  }

  const validActions = ['addTag', 'removeTag', 'hide', 'show'];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: `Action must be one of: ${validActions.join(', ')}` }, { status: 400, headers });
  }

  if ((action === 'addTag' || action === 'removeTag') && !tag) {
    return NextResponse.json({ error: 'Tag is required for addTag/removeTag actions' }, { status: 400, headers });
  }

  const errors: { notionId: string; error: string }[] = [];
  let successCount = 0;

  for (const notionId of notionIds) {
    try {
      if (action === 'addTag' || action === 'removeTag') {
        const page = await findAppByNotionId(notionId) as any;
        const currentTags: { name: string }[] = page.properties['Collection']?.multi_select || [];

        let updatedTags: { name: string }[];
        if (action === 'addTag') {
          const alreadyExists = currentTags.some(
            (t: any) => t.name.toLowerCase() === tag.toLowerCase()
          );
          if (alreadyExists) {
            successCount++;
            continue; // Skip but count as success — idempotent
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
      } else if (action === 'hide') {
        await updateNotionPage(notionId, {
          'Homepage Hidden': { checkbox: true },
        });
      } else if (action === 'show') {
        await updateNotionPage(notionId, {
          'Homepage Hidden': { checkbox: false },
        });
      }

      successCount++;

      // 200ms delay between API calls
      if (notionIds.indexOf(notionId) < notionIds.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`Bulk action error for ${notionId}:`, err.message);
      errors.push({ notionId, error: err.message || 'Unknown error' });
    }
  }

  revalidatePath('/');

  return NextResponse.json(
    { success: true, updated: successCount, errors },
    { headers }
  );
}

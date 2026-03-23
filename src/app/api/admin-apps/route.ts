import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  getCollections,
  App,
} from '@/lib/notion';

export async function OPTIONS(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers });
}

export async function GET(request: NextRequest) {
  const headers = getAdminCorsHeaders(request.headers.get('origin'));
  const params = request.nextUrl.searchParams;
  const password = params.get('password') || '';

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers });
  }

  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || '50', 10);
  const search = (params.get('search') || '').toLowerCase();
  const collectionFilter = params.get('collection') || '';
  const statusFilter = params.get('status') || '';

  try {
    const collections = await getCollections();

    // Flatten and deduplicate apps, collecting all tags per app
    const appMap = new Map<string, App & { tags: string[] }>();

    for (const col of collections) {
      for (const app of col.apps) {
        const key = app.notionId || app.id;
        const existing = appMap.get(key);
        if (existing) {
          // Merge tags
          if (!existing.tags.includes(col.name)) {
            existing.tags.push(col.name);
          }
        } else {
          appMap.set(key, {
            ...app,
            tags: [col.name],
          });
        }
      }
    }

    let apps = Array.from(appMap.values());

    // Compute missing fields per app
    const appsWithMissing = apps.map((app) => {
      const missing: string[] = [];
      if (!app.description) missing.push('description');
      if (!app.usage) missing.push('usage');
      if (!app.impact) missing.push('impact');
      if (!app.creator) missing.push('creator');
      return { ...app, missing };
    });

    // Apply search filter
    let filtered = appsWithMissing;
    if (search) {
      filtered = filtered.filter((app) => {
        return (
          app.name.toLowerCase().includes(search) ||
          app.creator.toLowerCase().includes(search) ||
          app.description.toLowerCase().includes(search) ||
          app.tags.some((t) => t.toLowerCase().includes(search))
        );
      });
    }

    // Apply collection filter
    if (collectionFilter) {
      filtered = filtered.filter((app) =>
        app.tags.some((t) => t.toLowerCase() === collectionFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter === 'missing') {
      filtered = filtered.filter((app) => app.missing.length > 0);
    } else if (statusFilter === 'hidden') {
      filtered = filtered.filter((app) => app.homepageHidden);
    }

    // Sort by sessions descending
    filtered.sort((a, b) => b.sessions - a.sessions);

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return NextResponse.json(
      {
        apps: paged,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
      { headers }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error fetching admin apps:', err.message);
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500, headers });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/notion';
import type { App, Collection } from '@/lib/notion';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

interface MissingApp {
  name: string;
  id: string;
  sessions: number;
  creator: string;
  url: string;
  missing: string[];
  collections: string[];
}

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get('password');

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    const collections: Collection[] = await getCollections();

    // Build a map of app ID -> MissingApp, deduplicating across collections
    const appMap = new Map<string, MissingApp>();

    for (const col of collections) {
      for (const app of col.apps) {
        const missing: string[] = [];
        if (!app.description || !app.description.trim()) missing.push('description');
        if (!app.usage || !app.usage.trim()) missing.push('usage');
        if (!app.impact || !app.impact.trim()) missing.push('impact');
        if (!app.creator || !app.creator.trim()) missing.push('creator');

        if (missing.length === 0) continue;

        const existing = appMap.get(app.id);
        if (existing) {
          // Add this collection name if not already present
          if (!existing.collections.includes(col.name)) {
            existing.collections.push(col.name);
          }
        } else {
          appMap.set(app.id, {
            name: app.name,
            id: app.id,
            sessions: app.sessions || 0,
            creator: app.creator || '',
            url: app.url || '',
            missing,
            collections: [col.name],
          });
        }
      }
    }

    // Compute total apps (deduplicated)
    const allAppIds = new Set<string>();
    for (const col of collections) {
      for (const app of col.apps) {
        allAppIds.add(app.id);
      }
    }

    const apps = Array.from(appMap.values()).sort((a, b) => b.sessions - a.sessions);

    return NextResponse.json({
      apps,
      totalApps: allAppIds.size,
      missingCount: apps.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error fetching missing fields:', err.message);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

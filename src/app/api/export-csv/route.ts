import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/notion';
import type { App } from '@/lib/notion';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function escapeCsvField(value: string): string {
  if (!value) return '';
  // If the field contains commas, quotes, or newlines, wrap in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get('password');

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const collections = await getCollections();

  // Deduplicate apps by ID, collecting all collection names per app
  const appMap = new Map<
    string,
    App & { collections: string[] }
  >();

  for (const col of collections) {
    for (const app of col.apps) {
      if (appMap.has(app.id)) {
        const existing = appMap.get(app.id)!;
        if (!existing.collections.includes(col.name)) {
          existing.collections.push(col.name);
        }
      } else {
        appMap.set(app.id, {
          ...app,
          collections: [col.name],
        });
      }
    }
  }

  const headers = [
    'App Name',
    'URL',
    'Creator',
    'Role',
    'Description',
    'How It\'s Being Used',
    'Impact',
    'Sessions',
    'Iterations',
    'Collections',
  ];

  const rows = Array.from(appMap.values()).map((app) => [
    escapeCsvField(app.name),
    escapeCsvField(app.url),
    escapeCsvField(app.creator),
    escapeCsvField(app.role),
    escapeCsvField(app.description),
    escapeCsvField(app.usage),
    escapeCsvField(app.impact),
    String(app.sessions || 0),
    String(app.iterations || 0),
    escapeCsvField(app.collections.join(', ')),
  ]);

  const csv = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="playlab-gardens-export.csv"',
    },
  });
}

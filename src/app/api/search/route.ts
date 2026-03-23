import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/notion';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ results: [] }, { headers: corsHeaders });
  }

  try {
    const collections = await getCollections();

    // Flatten and deduplicate apps across all collections
    const appMap = new Map<string, (typeof collections)[number]['apps'][number]>();
    for (const col of collections) {
      for (const app of col.apps) {
        if (!appMap.has(app.id)) {
          appMap.set(app.id, app);
        }
      }
    }

    const results = [...appMap.values()]
      .filter(app => app.name.toLowerCase().includes(q))
      .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
      .slice(0, 50);

    return NextResponse.json({ results }, { headers: corsHeaders });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

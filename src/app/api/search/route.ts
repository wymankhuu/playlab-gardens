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

    // Score each app by match quality
    const scored = [...appMap.values()]
      .map((app) => {
        let score = 0;

        // Name match = 3 points
        if (app.name.toLowerCase().includes(q)) {
          score += 3;
        }

        // Creator match = 2 points
        if (app.creator && app.creator.toLowerCase().includes(q)) {
          score += 2;
        }

        // Tag match = 2 points
        if (app.tags && app.tags.some((tag) => tag.toLowerCase().includes(q))) {
          score += 2;
        }

        // Description match = 1 point
        if (app.description && app.description.toLowerCase().includes(q)) {
          score += 1;
        }

        return { app, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        // Sort by score descending, then by sessions descending for ties
        if (b.score !== a.score) return b.score - a.score;
        return (b.app.sessions || 0) - (a.app.sessions || 0);
      })
      .slice(0, 50)
      .map(({ app }) => app);

    return NextResponse.json({ results: scored }, { headers: corsHeaders });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

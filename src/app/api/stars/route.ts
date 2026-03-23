import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get('ids');
    if (!ids) {
      return NextResponse.json({}, { headers: corsHeaders });
    }

    const appIds = ids.split(',').slice(0, 100);
    const pipeline = redis.pipeline();
    for (const id of appIds) {
      pipeline.get(`stars:${id}`);
    }
    const results = await pipeline.exec();

    const counts: Record<string, number> = {};
    appIds.forEach((id, i) => {
      counts[id] = parseInt(results[i] as string) || 0;
    });

    return NextResponse.json(counts, { headers: corsHeaders });
  } catch (err) {
    console.error('Stars error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, action } = body || {};

    if (!appId || typeof appId !== 'string') {
      return NextResponse.json(
        { error: 'appId required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const key = `stars:${appId}`;
    let count: number;

    if (action === 'unstar') {
      count = await redis.decr(key);
      if (count < 0) {
        await redis.set(key, 0);
        count = 0;
      }
    } else {
      count = await redis.incr(key);
    }

    return NextResponse.json({ appId, count }, { headers: corsHeaders });
  } catch (err) {
    console.error('Star error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

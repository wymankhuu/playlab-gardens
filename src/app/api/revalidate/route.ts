import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { error: 'Invalid secret' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    revalidatePath('/');
    revalidatePath('/collection/[id]', 'page');

    return NextResponse.json({ revalidated: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500, headers: corsHeaders },
    );
  }
}

import { NextResponse } from 'next/server';
import { getCollections } from '@/lib/notion';
import { categorizeCollection, COLLECTION_CATEGORIES, titleCase } from '@/lib/labels';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

interface AppLabels {
  subjects: string[];
  grades: string[];
  useCases: string[];
}

export async function GET() {
  try {
    const collections = await getCollections();

    const labelsMap: Record<string, AppLabels> = {};

    for (const col of collections) {
      const cat = categorizeCollection(col.name);
      if (!cat || cat.category === 'org') continue;

      const targetKey: keyof AppLabels =
        cat.category === 'subject' ? 'subjects'
          : cat.category === 'grade' ? 'grades'
            : 'useCases';

      for (const app of col.apps) {
        if (!app.id) continue;
        if (!labelsMap[app.id]) {
          labelsMap[app.id] = { subjects: [], grades: [], useCases: [] };
        }
        if (!labelsMap[app.id][targetKey].includes(cat.label)) {
          labelsMap[app.id][targetKey].push(cat.label);
        }
      }
    }

    const filterOptions = {
      subjects: COLLECTION_CATEGORIES.subject.map(titleCase).sort(),
      grades: COLLECTION_CATEGORIES.grade.map(titleCase),
      useCases: COLLECTION_CATEGORIES.useCase.map(titleCase).sort(),
    };

    return NextResponse.json({ labels: labelsMap, filterOptions }, { headers: corsHeaders });
  } catch (error) {
    console.error('App labels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

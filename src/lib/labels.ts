export const COLLECTION_CATEGORIES: Record<string, string[]> = {
  subject: [
    'science & stem', 'math', 'ela & literacy', 'social studies & history',
    'arts & design', 'business & economics', 'cultural studies', 'religious studies',
    'health & pe', 'music & performing arts', 'world languages',
    'illustrative mathematics',
  ],
  grade: [
    'elementary', 'middle school', 'high school', 'higher ed',
  ],
  useCase: [
    'project-based learning', 'student-built apps', 'study partners', 'writing coaches',
    'career & vocational', 'assessment & feedback', 'teacher tools',
    'ai assistants', 'sel & wellbeing', 'ell & esl',
    'special education', 'niche & emerging', 'gamified learning',
    'data-driven instruction', 'family & community',
    'school leadership', 'reading intervention', 'creative & engagement',
    'professional development', 'lesson planning',
    'differentiation & access', 'flowers',
  ],
  org: [
    'ghana', 'nyc', 'texas', 'fairfax',
    'ciob', 'kipp', 'ca community colleges',
    'amplify', 'leading educators',
  ],
};

const _lookup: Record<string, { category: string; label: string }> = {};
for (const [category, names] of Object.entries(COLLECTION_CATEGORIES)) {
  for (const name of names) {
    _lookup[name.toLowerCase()] = { category, label: titleCase(name) };
  }
}

export function categorizeCollection(name: string) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  if (_lookup[lower]) return _lookup[lower];
  for (const [key, val] of Object.entries(_lookup)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return null;
}

export function titleCase(str: string) {
  return str
    .split(/\s+/)
    .map(word => {
      if (['&', '/', 'and', 'or', 'of', 'the', 'in', 'for', 'to', 'a'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^./, c => c.toUpperCase());
}

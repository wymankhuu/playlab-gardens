/**
 * Shared label categorization for Playlab Gardens.
 * Maps collection names to categories: subject, grade, useCase, org.
 * Org collections are excluded from app labels.
 */

const COLLECTION_CATEGORIES = {
  subject: [
    'science / stem', 'math', 'ela / literacy', 'social studies / history',
    'arts & design', 'business / economics', 'cultural studies', 'religious studies',
    'health & pe', 'music & performing arts', 'world languages',
    'illustrative mathematics',
  ],
  grade: [
    'elementary', 'middle school', 'high school', 'higher ed',
  ],
  useCase: [
    'project-based learning', 'student-built apps', 'study partners', 'writing coaches',
    'career & vocational', 'assessment & feedback', 'teacher tools',
    'ai assistants', 'sel / wellbeing', 'ell / esl',
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

// Build a reverse lookup: lowercased name → { category, label }
const _lookup = {};
for (const [category, names] of Object.entries(COLLECTION_CATEGORIES)) {
  for (const name of names) {
    _lookup[name.toLowerCase()] = {
      category,
      label: titleCase(name),
    };
  }
}

/**
 * Categorize a collection name.
 * @param {string} name - Collection name
 * @returns {{ category: string, label: string } | null} - null if not found
 */
function categorizeCollection(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  if (_lookup[lower]) return _lookup[lower];

  // Partial match fallback
  for (const [key, val] of Object.entries(_lookup)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return null;
}

function titleCase(str) {
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

module.exports = { COLLECTION_CATEGORIES, categorizeCollection, titleCase };

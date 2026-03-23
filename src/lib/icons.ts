import { icons } from 'lucide-react';
import { createElement } from 'react';

// Maps collection names (lowercase) to Lucide icon names
export const COLLECTION_ICONS: Record<string, string> = {
  'project-based learning': 'Rocket',
  'student-built apps': 'Code',
  'study partners': 'BookOpen',
  'writing coaches': 'PenTool',
  'career & vocational': 'GraduationCap',
  'assessment & feedback': 'ClipboardCheck',
  'science & stem': 'FlaskConical',
  'science / stem': 'FlaskConical',
  'math': 'Calculator',
  'ela & literacy': 'BookText',
  'ela / literacy': 'BookText',
  'social studies & history': 'Landmark',
  'social studies / history': 'Landmark',
  'arts & design': 'Palette',
  'business & economics': 'Briefcase',
  'business / economics': 'Briefcase',
  'cultural studies': 'Globe',
  'religious studies': 'Heart',
  'elementary': 'Baby',
  'middle school': 'Backpack',
  'high school': 'School',
  'higher ed': 'GraduationCap',
  'ca community colleges': 'Building',
  'teacher tools': 'Wrench',
  'ghana': 'MapPin',
  'nyc': 'MapPin',
  'texas': 'MapPin',
  'fairfax': 'MapPin',
  'ciob': 'Building2',
  'flowers': 'Flower2',
  'ai assistants': 'Brain',
  'sel & wellbeing': 'Smile',
  'sel / wellbeing': 'Smile',
  'ell & esl': 'Languages',
  'ell / esl': 'Languages',
  'special education': 'Accessibility',
  'niche & emerging': 'TrendingUp',
  'illustrative mathematics': 'SquareFunction',
  'world languages': 'Languages',
  'gamified learning': 'Gamepad2',
  'kipp': 'MapPin',
  'data-driven instruction': 'BarChart3',
  'family & community': 'Users',
  'school leadership': 'Shield',
  'reading intervention': 'BookMarked',
  'amplify': 'Volume2',
  'leading educators': 'Award',
  'health & pe': 'Activity',
  'creative & engagement': 'Lightbulb',
  'music & performing arts': 'Music',
  'professional development': 'Briefcase',
  'lesson planning': 'Calendar',
  'differentiation & access': 'Accessibility',
  'operations and management': 'Settings',
  'tutoring & practice': 'BookOpen',
};

export function getCollectionIcon(name: string): string {
  const lower = (name || '').toLowerCase();
  // Exact match first
  if (COLLECTION_ICONS[lower]) return COLLECTION_ICONS[lower];
  // Partial match
  for (const [key, icon] of Object.entries(COLLECTION_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  // Fallback based on type
  if (lower.includes('showcase') || lower.includes('district')) return 'MapPin';
  return 'Folder';
}

export function LucideIcon({ name, size }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons];
  if (!Icon) return null;
  return createElement(Icon, { size: size || 20 });
}

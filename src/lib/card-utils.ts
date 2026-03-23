import type { App } from '@/lib/notion';

export const MAX_PREVIEW_TAGS = 3;
const MAX_INITIALS = 2;
const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;

export function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '\u2026';
}

export function shortDesc(str: string): string {
  if (!str) return '';
  const sentences = str.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return truncate(str, TRUNCATE_SHORT);
  const short = sentences.slice(0, MAX_SHORT_SENTENCES).join('').trim();
  return truncate(short, TRUNCATE_LONG);
}

export function generateFallbackDescription(app: App): string {
  if (app.description && app.description.trim()) return app.description;
  return 'An educator-built Playlab app.';
}

export function getInitials(name: string): string {
  if (!name) return 'P';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS);
}

export function countMissingFields(app: App): { count: number; fields: string[] } {
  const missing: string[] = [];
  if (!app.creator) missing.push('creator');
  if (!app.description || !app.description.trim()) missing.push('description');
  if (!app.usage || !app.usage.trim()) missing.push('usage');
  if (!app.impact || !app.impact.trim()) missing.push('impact');
  return { count: missing.length, fields: missing };
}

/* ==========================================
   Playlab Gardens — Shared Utility Functions
   ========================================== */

const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;

/** Format large numbers: 1000 → "1.0K", 1500000 → "1.5M" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/** HTML-escape a string for safe insertion */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Truncate a string to `max` characters, adding ellipsis */
export function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '\u2026';
}

/** First 1-2 sentences, max 200 chars */
export function shortDesc(str: string): string {
  if (!str) return '';
  const sentences = str.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return truncate(str, TRUNCATE_SHORT);
  const short = sentences.slice(0, MAX_SHORT_SENTENCES).join('').trim();
  return truncate(short, TRUNCATE_LONG);
}

/** Return the app description, or a fallback if empty */
export function generateFallbackDescription(app: {
  description?: string;
}): string {
  if (app.description && app.description.trim()) return app.description;
  return 'An educator-built Playlab app.';
}

/** Generate an impact blurb from remix count */
export function generateImpactBlurb(iterations: number): string | null {
  if (!iterations) return null;
  if (iterations >= 10) return `Remixed ${iterations} times by other educators.`;
  if (iterations > 0)
    return `Remixed ${iterations} time${iterations !== 1 ? 's' : ''}.`;
  return null;
}

/* ==========================================
   Playlab Gardens — Star / Favorite System
   localStorage + API persistence
   ========================================== */

const STARS_KEY = 'playlab-gardens-stars';
const MAX_STAR_IDS_PER_REQUEST = 100;

/** In-memory cache of star counts keyed by app ID */
const _starCountCache: Record<string, number> = {};

/** Read the full starred-apps map from localStorage */
export function getStarredApps(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

/** Check whether a specific app is starred */
export function isStarred(appId: string): boolean {
  return !!getStarredApps()[appId];
}

/**
 * Toggle the star for an app.
 * Updates localStorage immediately, then fires API call in the background.
 * Returns the new starred state and a promise that resolves to the updated count.
 */
export function toggleStar(appId: string): {
  nowStarred: boolean;
  countPromise: Promise<number | null>;
} {
  const stars = getStarredApps();
  const nowStarred = !stars[appId];

  if (nowStarred) {
    stars[appId] = Date.now();
  } else {
    delete stars[appId];
  }
  localStorage.setItem(STARS_KEY, JSON.stringify(stars));

  const countPromise = fetch('/api/star', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, action: nowStarred ? 'star' : 'unstar' }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.count != null) {
        _starCountCache[appId] = data.count;
        return data.count as number;
      }
      return null;
    })
    .catch(() => null);

  return { nowStarred, countPromise };
}

/**
 * Batch-load star counts from the API.
 * Results are cached in memory and returned.
 */
export async function loadStarCounts(
  appIds: string[],
): Promise<Record<string, number>> {
  if (!appIds || appIds.length === 0) return {};
  const unique = [...new Set(appIds)].slice(0, MAX_STAR_IDS_PER_REQUEST);
  try {
    const res = await fetch(`/api/stars?ids=${unique.join(',')}`);
    const counts: Record<string, number> = await res.json();
    for (const [id, count] of Object.entries(counts)) {
      _starCountCache[id] = count;
    }
    return counts;
  } catch {
    return {};
  }
}

/** Get the cached star count for an app (0 if not cached) */
export function getCachedStarCount(appId: string): number {
  return _starCountCache[appId] || 0;
}

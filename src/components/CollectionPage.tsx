'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Collection, App } from '@/lib/notion';
import QRModal from '@/components/QRModal';
import ShareButton from '@/components/ShareButton';
import { loadStarCounts } from '@/lib/stars';
import { useAdminMode } from './AdminPanel';
import AppCardComponent from './AppCard';
import { LucideIcon, getCollectionIcon } from '@/lib/icons';
import type { CollectionSummary } from '@/app/collection/[id]/CollectionPageClient';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SEARCH_DEBOUNCE_MS = 200;

const SUBJECT_NAMES = [
  'science', 'stem', 'math', 'ela', 'literacy', 'social studies', 'history',
  'arts', 'design', 'business', 'economics', 'cultural', 'religious', 'health',
  'pe', 'music', 'performing', 'world languages', 'illustrative',
];
const GRADE_NAMES = ['elementary', 'middle school', 'high school', 'higher ed'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeroImage(collection: Collection): string {
  const lower = collection.name.toLowerCase();
  if (lower === 'flowers') return '/images/beat-2.webp';
  if (collection.type === 'org') return '/images/beat-3.webp';
  if (SUBJECT_NAMES.some((s) => lower.includes(s))) return '/images/beat-1.webp';
  if (GRADE_NAMES.some((g) => lower.includes(g))) return '/images/beat-6.webp';
  return '/images/beat-5.webp';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg
      className="search-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Filter Dropdown
// ---------------------------------------------------------------------------
function FilterDropdown({
  tags,
  activeFilters,
  onToggle,
}: {
  tags: string[];
  activeFilters: Set<string>;
  onToggle: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const hasSelection = activeFilters.size > 0;

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        className={`filter-dropdown-btn${hasSelection ? ' has-selection' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        Also in <span className="filter-arrow">&#9662;</span>
      </button>
      <div
        className={`filter-dropdown-menu${open ? ' open' : ''}`}
        role="group"
        style={{ textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        {tags.map((tag) => {
          const checked = activeFilters.has(tag);
          return (
            <label
              key={tag}
              className={`filter-dropdown-item${checked ? ' checked' : ''}`}
              data-value={tag}
            >
              <input
                type="checkbox"
                value={tag}
                checked={checked}
                onChange={() => onToggle(tag)}
              />
              <span>{tag}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CollectionPage Component
// ---------------------------------------------------------------------------
export interface CollectionPageProps {
  collection: Collection;
  allCollectionSummaries?: CollectionSummary[];
  onOpenApp?: (app: App) => void;
}

export default function CollectionPageComponent({
  collection,
  allCollectionSummaries = [],
  onOpenApp,
}: CollectionPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { isAdmin } = useAdminMode();

  // --- Load star counts on mount ---
  useEffect(() => {
    const appIds = collection.apps.map((a) => a.id);
    if (appIds.length > 0) {
      loadStarCounts(appIds);
    }
  }, [collection.apps]);

  // --- URL sync: read from URL on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    if (filterParam) {
      const tags = filterParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      setActiveFilters(new Set(tags));
    }
    const qParam = params.get('q');
    if (qParam) {
      setSearchQuery(qParam);
      setDebouncedQuery(qParam);
    }
  }, []);

  // --- Deep linking: check hash on mount ---
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#app=')) {
      const appId = hash.slice(5);
      if (appId) {
        const app = collection.apps.find((a) => a.id === appId);
        if (app && onOpenApp) {
          onOpenApp(app);
        }
      }
    }
  }, [collection.apps, onOpenApp]);

  // --- URL sync: write to URL on change ---
  const syncToURL = useCallback(
    (query: string, filters: Set<string>) => {
      const params = new URLSearchParams();
      if (filters.size > 0) {
        params.set('filter', [...filters].join(','));
      }
      if (query) {
        params.set('q', query);
      }
      const paramString = params.toString();
      const newURL = `${window.location.pathname}${paramString ? '?' + paramString : ''}${window.location.hash}`;
      window.history.replaceState(null, '', newURL);
    },
    [],
  );

  // --- Search debounce ---
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      syncToURL(value, activeFilters);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    syncToURL('', activeFilters);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSearchClear();
    }
  };

  // --- Tag filter toggle ---
  const handleToggleFilter = (tag: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      syncToURL(debouncedQuery, next);
      return next;
    });
  };

  // --- Clear all filters ---
  const handleClearFilters = () => {
    setActiveFilters(new Set());
    setSearchQuery('');
    setDebouncedQuery('');
    syncToURL('', new Set());
  };

  // --- Collect all unique tags sorted by frequency ---
  const sortedTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const app of collection.apps) {
      if (!app.tags) continue;
      for (const tag of app.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [collection.apps]);

  // --- Filter and sort apps ---
  const filteredApps = useMemo(() => {
    let result = [...collection.apps];

    // Sort: pinned first (by homepageOrder), then A-Z by name
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) return (a.homepageOrder ?? 999) - (b.homepageOrder ?? 999);
      return a.name.localeCompare(b.name);
    });

    // Search filter
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          (app.description || '').toLowerCase().includes(q) ||
          (app.creator || '').toLowerCase().includes(q),
      );
    }

    // Tag filters (any match)
    if (activeFilters.size > 0) {
      result = result.filter((app) => {
        if (!app.tags) return false;
        return [...activeFilters].some((tag) => app.tags.includes(tag));
      });
    }

    return result;
  }, [collection.apps, debouncedQuery, activeFilters]);

  const hasActiveFilters = activeFilters.size > 0 || debouncedQuery.length > 0;

  // --- Compute related collections ---
  const relatedCollections = useMemo(() => {
    if (allCollectionSummaries.length === 0) return [];

    // Build a lookup from collection name to summary
    const summaryByName = new Map<string, CollectionSummary>();
    for (const s of allCollectionSummaries) {
      summaryByName.set(s.name, s);
    }

    // For each app in the current collection, count how many times each
    // other tag (collection name) appears
    const tagCounts: Record<string, number> = {};
    const currentName = collection.name;
    for (const app of collection.apps) {
      if (!app.tags) continue;
      for (const tag of app.tags) {
        if (tag === currentName) continue;
        // Only count if it matches a known collection
        if (summaryByName.has(tag)) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        ...summaryByName.get(name)!,
        sharedCount: count,
      }));
  }, [collection.apps, collection.name, allCollectionSummaries]);

  // --- Hero image + accent ---
  const heroImage = getHeroImage(collection);
  const accentColor = collection.iconColor || '#00983F';
  const iconName = getCollectionIcon(collection.name);

  // --- Org context ---
  const isOrg = collection.type === 'org';
  const orgName = isOrg
    ? collection.name.replace(/\s*Showcase\s*/i, '') + ' Organization'
    : '';

  // --- Open app handler ---
  const handleOpenApp = (app: App) => {
    if (onOpenApp) {
      onOpenApp(app);
    }
  };

  return (
    <>
      {/* Collection Hero */}
      <section
        className="collection-hero"
        style={
          {
            '--accent': accentColor,
            backgroundImage: `url('${heroImage}')`,
          } as React.CSSProperties
        }
      >
        <div className="collection-hero-shapes" aria-hidden="true">
          <div className="collection-hero-shape collection-hero-shape-1" />
          <div className="collection-hero-shape collection-hero-shape-2" />
        </div>
        <div className="collection-hero-content container">
          <Link href="/" className="collection-breadcrumb">
            <LucideIcon name="arrow-left" size={16} />
            All Collections
          </Link>
          <div className="collection-hero-header">
            <div
              className="collection-hero-icon"
              style={{ backgroundColor: accentColor }}
            >
              <LucideIcon name={iconName} size={28} />
            </div>
            <div className="collection-hero-text">
              <h1>{collection.name}</h1>
              {collection.description && (
                <p className="collection-hero-desc">{collection.description}</p>
              )}
            </div>
          </div>
          <div className="collection-hero-meta">
            <span className="collection-hero-stat">
              {filteredApps.length} app{filteredApps.length !== 1 ? 's' : ''} in this collection
            </span>
            {isOrg && (
              <span className="collection-hero-org">
                <span>{orgName}</span>
              </span>
            )}
            <div className="collection-hero-actions">
              <button
                className="qr-code-btn"
                title="Generate QR code"
                aria-label="Generate QR code"
                onClick={() => setShowQR(true)}
              >
                <LucideIcon name="qr-code" size={18} />
              </button>
              <ShareButton url={typeof window !== 'undefined' ? window.location.href : ''} />
            </div>
          </div>

          {/* Search */}
          <div className="search-container">
            <SearchIcon />
            <input
              type="search"
              className="search-input"
              placeholder="Search apps by name..."
              aria-label="Search apps in this collection"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              className={`search-clear${searchQuery ? ' visible' : ''}`}
              aria-label="Clear search"
              onClick={handleSearchClear}
            >
              &#10005;
            </button>
          </div>
          <div className="collection-accent-bar-hidden" />
        </div>
      </section>

      {/* Apps Grid */}
      <main className="container section">
        <div className="collection-grid-header">
          <div className="collection-grid-top">
            <h2 className="collection-grid-title">Apps in this collection</h2>
          </div>
          {sortedTags.length > 0 && (
            <div className="filter-bar" role="toolbar">
              <div className="filter-group">
                <FilterDropdown
                  tags={sortedTags}
                  activeFilters={activeFilters}
                  onToggle={handleToggleFilter}
                />
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear filters
          </button>
        )}

        {filteredApps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <LucideIcon name="search" size={48} />
            </div>
            <h3>No apps match the selected filters</h3>
            <p>
              Try a different search term, or{' '}
              <Link href="/">browse all collections</Link>.
            </p>
          </div>
        ) : (
          <div
            className="apps-grid"
            style={{ '--collection-accent': accentColor } as React.CSSProperties}
          >
            {filteredApps.map((app) => (
              <AppCardComponent
                key={app.id}
                app={app}
                accentColor={accentColor}
                isAdmin={isAdmin}
                onOpenApp={handleOpenApp}
              />
            ))}
          </div>
        )}
      </main>

      {/* Related Collections */}
      {relatedCollections.length > 0 && (
        <section className="container related-collections">
          <h3 className="related-collections-title">Related Collections</h3>
          <div className="related-collections-list">
            {relatedCollections.map((rc) => (
              <Link
                key={rc.id}
                href={`/collection/${rc.id}`}
                className="related-collection-item"
              >
                <span
                  className="related-collection-dot"
                  style={{ backgroundColor: rc.iconColor || '#00983F' }}
                />
                <span className="related-collection-name">{rc.name}</span>
                <span className="related-collection-count">
                  {rc.sharedCount} shared app{rc.sharedCount !== 1 ? 's' : ''}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* QR Modal */}
      {showQR && (
        <QRModal
          url={typeof window !== 'undefined' ? window.location.href : ''}
          name={collection.name}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}

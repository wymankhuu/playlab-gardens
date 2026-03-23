'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Collection, App } from '@/lib/notion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_PREVIEW_TAGS = 3;
const MAX_INITIALS = 2;
const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;
const COPY_FEEDBACK_MS = 2000;
const SEARCH_DEBOUNCE_MS = 200;

const SUBJECT_NAMES = [
  'science', 'stem', 'math', 'ela', 'literacy', 'social studies', 'history',
  'arts', 'design', 'business', 'economics', 'cultural', 'religious', 'health',
  'pe', 'music', 'performing', 'world languages', 'illustrative',
];
const GRADE_NAMES = ['elementary', 'middle school', 'high school', 'higher ed'];

const COLLECTION_ICONS: Record<string, string> = {
  'project-based learning': 'rocket',
  'student-built apps': 'code',
  'study partners': 'book-open',
  'writing coaches': 'pen-tool',
  'career & vocational': 'graduation-cap',
  'assessment & feedback': 'clipboard-check',
  'science / stem': 'flask-conical',
  'math': 'calculator',
  'ela / literacy': 'book-text',
  'social studies / history': 'landmark',
  'arts & design': 'palette',
  'business / economics': 'briefcase',
  'cultural studies': 'globe',
  'religious studies': 'heart',
  'elementary': 'baby',
  'middle school': 'backpack',
  'high school': 'school',
  'higher ed': 'graduation-cap',
  'ca community colleges': 'building',
  'teacher tools': 'wrench',
  'ghana': 'map-pin',
  'nyc': 'map-pin',
  'texas': 'map-pin',
  'fairfax': 'map-pin',
  'ciob': 'building-2',
  'flowers': 'flower-2',
  'ai assistants': 'brain',
  'sel / wellbeing': 'smile',
  'ell / esl': 'languages',
  'special education': 'accessibility',
  'niche & emerging': 'trending-up',
  'illustrative mathematics': 'square-function',
  'world languages': 'languages',
  'gamified learning': 'gamepad-2',
  'kipp': 'map-pin',
  'data-driven instruction': 'bar-chart-3',
  'family & community': 'users',
  'school leadership': 'shield',
  'reading intervention': 'book-marked',
  'amplify': 'volume-2',
  'leading educators': 'award',
  'health & pe': 'activity',
  'creative & engagement': 'lightbulb',
  'music & performing arts': 'music',
  'professional development': 'briefcase',
  'lesson planning': 'calendar',
  'differentiation & access': 'accessibility',
  'operations and management': 'settings',
  'tutoring & practice': 'book-open',
  'sel & wellbeing': 'smile',
  'science & stem': 'flask-conical',
  'social studies & history': 'landmark',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '\u2026';
}

function shortDesc(str: string): string {
  if (!str) return '';
  const sentences = str.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return truncate(str, TRUNCATE_SHORT);
  const short = sentences.slice(0, MAX_SHORT_SENTENCES).join('').trim();
  return truncate(short, TRUNCATE_LONG);
}

function generateFallbackDescription(app: App): string {
  if (app.description && app.description.trim()) return app.description;
  return 'An educator-built Playlab app.';
}

function getCollectionIcon(name: string): string {
  const lower = (name || '').toLowerCase();
  if (COLLECTION_ICONS[lower]) return COLLECTION_ICONS[lower];
  for (const [key, icon] of Object.entries(COLLECTION_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  if (lower.includes('showcase') || lower.includes('district')) return 'map-pin';
  return 'folder';
}

function getHeroImage(collection: Collection): string {
  const lower = collection.name.toLowerCase();
  if (lower === 'flowers') return '/images/beat-2.webp';
  if (collection.type === 'org') return '/images/beat-3.webp';
  if (SUBJECT_NAMES.some((s) => lower.includes(s))) return '/images/beat-1.webp';
  if (GRADE_NAMES.some((g) => lower.includes(g))) return '/images/beat-6.webp';
  return '/images/beat-5.webp';
}

function getInitials(name: string): string {
  if (!name) return 'P';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS);
}

// ---------------------------------------------------------------------------
// Star helpers (localStorage)
// ---------------------------------------------------------------------------
const STARS_KEY = 'playlab-gardens-stars';

function getStarredApps(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) || '{}');
  } catch {
    return {};
  }
}

function isStarred(appId: string): boolean {
  return !!getStarredApps()[appId];
}

function toggleStar(appId: string): boolean {
  const stars = getStarredApps();
  const nowStarred = !stars[appId];
  if (nowStarred) {
    stars[appId] = Date.now();
  } else {
    delete stars[appId];
  }
  localStorage.setItem(STARS_KEY, JSON.stringify(stars));

  fetch('/api/stars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, action: nowStarred ? 'star' : 'unstar' }),
  }).catch(() => {});

  return nowStarred;
}

// ---------------------------------------------------------------------------
// Lucide icon SVG component (inline)
// ---------------------------------------------------------------------------
function LucideIcon({ name, size = 20 }: { name: string; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && typeof window !== 'undefined' && (window as any).lucide) {
      ref.current.innerHTML = `<i data-lucide="${name}" style="width:${size}px;height:${size}px;"></i>`;
      (window as any).lucide.createIcons({ nodes: [ref.current] });
    }
  }, [name, size]);

  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }} />;
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
// QR Modal
// ---------------------------------------------------------------------------
function QRModal({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  const [copyText, setCopyText] = useState('Copy Link');
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&margin=10`;
  const downloadName = `qr-${name.toLowerCase().replace(/\s+/g, '-')}.png`;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy Link'), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div
      className="qr-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h3 className="qr-modal-title">{name}</h3>
          <button className="qr-modal-close" aria-label="Close" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <div className="qr-modal-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR code for ${name}`}
            className="qr-modal-image"
            width="300"
            height="300"
          />
          <p className="qr-modal-url">{url}</p>
        </div>
        <div className="qr-modal-actions">
          <a href={qrImageUrl} download={downloadName} className="qr-download-btn">
            Download QR
          </a>
          <button className="qr-copy-btn" onClick={handleCopy}>
            {copyText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App Card
// ---------------------------------------------------------------------------
function AppCard({
  app,
  accentColor,
  onClick,
}: {
  app: App;
  accentColor: string;
  onClick: () => void;
}) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isStarred(app.id));
  }, [app.id]);

  const desc = generateFallbackDescription(app);
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator ? getInitials(app.creator) : 'P';

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStarred = toggleStar(app.id);
    setStarred(nowStarred);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const tagsPills = app.tags && app.tags.length > 0 ? app.tags.slice(0, MAX_PREVIEW_TAGS) : [];
  const extraTags = app.tags ? app.tags.length - MAX_PREVIEW_TAGS : 0;

  return (
    <div
      className="app-card"
      data-app-id={app.id}
      tabIndex={0}
      role="button"
      aria-label={`View ${app.name}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ '--collection-accent': accentColor } as React.CSSProperties}
    >
      <button
        className={`app-star-btn${starred ? ' starred' : ''}`}
        data-app-id={app.id}
        aria-label="Star this app"
        title="Star this app"
        onClick={handleStar}
      >
        <span className="star-icon">{starred ? '\u2605' : '\u2606'}</span>
        <span className="star-count" />
      </button>
      <div className="app-card-body">
        <div className="app-card-creator">
          <span className="app-card-avatar" style={{ backgroundColor: accentColor }}>
            {initials}
          </span>
          {creatorName}
        </div>
        <div className="app-card-name">{app.name}</div>
        <div className="app-card-desc">{shortDesc(desc)}</div>
        {tagsPills.length > 0 && (
          <div className="app-card-tags">
            {tagsPills.map((tag) => (
              <span key={tag} className="app-tag">
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="app-tag app-tag--more">+{extraTags}</span>
            )}
          </div>
        )}
      </div>
    </div>
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
  onOpenApp?: (app: App) => void;
}

export default function CollectionPageComponent({
  collection,
  onOpenApp,
}: CollectionPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

    // Default A-Z sort
    result.sort((a, b) => a.name.localeCompare(b.name));

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

  // --- Hero image + accent ---
  const heroImage = getHeroImage(collection);
  const accentColor = collection.iconColor || '#00983F';
  const iconName = getCollectionIcon(collection.name);

  // --- Org context ---
  const isOrg = collection.type === 'org';
  const orgName = isOrg
    ? collection.name.replace(/\s*Showcase\s*/i, '') + ' Organization'
    : '';

  // --- Share handler ---
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), COPY_FEEDBACK_MS);
    });
  };

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
              {collection.appCount} app{collection.appCount !== 1 ? 's' : ''} in this collection
            </span>
            {isOrg && (
              <span className="collection-hero-org">
                <span>{orgName}</span>
              </span>
            )}
            <div className="collection-hero-share">
              <button
                className="qr-code-btn"
                title="Generate QR code"
                aria-label="Generate QR code"
                onClick={() => setShowQR(true)}
              >
                <LucideIcon name="qr-code" size={18} />
              </button>
              <button
                className={`share-link-btn${shareToast ? ' copied' : ''}`}
                title="Copy share link"
                aria-label="Copy share link"
                onClick={handleShare}
              >
                <LucideIcon name="link" size={18} />
                {shareToast && <span className="copied-toast">Link copied!</span>}
              </button>
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
              <AppCard
                key={app.id}
                app={app}
                accentColor={accentColor}
                onClick={() => handleOpenApp(app)}
              />
            ))}
          </div>
        )}
      </main>

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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Collection, App } from '@/lib/notion';
import { pickPreview } from '@/lib/notion';
import { getCollectionIcon, LucideIcon } from '@/lib/icons';
import { loadStarCounts } from '@/lib/stars';
import { useAdminMode } from './AdminPanel';
import SearchOverlay from '@/components/SearchOverlay';
import PreviewAppCard from '@/components/PreviewAppCard';
import QRModal from '@/components/QRModal';
import ShareButton from '@/components/ShareButton';

const SCROLL_OFFSET = 140;
const ADMIN_MAX_PREVIEW = 9;
const DEFAULT_MAX_PREVIEW = 6;
const ADMIN_PWD_KEY = 'playlab-admin-pwd';

// ---- Grouping constants ----
const SUBJECT_NAMES = [
  'science / stem', 'science & stem', 'math', 'ela / literacy', 'ela & literacy',
  'social studies / history', 'social studies & history', 'arts & design',
  'business / economics', 'business & economics', 'cultural studies',
  'religious studies', 'health & pe', 'music & performing arts', 'world languages',
  'illustrative mathematics',
];

const GRADE_NAMES = ['elementary', 'middle school', 'high school', 'higher ed'];

const ORG_KEYWORDS = [
  'ghana', 'nyc', 'texas', 'fairfax', 'ciob', 'kipp',
  'ca community colleges', 'amplify', 'leading educators',
];

function isOrgCollection(name: string): boolean {
  const lower = name.toLowerCase();
  return ORG_KEYWORDS.some((o) => lower.includes(o));
}

// ---- Helpers ----
function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '\u2026';
}

interface Group {
  title: string;
  slug: string;
  collections: Collection[];
}

function groupCollections(collections: Collection[]): Group[] {
  const sorted = [...collections].sort((a, b) => a.name.localeCompare(b.name));

  const groups: Group[] = [
    { title: 'Subjects', slug: 'subjects', collections: [] },
    { title: 'Grade Levels', slug: 'grade-levels', collections: [] },
    { title: 'Use Cases', slug: 'use-cases', collections: [] },
    { title: 'Organizations', slug: 'organizations', collections: [] },
  ];

  for (const col of sorted) {
    const lower = col.name.toLowerCase();
    if (SUBJECT_NAMES.some((s) => lower.includes(s) || s.includes(lower))) {
      groups[0].collections.push(col);
    } else if (GRADE_NAMES.some((g) => lower.includes(g) || g.includes(lower))) {
      groups[1].collections.push(col);
    } else if (isOrgCollection(col.name)) {
      groups[3].collections.push(col);
    } else {
      groups[2].collections.push(col);
    }
  }

  return groups.filter((g) => g.collections.length > 0);
}

// ---- Sub-components ----

function CollectionSection({
  collection,
  isAdmin,
  onOpenApp,
}: {
  collection: Collection;
  isAdmin: boolean;
  onOpenApp: (app: App) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [orderedApps, setOrderedApps] = useState<App[] | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(el);
          }
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load star counts when section becomes visible
  useEffect(() => {
    if (visible && collection.apps.length > 0) {
      const appIds = collection.apps.slice(0, 3).map((a) => a.id);
      loadStarCounts(appIds);
    }
  }, [visible, collection.apps]);

  if (!visible) {
    return (
      <div
        ref={ref}
        className="collection-section-placeholder"
        id={`col-${collection.id}`}
        data-collection-id={collection.id}
        style={{ minHeight: 320 }}
      />
    );
  }

  const accentColor = collection.iconColor || '#00983F';
  const iconName = getCollectionIcon(collection.name);
  const description = collection.description || `A curated collection of ${collection.appCount} Playlab apps.`;
  const countText = collection.appCount
    ? `${collection.appCount} app${collection.appCount !== 1 ? 's' : ''}`
    : '';
  const collectionUrl = `/collection/${collection.id}`;

  // Show up to 9 preview apps in admin mode, 6 otherwise
  const maxPreview = isAdmin ? ADMIN_MAX_PREVIEW : DEFAULT_MAX_PREVIEW;
  const previewApps = orderedApps || pickPreview(collection.apps, maxPreview, collection.name);

  // Drag-and-drop handlers (admin mode only)
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIdx(idx);
  };

  const handleDragLeave = () => {
    setDropIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDropIdx(null);
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }

    // Reorder locally only — don't save yet
    const newOrder = [...previewApps];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setOrderedApps(newOrder);
    setHasUnsavedOrder(true);
    setSaveStatus('idle');
    setDragIdx(null);
  };

  const handleSaveOrder = async () => {
    if (!orderedApps) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const pwd = sessionStorage.getItem(ADMIN_PWD_KEY) || '';
      const appOrder = orderedApps.map((app, i) => ({
        appName: app.name,
        order: i + 1,
      }));
      const res = await fetch('/api/admin-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, appOrder }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Reorder failed: ' + (data.error || 'Unknown error'));
        setSaveStatus('error');
      } else {
        setHasUnsavedOrder(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch {
      alert('Reorder failed: network error');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOrder = () => {
    setOrderedApps(null);
    setHasUnsavedOrder(false);
    setSaveStatus('idle');
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <section
      ref={ref}
      className="collection-section fade-up visible"
      id={`col-${collection.id}`}
      data-type={collection.type || 'topic'}
      style={{ '--collection-accent': accentColor } as React.CSSProperties}
    >
      <div className="collection-section-header">
        <div className="collection-section-title">
          <div
            className="collection-section-icon"
            style={{ backgroundColor: accentColor }}
          >
            <LucideIcon name={iconName} size={18} />
          </div>
          <h3 className="collection-section-name">{collection.name}</h3>
        </div>
        <div className="collection-section-actions">
          <button
            className="qr-code-btn"
            data-url={collectionUrl}
            title="Generate QR code"
            aria-label="Generate QR code"
            onClick={() => setShowQR(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="2" y="14" width="8" height="8" rx="1" />
              <rect x="14" y="14" width="4" height="4" />
              <path d="M22 14h-2v4h-4v4h4a2 2 0 0 0 2-2z" />
            </svg>
          </button>
          <ShareButton url={typeof window !== 'undefined' ? `${window.location.origin}${collectionUrl}` : collectionUrl} />
          <Link href={collectionUrl} className="collection-section-viewall">
            View all &rarr;
          </Link>
        </div>
      </div>
      <p className="collection-section-desc">{truncate(description, 280)}</p>
      <div className="collection-section-meta">
        {countText && (
          <span className="collection-section-count">{countText}</span>
        )}
        {isAdmin && hasUnsavedOrder && (
          <span className="admin-order-actions" style={{ display: 'inline-flex', gap: 8, marginLeft: 12 }}>
            <button
              className="admin-save-btn"
              onClick={handleSaveOrder}
              disabled={saving}
              style={{ padding: '4px 14px', fontSize: '0.8rem', height: 'auto', width: 'auto' }}
            >
              {saving ? 'Saving...' : 'Save Order'}
            </button>
            <button
              className="admin-pw-cancel"
              onClick={handleResetOrder}
              disabled={saving}
              style={{ padding: '4px 14px', fontSize: '0.8rem', height: 'auto', width: 'auto' }}
            >
              Reset
            </button>
          </span>
        )}
        {isAdmin && saveStatus === 'saved' && !hasUnsavedOrder && (
          <span style={{ marginLeft: 12, color: '#2D7A3A', fontSize: '0.8rem', fontWeight: 500 }}>
            ✓ Order saved
          </span>
        )}
      </div>
      {previewApps.length > 0 ? (
        <div className="collection-preview-apps">
          {previewApps.map((app, idx) => (
            <div
              key={app.id}
              className={`admin-drag-wrapper${dropIdx === idx ? ' drag-over' : ''}${dragIdx === idx ? ' dragging' : ''}`}
              draggable={isAdmin}
              onDragStart={isAdmin ? () => handleDragStart(idx) : undefined}
              onDragOver={isAdmin ? (e) => handleDragOver(e, idx) : undefined}
              onDragLeave={isAdmin ? handleDragLeave : undefined}
              onDrop={isAdmin ? (e) => handleDrop(e, idx) : undefined}
              onDragEnd={isAdmin ? handleDragEnd : undefined}
            >
              {isAdmin && (
                <div className="admin-drag-handle" title="Drag to reorder">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="9" cy="6" r="2" />
                    <circle cx="15" cy="6" r="2" />
                    <circle cx="9" cy="12" r="2" />
                    <circle cx="15" cy="12" r="2" />
                    <circle cx="9" cy="18" r="2" />
                    <circle cx="15" cy="18" r="2" />
                  </svg>
                  <span className="admin-order-badge">{idx + 1}</span>
                </div>
              )}
              <PreviewAppCard
                app={app}
                isAdmin={isAdmin}
                onOpenApp={onOpenApp}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="collection-section-empty">Apps coming soon</div>
      )}
      {showQR && (
        <QRModal
          url={typeof window !== 'undefined' ? `${window.location.origin}${collectionUrl}` : collectionUrl}
          name={collection.name}
          onClose={() => setShowQR(false)}
        />
      )}
    </section>
  );
}

// ---- Jump Nav ----

function JumpNav({ groups }: { groups: Group[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;
    const sections = groups.map((g) => ({
      slug: g.slug,
      el: document.getElementById(`section-${g.slug}`),
    }));

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY + 200;
        let active: string | null = null;
        for (const s of sections) {
          if (s.el && s.el.offsetTop <= scrollY) {
            active = s.slug;
          }
        }
        setActiveSlug(active);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [groups]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
      e.preventDefault();
      const el = document.getElementById(`section-${slug}`);
      if (el) {
        const offset = (navRef.current?.offsetHeight || 0) + 80;
        window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
      }
    },
    []
  );

  return (
    <nav className="jump-nav" aria-label="Jump to section" ref={navRef}>
      {groups.map((g) => (
        <a
          key={g.slug}
          href={`#section-${g.slug}`}
          className={`jump-nav-link${activeSlug === g.slug ? ' active' : ''}`}
          onClick={(e) => handleClick(e, g.slug)}
        >
          {g.title}
        </a>
      ))}
    </nav>
  );
}

// ---- Main Component ----

interface HomePageProps {
  collections: Collection[];
  onOpenApp: (app: App) => void;
}

export default function HomePage({ collections, onOpenApp }: HomePageProps) {
  const groups = groupCollections(collections);
  const flowersCollection = collections.find(
    (c) => c.name.toLowerCase() === 'flowers'
  );

  const { isAdmin } = useAdminMode();

  // Deep linking: check hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#app=')) return;
    const appId = hash.slice(5);
    if (!appId) return;

    for (const col of collections) {
      const app = col.apps.find((a) => a.id === appId);
      if (app) {
        onOpenApp(app);
        return;
      }
    }
  }, [collections, onOpenApp]);

  // Smooth scroll for section pills
  const handlePillClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) {
      window.scrollTo({ top: el.offsetTop - SCROLL_OFFSET, behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-shapes" aria-hidden="true">
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
          <div className="hero-shape hero-shape-4" />
        </div>
        <div className="hero-content container">
          <h1 className="heading-xl">
            Welcome to the <span className="highlight">Playlab</span> Community{' '}
            <span className="highlight">Gardens</span>
          </h1>
          <p className="text-accent hero-tagline">
            Every app here was built by someone who knows their context best. Browse
            hundreds of tools grown by teachers, students, and leaders, each one
            shaped by the specific needs of a particular classroom, school, or community.
            No two look alike, because no two contexts are the same.
          </p>

          {/* Search */}
          <SearchOverlay collections={collections} onOpenApp={onOpenApp} />
        </div>
      </section>

      {/* Main Content */}
      <main id="main-content">
        {/* Flowers Spotlight */}
        {flowersCollection && (
          <section className="container" style={{ paddingTop: 32, paddingBottom: 0 }}>
            <Link href="/collection/flowers" className="flowers-spotlight">
              <div className="flowers-spotlight-bg" />
              <div className="flowers-spotlight-content">
                <span className="flowers-spotlight-badge">Featured Collection</span>
                <h2 className="flowers-spotlight-title">Flowers</h2>
                <p className="flowers-spotlight-desc">
                  {flowersCollection.description ||
                    'See how individuals across the Playlab community are building to reflect their unique contexts, roles, and goals. A living showcase of what\u2019s possible.'}
                </p>
                <span className="flowers-spotlight-cta">
                  Explore {flowersCollection.appCount} apps &rarr;
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* All Collections */}
        <section className="container section">
          <div className="section-header">
            <h2>All Collections</h2>
            <span id="collections-count" className="section-count">
              {collections.length} collections
            </span>
            {isAdmin && (
              <a
                className="export-csv-link"
                href={`/api/export-csv?password=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? sessionStorage.getItem('playlab-admin-pwd') || ''
                    : ''
                )}`}
                download
              >
                Export All CSV
              </a>
            )}
          </div>

          <div id="collections-grid" className="collections-grid">
            <JumpNav groups={groups} />

            {groups.map((group) => (
              <div
                key={group.slug}
                className="collection-group"
                id={`section-${group.slug}`}
              >
                <h3 className="collection-group-title">{group.title}</h3>
                <div className="section-pills">
                  {group.collections.map((c) => (
                    <a
                      key={c.id}
                      href={`#col-${c.id}`}
                      className="section-pill"
                      data-collection-id={c.id}
                      onClick={handlePillClick}
                    >
                      {c.name}{' '}
                      <span className="section-pill-count">{c.appCount}</span>
                    </a>
                  ))}
                </div>

                {group.collections.map((col) => (
                  <CollectionSection
                    key={col.id}
                    collection={col}
                    isAdmin={isAdmin}
                    onOpenApp={onOpenApp}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

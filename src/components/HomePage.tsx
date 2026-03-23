'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Collection, App } from '@/lib/notion';
import { getCollectionIcon, LucideIcon } from '@/lib/icons';
import SearchOverlay from '@/components/SearchOverlay';

const SCROLL_OFFSET = 140;
const MAX_PREVIEW_TAGS = 3;
const MAX_INITIALS = 2;
const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;

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

function getInitials(name: string): string {
  if (!name) return 'P';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS);
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

function PreviewAppCard({
  app,
  collection,
  onOpenApp,
}: {
  app: App;
  collection: Collection;
  onOpenApp: (app: App) => void;
}) {
  const desc = generateFallbackDescription(app);
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator ? getInitials(app.creator) : 'P';
  const tags = app.tags || [];
  const shownTags = tags.slice(0, MAX_PREVIEW_TAGS);
  const extraCount = tags.length - MAX_PREVIEW_TAGS;

  return (
    <div
      className="preview-app-card"
      data-app-id={app.id}
      tabIndex={0}
      role="button"
      aria-label={`View ${app.name}`}
      onClick={() => onOpenApp(app)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenApp(app);
        }
      }}
    >
      <div className="app-card-creator">
        <span className="app-card-avatar">{initials}</span>
        {creatorName}
      </div>
      <div className="preview-app-card-name">{app.name}</div>
      <div className="preview-app-card-desc">{shortDesc(desc)}</div>
      {shownTags.length > 0 && (
        <div className="app-card-tags">
          {shownTags.map((t) => (
            <span key={t} className="app-tag">{t}</span>
          ))}
          {extraCount > 0 && (
            <span className="app-tag app-tag--more">+{extraCount}</span>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionSection({
  collection,
  onOpenApp,
}: {
  collection: Collection;
  onOpenApp: (app: App) => void;
}) {
  const [visible, setVisible] = useState(false);
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

  // Use preview apps (first 3 from the apps array, since pickPreview was applied server-side)
  const previewApps = collection.apps.slice(0, 3);

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
      </div>
      {previewApps.length > 0 ? (
        <div className="collection-preview-apps">
          {previewApps.map((app) => (
            <PreviewAppCard
              key={app.id}
              app={app}
              collection={collection}
              onOpenApp={onOpenApp}
            />
          ))}
        </div>
      ) : (
        <div className="collection-section-empty">Apps coming soon</div>
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
            hundreds of tools grown by teachers, students, and leaders &mdash; each one
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

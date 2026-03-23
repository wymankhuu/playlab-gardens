'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Seed, SeedCollection } from '@/lib/notion';
import { shortDesc } from '@/lib/utils';
import QRModal from '@/components/QRModal';
import ShareButton from '@/components/ShareButton';
import SeedDrawer from '@/components/SeedDrawer';
import { LucideIcon } from '@/lib/icons';

interface SeedsClientProps {
  seedCollections: SeedCollection[];
}

const SEED_PREVIEW_TAGS = 3;

function SeedCard({ seed, onClick }: { seed: Seed; onClick?: () => void }) {
  return (
    <div
      className="seed-card-mini"
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="seed-card-mini-name">{seed.name}</div>
      <div className="seed-card-mini-desc">{shortDesc(seed.description)}</div>
      {seed.tags && seed.tags.length > 0 && (
        <div className="app-card-tags">
          {seed.tags.slice(0, SEED_PREVIEW_TAGS).map((t) => (
            <span key={t} className="app-tag">{t}</span>
          ))}
        </div>
      )}
      {seed.remixUrl && (
        <a
          href={seed.remixUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="seed-card-cta"
          onClick={(e) => e.stopPropagation()}
        >
          Plant this seed →
        </a>
      )}
    </div>
  );
}

function SeedCollectionSection({ sc, onOpenSeed }: { sc: SeedCollection; onOpenSeed: (seed: Seed, sc: SeedCollection) => void }) {
  const [showQR, setShowQR] = useState(false);
  const collectionUrl = `/collection/${sc.id}`;
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${collectionUrl}`
    : collectionUrl;
  const sortedApps = [...sc.apps].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="seed-collection-section fade-up"
      style={{ '--seed-accent': sc.color } as React.CSSProperties}
    >
      <div className="seed-collection-header">
        <div className="seed-collection-header-left">
          {sc.image && (
            <img
              className="seed-collection-flower"
              src={`/${sc.image}`}
              alt=""
              width={44}
              height={44}
            />
          )}
          <div className="seed-collection-meta">
            <h3 className="seed-collection-title">{sc.name}</h3>
            <span className="seed-collection-count">
              {sc.apps.length} seed{sc.apps.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="seed-collection-actions">
          <button
            className="qr-code-btn"
            title="Generate QR code"
            aria-label="Generate QR code"
            onClick={() => setShowQR(true)}
          >
            <LucideIcon name="QrCode" size={16} />
          </button>
          <ShareButton url={shareUrl} />
          <Link href={collectionUrl} className="seed-show-all-btn">
            View all →
          </Link>
        </div>
      </div>
      {sc.description && (
        <p className="seed-collection-desc">{sc.description}</p>
      )}
      <div className="seed-collection-cards">
        {sortedApps.map((seed) => (
          <SeedCard key={seed.name} seed={seed} onClick={() => onOpenSeed(seed, sc)} />
        ))}
      </div>
      {showQR && (
        <QRModal
          url={shareUrl}
          name={sc.name}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

export default function SeedsClient({ seedCollections }: SeedsClientProps) {
  const [search, setSearch] = useState('');
  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<{
    name: string; color: string; image: string; description: string;
  } | null>(null);

  // Deep link: open drawer if #seed=... is in the URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#seed=')) return;
    const seedId = decodeURIComponent(hash.slice(6));
    for (const sc of seedCollections) {
      const found = sc.apps.find((s) => s.id === seedId);
      if (found) {
        setSelectedSeed(found);
        setSelectedCollection({ name: sc.name, color: sc.color, image: sc.image, description: sc.description });
        break;
      }
    }
  }, [seedCollections]);

  const openSeedDrawer = (seed: Seed, sc: SeedCollection) => {
    setSelectedSeed(seed);
    setSelectedCollection({ name: sc.name, color: sc.color, image: sc.image, description: sc.description });
  };

  const closeSeedDrawer = () => {
    setSelectedSeed(null);
    setSelectedCollection(null);
  };

  // When searching, filter across ALL seeds
  const allSeeds = seedCollections.flatMap((sc) => sc.apps);

  const filteredSeeds = search
    ? allSeeds
        .filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.tags || []).some((t) =>
              t.toLowerCase().includes(search.toLowerCase())
            )
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    : null;

  return (
    <>
      {/* Search */}
      <section className="container" style={{ paddingBottom: 0 }}>
        <div className="search-container">
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
          <input
            type="search"
            className="search-input"
            placeholder="Search seeds by name..."
            aria-label="Search seeds"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="search-clear visible"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Seed Collections or Search Results */}
      <main className="container section">
        <div className="collection-groups">
          {filteredSeeds ? (
            // Search results view
            filteredSeeds.length > 0 ? (
              <div className="seeds-search-results">
                {filteredSeeds.map((seed) => {
                  const sc = seedCollections.find((c) => c.apps.some((s) => s.id === seed.id));
                  return (
                    <SeedCard
                      key={seed.name}
                      seed={seed}
                      onClick={sc ? () => openSeedDrawer(seed, sc) : undefined}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="seeds-empty">
                <div className="seeds-empty-icon">🔍</div>
                <h3>No seeds found</h3>
                <p>Try a different search term.</p>
              </div>
            )
          ) : seedCollections.length > 0 ? (
            // Collections view
            seedCollections.map((sc) => (
              <SeedCollectionSection key={sc.id} sc={sc} onOpenSeed={openSeedDrawer} />
            ))
          ) : (
            <div className="seeds-empty">
              <div className="seeds-empty-icon">🌱</div>
              <h3>Seeds are sprouting</h3>
              <p>
                Starter templates are on the way. Check back soon to find your
                first seed to plant.
              </p>
            </div>
          )}
        </div>
      </main>

      <SeedDrawer
        seed={selectedSeed}
        collection={selectedCollection}
        onClose={closeSeedDrawer}
      />
    </>
  );
}

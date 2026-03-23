'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Seed } from '@/lib/notion';

const COPY_FEEDBACK_MS = 2000;

const PILL_COLORS = [
  '#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A',
  '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D',
];

interface SeedDrawerProps {
  seed: Seed | null;
  collection: { name: string; color: string; image: string; description: string } | null;
  onClose: () => void;
}

export default function SeedDrawer({ seed, collection, onClose }: SeedDrawerProps) {
  const [active, setActive] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy Link');

  const closeRef = useRef<HTMLButtonElement>(null);
  const savedScrollRef = useRef(0);
  const closingViaPopstateRef = useRef(false);

  // Open / close animation + body scroll lock
  useEffect(() => {
    if (seed) {
      savedScrollRef.current = window.scrollY;
      requestAnimationFrame(() => setActive(true));
      document.body.style.overflow = 'hidden';

      // Deep link pushState
      history.pushState(
        { drawerOpen: true, seedId: seed.id },
        '',
        `${window.location.pathname}${window.location.search}#seed=${seed.id}`,
      );

      // Focus close button
      setTimeout(() => closeRef.current?.focus(), 100);
    } else {
      setActive(false);
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollRef.current);
    }
  }, [seed]);

  // Escape key
  useEffect(() => {
    if (!seed) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  // Browser back button
  useEffect(() => {
    const handlePopstate = () => {
      if (closingViaPopstateRef.current) {
        closingViaPopstateRef.current = false;
        return;
      }
      if (seed) handleClose(true);
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  });

  const handleClose = useCallback(
    (fromPopstate = false) => {
      setActive(false);
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollRef.current);

      if (!fromPopstate && window.location.hash.startsWith('#seed=')) {
        closingViaPopstateRef.current = true;
        history.back();
      }

      onClose();
    },
    [onClose],
  );

  const handleCopyLink = useCallback(() => {
    if (!seed) return;
    const deepLink = `${window.location.origin}${window.location.pathname}#seed=${seed.id}`;
    navigator.clipboard.writeText(deepLink).then(() => {
      setCopyLabel('Link copied!');
      setTimeout(() => setCopyLabel('Copy Link'), COPY_FEEDBACK_MS);
    });
  }, [seed]);

  if (!seed) return null;

  const accentColor = collection?.color || '#2D7A3A';
  const creatorName = seed.creator || '';
  const initial = creatorName ? creatorName.charAt(0).toUpperCase() : 'S';

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay${active ? ' active' : ''}`}
        onClick={() => handleClose()}
      />

      {/* Drawer panel */}
      <aside
        className={`drawer${active ? ' active' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-seed-name"
        style={{ '--drawer-accent': accentColor } as React.CSSProperties}
      >
        {/* Header */}
        <div className="drawer-header">
          <span className="drawer-header-title">Seed Details</span>
          <div className="drawer-header-actions">
            <button
              ref={closeRef}
              className="drawer-close"
              aria-label="Close"
              onClick={() => handleClose()}
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Seed name */}
          <div className="drawer-app-name-row">
            <h2 id="drawer-seed-name" className="drawer-app-name">
              {seed.name}
            </h2>
          </div>

          {/* Creator */}
          {(creatorName || true) && (
            <div className="drawer-creator">
              <span
                className="drawer-creator-avatar"
                style={{ backgroundColor: accentColor }}
              >
                {initial}
              </span>
              <div className="drawer-creator-info">
                <span className="drawer-creator-name">
                  {creatorName || 'Seed Template'}
                </span>
                <span className="drawer-creator-role">Starter Template</span>
              </div>
            </div>
          )}

          {/* What is a Seed? explainer */}
          <div className="drawer-seed-explainer">
            <div className="drawer-seed-explainer-header">
              <span className="drawer-seed-explainer-icon">&#127793;</span>
              <span className="drawer-seed-explainer-title">
                What does it mean to plant a seed?
              </span>
            </div>
            <p className="drawer-seed-explainer-text">
              Seeds are starter templates, not finished apps. When you plant one,
              you get your own copy to customize with your curriculum, your
              students&apos; needs, and your teaching style. Think of it as a head
              start, not a final product.
            </p>
          </div>

          {/* About */}
          {seed.description && (
            <div className="drawer-seed-about">
              <div className="drawer-section-label">About</div>
              <p className="drawer-desc">{seed.description}</p>
            </div>
          )}

          {/* Collection badge */}
          {collection && (
            <div className="drawer-seed-collection-section">
              <div className="drawer-section-label">Collection</div>
              <div className="drawer-seed-collection-badge">
                {collection.image && (
                  <img
                    src={`/${collection.image}`}
                    alt=""
                    width={36}
                    height={36}
                  />
                )}
                <div>
                  <div className="drawer-seed-collection-name">
                    {collection.name}
                  </div>
                  {collection.description && (
                    <div className="drawer-seed-collection-desc">
                      {collection.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {seed.tags && seed.tags.length > 0 && (
            <div className="drawer-seed-tags">
              <div className="drawer-section-label">Tags</div>
              <div className="drawer-collection-pills">
                {seed.tags.map((tag, i) => {
                  const color = PILL_COLORS[i % PILL_COLORS.length];
                  return (
                    <span
                      key={tag}
                      className="drawer-collection-pill"
                      style={{
                        background: `${color}20`,
                        color: color,
                        borderColor: `${color}40`,
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="drawer-actions">
            <a
              href={seed.remixUrl}
              className="drawer-btn-primary"
              target="_blank"
              rel="noopener"
            >
              Plant this Seed &rarr;
            </a>
            <button className="drawer-btn-tertiary" onClick={handleCopyLink}>
              {copyLabel}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

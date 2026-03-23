'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { App } from '@/lib/notion';
import { formatNumber, generateFallbackDescription, generateImpactBlurb } from '@/lib/utils';
import { isStarred, toggleStar, loadStarCounts, getCachedStarCount } from '@/lib/stars';
import { useAdminMode, PasswordModal, AdminEditPanel } from './AdminPanel';
import { LucideIcon } from '@/lib/icons';

/* ==========================================
   AppDrawer — slide-in detail panel
   ========================================== */

const MAX_RELATED_APPS = 3;
const MAX_INITIALS = 2;
const COPY_FEEDBACK_MS = 2000;

const PILL_COLORS = [
  '#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A',
  '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D',
];

interface AppDrawerProps {
  app: App | null;
  allApps: App[];
  accentColor?: string;
  onClose: () => void;
}

export default function AppDrawer({
  app,
  allApps,
  accentColor,
  onClose,
}: AppDrawerProps) {
  const [active, setActive] = useState(false);
  const [starred, setStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [starAnimate, setStarAnimate] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy Link');
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentApp, setCurrentApp] = useState<App | null>(app);

  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const savedScrollRef = useRef(0);
  const closingViaPopstateRef = useRef(false);

  const { isAdmin, enterAdmin, exitAdmin } = useAdminMode();

  // Sync currentApp when prop changes
  useEffect(() => {
    setCurrentApp(app);
  }, [app]);

  // Open / close animation + body scroll lock
  useEffect(() => {
    if (currentApp) {
      savedScrollRef.current = window.scrollY;
      // Small delay so the CSS transition fires
      requestAnimationFrame(() => setActive(true));
      document.body.style.overflow = 'hidden';

      // Init star state
      setStarred(isStarred(currentApp.id));
      setStarCount(getCachedStarCount(currentApp.id));
      loadStarCounts([currentApp.id]).then((counts) => {
        if (counts[currentApp.id] != null) {
          setStarCount(counts[currentApp.id]);
        }
      });

      // Deep link pushState
      if (currentApp.id) {
        history.pushState(
          { drawerOpen: true, appId: currentApp.id },
          '',
          `${window.location.pathname}${window.location.search}#app=${currentApp.id}`,
        );
      }

      // Focus close button
      setTimeout(() => closeRef.current?.focus(), 100);

      // Trigger lucide icon rendering
      if (typeof window !== 'undefined' && 'lucide' in window) {
        setTimeout(() => {
          (window as unknown as { lucide: { createIcons: () => void } }).lucide.createIcons();
        }, 50);
      }
    } else {
      setActive(false);
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollRef.current);
    }
  }, [currentApp]);

  // Escape key
  useEffect(() => {
    if (!currentApp) return;
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
      if (currentApp) {
        handleClose(true);
      }
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  });

  const handleClose = useCallback(
    (fromPopstate = false) => {
      setActive(false);
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollRef.current);

      if (!fromPopstate && window.location.hash.startsWith('#app=')) {
        closingViaPopstateRef.current = true;
        history.back();
      }

      onClose();
    },
    [onClose],
  );

  // Refresh lucide icons whenever the panel content changes
  useEffect(() => {
    if (!currentApp) return;
    const t = setTimeout(() => {
      if ('lucide' in window) {
        (window as unknown as { lucide: { createIcons: () => void } }).lucide.createIcons();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [currentApp, isAdmin]);

  const handleStarClick = useCallback(() => {
    if (!currentApp) return;
    const { nowStarred, countPromise } = toggleStar(currentApp.id);
    setStarred(nowStarred);
    setStarAnimate(true);
    setTimeout(() => setStarAnimate(false), 600);
    countPromise.then((count) => {
      if (count != null) setStarCount(count);
    });
  }, [currentApp]);

  const handleCopyLink = useCallback(() => {
    if (!currentApp) return;
    const deepLink = `${window.location.origin}${window.location.pathname}#app=${currentApp.id}`;
    navigator.clipboard.writeText(deepLink).then(() => {
      setCopyLabel('Link copied!');
      setTimeout(() => setCopyLabel('Copy Link'), COPY_FEEDBACK_MS);
    });
  }, [currentApp]);

  const handleAdminToggle = useCallback(() => {
    if (isAdmin) {
      exitAdmin();
    } else {
      setShowPwModal(true);
    }
  }, [isAdmin, exitAdmin]);

  const handlePasswordSuccess = useCallback(
    (pwd: string) => {
      enterAdmin(pwd);
      setShowPwModal(false);
    },
    [enterAdmin],
  );

  const handleAppUpdated = useCallback(
    (fields: Partial<App>) => {
      if (!currentApp) return;
      setCurrentApp({ ...currentApp, ...fields });
    },
    [currentApp],
  );

  // Switch to a related app
  const openRelatedApp = useCallback((relApp: App) => {
    setActive(false);
    // Small delay so the transition resets
    setTimeout(() => {
      setCurrentApp(relApp);
    }, 50);
  }, []);

  // Don't render anything if no app
  if (!currentApp) return null;

  // Derived values
  const creatorName = currentApp.creator || '';
  const creatorRole = currentApp.role || 'Teacher';
  const initials = creatorName
    ? creatorName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, MAX_INITIALS)
    : '?';
  const showCreator = !!creatorName || isAdmin;
  const desc = generateFallbackDescription(currentApp);
  const usageContent = currentApp.usage || '';
  const iterations = currentApp.iterations || 0;
  const impactBlurb = currentApp.impact || generateImpactBlurb(iterations);
  const appUrl = currentApp.url || `https://playlab.ai/project/${currentApp.id}`;

  // Collection pill tag → id
  const tagToId = (tag: string) =>
    tag
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  // Related apps: scored by shared tags, top 3
  const relatedApps = (() => {
    if (!currentApp.tags || currentApp.tags.length === 0) return [];
    return allApps
      .filter((a) => a.id !== currentApp.id && a.tags && a.tags.length > 0)
      .map((a) => ({
        app: a,
        shared: a.tags.filter((t) => currentApp.tags.includes(t)).length,
      }))
      .filter((s) => s.shared > 0)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, MAX_RELATED_APPS)
      .map((s) => s.app);
  })();

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay${active ? ' active' : ''}`}
        onClick={() => handleClose()}
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        className={`drawer${active ? ' active' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-app-name"
        style={accentColor ? ({ '--drawer-accent': accentColor } as React.CSSProperties) : undefined}
      >
        {/* Header */}
        <div className="drawer-header">
          <span className="drawer-header-title">App Details</span>
          <div className="drawer-header-actions">
            <span
              className="drawer-star-count"
              data-app-id={currentApp.id}
            >
              &#9733; {starCount}
            </span>
            <button
              className={`admin-toggle${isAdmin ? ' admin-active' : ''}`}
              title={isAdmin ? 'Exit admin mode' : 'Enter admin mode'}
              aria-label="Toggle admin mode"
              onClick={handleAdminToggle}
            >
              <LucideIcon name="Lock" size={16} />
            </button>
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
          {/* App name + star */}
          <div className="drawer-app-name-row">
            <h2 id="drawer-app-name" className="drawer-app-name">
              {currentApp.name}
            </h2>
            <button
              className={`drawer-star-btn${starred ? ' starred' : ''}${starAnimate ? ' star-animate' : ''}`}
              data-app-id={currentApp.id}
              aria-label="Star this app"
              onClick={handleStarClick}
            >
              <span className="star-icon">{starred ? '\u2605' : '\u2606'}</span>
            </button>
          </div>

          {/* Creator */}
          {showCreator && (
            <div className="drawer-creator">
              <span className="drawer-creator-avatar">{initials}</span>
              <div className="drawer-creator-info">
                <span className="drawer-creator-name">
                  {creatorName || 'Unknown'}
                </span>
                <span className="drawer-creator-role">{creatorRole}</span>
              </div>
            </div>
          )}

          {/* About */}
          <div>
            <div className="drawer-section-label">About</div>
            <p className="drawer-desc">{desc}</p>
          </div>

          {/* How It's Being Used */}
          <div className="drawer-info-box">
            <div className="drawer-info-box-header">
              <LucideIcon name="BookOpen" size={20} />
              <span className="drawer-info-box-title">
                How It&apos;s Being Used
              </span>
            </div>
            <p
              className={`drawer-info-box-text${!usageContent ? ' drawer-info-box-placeholder' : ''}`}
            >
              {usageContent || 'Usage details coming soon'}
            </p>
          </div>

          {/* Impact */}
          <div className="drawer-info-box">
            <div className="drawer-info-box-header">
              <LucideIcon name="TrendingUp" size={20} />
              <span className="drawer-info-box-title">Impact</span>
            </div>
            <div className="drawer-impact-stats">
              <div className="drawer-stat">
                <LucideIcon name="Shuffle" size={16} />
                <span>{formatNumber(iterations)} remixes</span>
              </div>
            </div>
            {impactBlurb && (
              <p className="drawer-info-box-text">{impactBlurb}</p>
            )}
          </div>

          {/* Collection tags */}
          {currentApp.tags && currentApp.tags.length > 0 && (
            <div className="drawer-labels">
              <div className="drawer-section-label">Collections</div>
              <div className="drawer-collection-pills">
                {currentApp.tags.map((tag, i) => {
                  const color = PILL_COLORS[i % PILL_COLORS.length];
                  return (
                    <a
                      key={tag}
                      href={`/collection/${tagToId(tag)}`}
                      className="drawer-collection-pill"
                      style={{
                        background: `${color}20`,
                        color: color,
                        borderColor: `${color}40`,
                      }}
                    >
                      {tag}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin panel */}
          {isAdmin && (
            <div>
              <AdminEditPanel
                app={currentApp}
                onAppUpdated={handleAppUpdated}
              />
            </div>
          )}

          {/* Related apps */}
          {relatedApps.length > 0 && (
            <div>
              <div className="drawer-section-label">Related Apps</div>
              <div className="drawer-related-list">
                {relatedApps.map((r) => (
                  <div
                    key={r.id}
                    className="drawer-related-item"
                    data-app-id={r.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openRelatedApp(r)}
                  >
                    <div className="drawer-related-name">{r.name}</div>
                    {r.creator && (
                      <div className="drawer-related-creator">
                        {r.creator}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="drawer-actions">
            <a
              href={appUrl}
              className="drawer-btn-primary"
              target="_blank"
              rel="noopener"
            >
              Open in Playlab &rarr;
            </a>
            <a
              href={`https://playlab.ai/remix/${currentApp.id}`}
              className="drawer-btn-secondary"
              target="_blank"
              rel="noopener"
            >
              Remix this App
            </a>
            <button className="drawer-btn-tertiary" onClick={handleCopyLink}>
              {copyLabel}
            </button>
          </div>
        </div>
      </aside>

      {/* Password modal */}
      {showPwModal && (
        <PasswordModal
          onSuccess={handlePasswordSuccess}
          onCancel={() => setShowPwModal(false)}
        />
      )}
    </>
  );
}

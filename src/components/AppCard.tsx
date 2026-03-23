'use client';

import { useState, useCallback } from 'react';
import type { App } from '@/lib/notion';
import StarButton from './StarButton';

const MAX_PREVIEW_TAGS = 3;
const MAX_INITIALS = 2;
const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;
const ADMIN_PWD_KEY = 'playlab-admin-pwd';

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

function countMissingFields(app: App): { count: number; fields: string[] } {
  const missing: string[] = [];
  if (!app.creator) missing.push('creator');
  if (!app.description || !app.description.trim()) missing.push('description');
  if (!app.usage || !app.usage.trim()) missing.push('usage');
  if (!app.impact || !app.impact.trim()) missing.push('impact');
  return { count: missing.length, fields: missing };
}

interface AppCardProps {
  app: App;
  accentColor: string;
  isAdmin?: boolean;
  onOpenApp: (app: App) => void;
  onPin?: (app: App) => void;
  isSelected?: boolean;
  onToggleSelect?: (appId: string) => void;
}

export default function AppCard({
  app,
  accentColor,
  isAdmin = false,
  onOpenApp,
  onPin,
  isSelected = false,
  onToggleSelect,
}: AppCardProps) {
  const [pinning, setPinning] = useState(false);

  const desc = generateFallbackDescription(app);
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator ? getInitials(app.creator) : 'P';
  const tagsPills = app.tags && app.tags.length > 0 ? app.tags.slice(0, MAX_PREVIEW_TAGS) : [];
  const extraTags = app.tags ? app.tags.length - MAX_PREVIEW_TAGS : 0;

  const missing = isAdmin ? countMissingFields(app) : { count: 0, fields: [] as string[] };

  const handleClick = useCallback(() => {
    onOpenApp(app);
  }, [app, onOpenApp]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenApp(app);
      }
    },
    [app, onOpenApp],
  );

  const handlePin = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (onPin) {
        onPin(app);
        return;
      }

      // Fallback: call API directly
      const newPinned = !app.pinned;
      setPinning(true);
      const collectionName = app.tags && app.tags.length > 0 ? app.tags[0] : '';
      try {
        const password = sessionStorage.getItem(ADMIN_PWD_KEY) || '';
        const res = await fetch('/api/admin-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password,
            appName: app.name,
            pinned: newPinned,
            collectionName,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert('Pin failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert('Pin failed: ' + message);
      } finally {
        setPinning(false);
      }
    },
    [app, onPin],
  );

  return (
    <div
      className={`app-card${isAdmin && missing.count > 0 ? ' admin-missing' : ''}${isSelected ? ' bulk-selected' : ''}`}
      data-app-id={app.id}
      tabIndex={0}
      role="button"
      aria-label={`View ${app.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ '--collection-accent': accentColor } as React.CSSProperties}
    >
      {/* Bulk select checkbox (admin mode) */}
      {isAdmin && onToggleSelect && (
        <input
          type="checkbox"
          className="bulk-select-checkbox"
          checked={isSelected}
          aria-label={`Select ${app.name}`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(app.id);
          }}
        />
      )}

      {/* Admin missing-fields dot */}
      {isAdmin && missing.count > 0 && (
        <span
          className="admin-missing-dot"
          title={`Missing: ${missing.fields.join(', ')}`}
        >
          {missing.count}
        </span>
      )}

      {/* Admin pin button */}
      {isAdmin && (
        <button
          className={`admin-pin-card-btn${app.pinned ? ' pinned' : ''}`}
          data-app-name={app.name}
          data-collection-name={app.tags && app.tags.length > 0 ? app.tags[0] : ''}
          title={app.pinned ? 'Unpin' : 'Pin'}
          aria-label={app.pinned ? 'Unpin' : 'Pin'}
          onClick={handlePin}
          disabled={pinning}
        >
          {app.pinned ? '\u{1F4CC}' : '\u{1F4CD}'}
        </button>
      )}

      {/* Star button */}
      <StarButton appId={app.id} />

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

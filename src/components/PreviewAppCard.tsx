'use client';

import { useState, useCallback, useRef } from 'react';
import type { App } from '@/lib/notion';
import StarButton from './StarButton';
import QuickEditPopover from './QuickEditPopover';
import { MAX_PREVIEW_TAGS, truncate, generateFallbackDescription, getInitials, countMissingFields } from '@/lib/card-utils';

interface PreviewAppCardProps {
  app: App;
  isAdmin?: boolean;
  onOpenApp: (app: App) => void;
}

export default function PreviewAppCard({
  app,
  isAdmin = false,
  onOpenApp,
}: PreviewAppCardProps) {

  const desc = generateFallbackDescription(app);
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator ? getInitials(app.creator) : 'P';
  const tags = app.tags || [];
  const shownTags = tags.slice(0, MAX_PREVIEW_TAGS);
  const extraCount = tags.length - MAX_PREVIEW_TAGS;

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

  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleQuickEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowQuickEdit(true);
  }, []);

  const cardClasses = [
    'preview-app-card',
    isAdmin && missing.count > 0 ? 'admin-missing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const descText =
    isAdmin && (!app.description || !app.description.trim())
      ? ''
      : truncate(desc, 100);

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      data-app-id={app.id}
      tabIndex={0}
      role="button"
      aria-label={`View ${app.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative' }}
    >
      {/* Admin quick-edit pencil */}
      {isAdmin && missing.count > 0 && (
        <button
          className="quick-edit-trigger"
          title={`Edit missing: ${missing.fields.join(', ')}`}
          aria-label="Quick edit"
          onClick={handleQuickEdit}
        >
          ✏️
        </button>
      )}

      {/* Star button */}
      <StarButton appId={app.id} />

      <div className="app-card-creator">
        <span className="app-card-avatar">{initials}</span>
        {creatorName}
      </div>
      <div className="preview-app-card-name">{app.name}</div>
      <div className="preview-app-card-desc">
        {descText || (
          isAdmin ? (
            <em style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Needs description
            </em>
          ) : (
            truncate(desc, 100)
          )
        )}
      </div>
      {shownTags.length > 0 && (
        <div className="app-card-tags">
          {shownTags.slice(0, 2).map((t) => (
            <span key={t} className="app-tag">{t}</span>
          ))}
          {shownTags.length > 2 && (
            <span className="app-tag app-tag--more">+{shownTags.length - 2}</span>
          )}
        </div>
      )}

      {/* Quick Edit Popover */}
      {showQuickEdit && cardRef.current && (
        <QuickEditPopover
          app={app}
          anchorRect={cardRef.current.getBoundingClientRect()}
          onClose={() => setShowQuickEdit(false)}
        />
      )}
    </div>
  );
}

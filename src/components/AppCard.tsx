'use client';

import { useState, useCallback, useRef } from 'react';
import type { App } from '@/lib/notion';
import StarButton from './StarButton';
import QuickEditPopover from './QuickEditPopover';
import { MAX_PREVIEW_TAGS, shortDesc, generateFallbackDescription, getInitials, countMissingFields } from '@/lib/card-utils';

interface AppCardProps {
  app: App;
  accentColor: string;
  isAdmin?: boolean;
  onOpenApp: (app: App) => void;
}

export default function AppCard({
  app,
  accentColor,
  isAdmin = false,
  onOpenApp,
}: AppCardProps) {
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

  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleQuickEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowQuickEdit(true);
  }, []);

  const cardClasses = [
    'app-card',
    isAdmin && missing.count > 0 ? 'admin-missing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const descText =
    isAdmin && (!app.description || !app.description.trim())
      ? ''
      : shortDesc(desc);

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
      style={{ '--collection-accent': accentColor } as React.CSSProperties}
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

      <div className="app-card-body">
        <div className="app-card-creator">
          <span className="app-card-avatar" style={{ backgroundColor: accentColor }}>
            {initials}
          </span>
          {creatorName}
        </div>
        <div className="app-card-name">{app.name}</div>
        <div className="app-card-desc">
          {descText || (
            isAdmin ? (
              <em style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Needs description
              </em>
            ) : (
              shortDesc(desc)
            )
          )}
        </div>
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

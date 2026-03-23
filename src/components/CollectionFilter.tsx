'use client';

import { useState, useMemo } from 'react';

interface AppData {
  id: string;
  name: string;
  description: string;
  url: string;
  creator: string;
  role: string;
  sessions: number;
  tags: string[];
}

export default function CollectionFilter({
  apps,
  accentColor,
}: {
  apps: AppData[];
  accentColor: string;
}) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Collect all unique tags across apps
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const app of apps) {
      for (const tag of app.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [apps]);

  // Filter apps
  const filtered = useMemo(() => {
    let result = apps;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.creator.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      );
    }
    if (selectedTag) {
      result = result.filter((a) => a.tags?.includes(selectedTag));
    }
    return result;
  }, [apps, search, selectedTag]);

  return (
    <>
      {/* Filter bar */}
      <div className="collection-grid-header">
        <h2 className="collection-grid-title">
          {filtered.length} app{filtered.length !== 1 ? 's' : ''}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="collection-search-container">
            <svg
              className="collection-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="collection-search-input"
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="search-clear visible"
                onClick={() => setSearch('')}
              >
                &times;
              </button>
            )}
          </div>
          {allTags.length > 0 && (
            <select
              className="filter-dropdown-btn"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* App cards grid */}
      <div className="apps-grid">
        {filtered.map((app) => (
          <a
            key={app.id}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="app-card"
            style={{ '--collection-accent': accentColor } as React.CSSProperties}
          >
            <div className="app-card-body">
              <div className="app-card-creator">
                <span
                  className="app-card-avatar"
                  style={{ backgroundColor: accentColor }}
                >
                  {(app.creator || '?').charAt(0).toUpperCase()}
                </span>
                {app.creator}
              </div>
              <div className="app-card-name">{app.name}</div>
              <div className="app-card-desc">
                {app.description
                  ? app.description.length > 120
                    ? app.description.slice(0, 120) + '...'
                    : app.description
                  : ''}
              </div>
              <div className="app-card-meta">
                {app.sessions > 0 && (
                  <span className="app-badge">{app.sessions} sessions</span>
                )}
              </div>
              {app.tags && app.tags.length > 0 && (
                <div className="app-card-tags">
                  {app.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="app-tag">
                      {tag}
                    </span>
                  ))}
                  {app.tags.length > 3 && (
                    <span className="app-tag app-tag--more">
                      +{app.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-body" style={{ textAlign: 'center', opacity: 0.6, padding: '48px 0' }}>
          No apps match your search.
        </p>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import type { SeedCollection } from '@/lib/notion';

interface SeedsClientProps {
  seedCollections: SeedCollection[];
}

export default function SeedsClient({ seedCollections }: SeedsClientProps) {
  const [search, setSearch] = useState('');

  const filtered = seedCollections
    .map((sc) => ({
      ...sc,
      apps: sc.apps.filter((seed) =>
        seed.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((sc) => sc.apps.length > 0);

  return (
    <div className="container section">
      {/* Search */}
      <div style={{ marginBottom: 32 }}>
        <input
          className="form-input"
          type="text"
          placeholder="Search seeds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {filtered.map((sc) => (
        <div
          key={sc.id}
          className="seed-collection-section"
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
                <h2 className="seed-collection-title">{sc.name}</h2>
                <span className="seed-collection-count">
                  {sc.apps.length} seed{sc.apps.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          {sc.description && (
            <p className="seed-collection-desc">{sc.description}</p>
          )}
          <div className="seeds-grid">
            {sc.apps.map((seed) => (
              <a
                key={seed.name}
                href={seed.remixUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-card"
                style={
                  { '--collection-accent': sc.color } as React.CSSProperties
                }
              >
                <div className="app-card-body">
                  <div className="app-card-creator">
                    <span
                      className="app-card-avatar"
                      style={{ backgroundColor: sc.color }}
                    >
                      {seed.creator
                        ? seed.creator.charAt(0).toUpperCase()
                        : 'S'}
                    </span>
                    {seed.creator || 'Seed App'}
                  </div>
                  <div className="app-card-name">{seed.name}</div>
                  <div className="app-card-desc">{seed.description}</div>
                  {seed.tags && seed.tags.length > 0 && (
                    <div className="app-card-tags">
                      {seed.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="app-tag">
                          {tag}
                        </span>
                      ))}
                      {seed.tags.length > 2 && (
                        <span className="app-tag app-tag--more">
                          +{seed.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="app-card-cta">Plant this seed &rarr;</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="seeds-empty">
          <div className="seeds-empty-icon">&#127793;</div>
          <h3>
            {search ? 'No seeds match your search' : 'Seeds are sprouting'}
          </h3>
          <p>
            {search
              ? 'Try a different search term.'
              : 'Check back soon for starter templates you can remix.'}
          </p>
        </div>
      )}
    </div>
  );
}

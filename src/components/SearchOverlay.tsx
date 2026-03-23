'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Collection, App } from '@/lib/notion';

const SEARCH_DEBOUNCE_MS = 300;
const MAX_COLLECTION_RESULTS = 4;
const MAX_APP_RESULTS = 6;

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '\u2026';
}

interface SearchOverlayProps {
  collections: Collection[];
  onOpenApp: (app: App) => void;
}

export default function SearchOverlay({ collections, onOpenApp }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [collectionResults, setCollectionResults] = useState<Collection[]>([]);
  const [appResults, setAppResults] = useState<App[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalItems = collectionResults.length + appResults.length;

  const performSearch = useCallback(async (q: string) => {
    if (!q) {
      setCollectionResults([]);
      setAppResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    // Search collections client-side
    const lower = q.toLowerCase();
    const matchedCollections = collections
      .filter((col) => col.name.toLowerCase().includes(lower))
      .slice(0, MAX_COLLECTION_RESULTS);

    // Search apps via API
    let matchedApps: App[] = [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        matchedApps = (data.results || []).slice(0, MAX_APP_RESULTS);
      }
    } catch {
      // ignore
    }

    setCollectionResults(matchedCollections);
    setAppResults(matchedApps);
    setActiveIndex(-1);
    setLoading(false);
  }, [collections]);

  const hideResults = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setCollectionResults([]);
      setAppResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => performSearch(value.trim()), SEARCH_DEBOUNCE_MS);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setCollectionResults([]);
    setAppResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideResults();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        // Click the active item
        const items = containerRef.current?.querySelectorAll('.search-dropdown-item');
        if (items && items[activeIndex]) {
          (items[activeIndex] as HTMLElement).click();
        }
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = query.trim();
      if (q) performSearch(q);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen || totalItems === 0) return;
      setActiveIndex((prev) => {
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        let next = prev + dir;
        if (next < 0) next = totalItems - 1;
        if (next >= totalItems) next = 0;
        return next;
      });
    }
  }, [activeIndex, isOpen, totalItems, query, performSearch, hideResults]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        hideResults();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isOpen, hideResults]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    const items = containerRef.current?.querySelectorAll('.search-dropdown-item');
    if (items && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const hasResults = collectionResults.length > 0 || appResults.length > 0;
  let itemCounter = 0;

  return (
    <div className="search-container" ref={containerRef}>
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
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder="Search collections, apps, and builders..."
        aria-label="Search collections, apps, and builders"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className={`search-clear${query.length > 0 ? ' visible' : ''}`}
        aria-label="Clear search"
        onClick={handleClear}
      >
        &#10005;
      </button>

      {isOpen && (
        <div className={`search-dropdown${isOpen ? ' open' : ''}`}>
          {loading && (
            <div className="search-dropdown-loading">Searching...</div>
          )}
          {!loading && !hasResults && (
            <div className="search-dropdown-empty">No results found</div>
          )}
          {!loading && hasResults && (
            <>
              {collectionResults.length > 0 && (
                <>
                  <div className="search-dropdown-section-label">Collections</div>
                  {collectionResults.map((col) => {
                    const idx = itemCounter++;
                    return (
                      <Link
                        key={col.id}
                        href={`/collection/${col.id}`}
                        className={`search-dropdown-item search-dropdown-collection${idx === activeIndex ? ' kb-active' : ''}`}
                        onClick={() => hideResults()}
                      >
                        <div className="search-dropdown-name">{col.name}</div>
                        <div className="search-dropdown-desc">
                          {truncate(col.description || `${col.appCount} apps`, 80)}
                        </div>
                      </Link>
                    );
                  })}
                </>
              )}
              {appResults.length > 0 && (
                <>
                  <div className="search-dropdown-section-label">Apps &amp; Builders</div>
                  {appResults.map((app) => {
                    const idx = itemCounter++;
                    return (
                      <div
                        key={app.id}
                        className={`search-dropdown-item${idx === activeIndex ? ' kb-active' : ''}`}
                        onClick={() => {
                          onOpenApp(app);
                          hideResults();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenApp(app);
                            hideResults();
                          }
                        }}
                      >
                        <div className="search-dropdown-name">{app.name}</div>
                        {app.creator && (
                          <div className="search-dropdown-creator">by {app.creator}</div>
                        )}
                        <div className="search-dropdown-desc">
                          {truncate(app.description || '', 80)}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

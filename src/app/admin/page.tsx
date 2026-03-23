'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LucideIcon } from '@/lib/icons';

const ADMIN_PWD_KEY = 'playlab-admin-pwd';

const FIELD_FILTERS = ['description', 'usage', 'impact', 'creator'] as const;
type FieldFilter = (typeof FIELD_FILTERS)[number];

interface MissingApp {
  name: string;
  id: string;
  sessions: number;
  creator: string;
  url: string;
  missing: string[];
  collections: string[];
}

/* ---- Password Modal (inline, matches AdminPanel style) ---- */

function PasswordModal({
  onSuccess,
}: {
  onSuccess: (pwd: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const submit = useCallback(() => {
    const pwd = value.trim();
    if (!pwd) {
      setError('Please enter a password');
      inputRef.current?.focus();
      return;
    }
    onSuccess(pwd);
  }, [value, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') submit();
      setError('');
    },
    [submit],
  );

  return (
    <div className="admin-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-pw-modal" style={{ position: 'relative' }}>
        <div className="admin-pw-header">
          <div className="admin-pw-icon">
            <LucideIcon name="Lock" size={20} />
          </div>
          <h3 className="admin-pw-title">Admin Dashboard</h3>
          <p className="admin-pw-subtitle">Enter the admin password to continue</p>
        </div>
        <div className="admin-pw-body">
          <input
            ref={inputRef}
            type="password"
            className="admin-pw-input"
            placeholder="Password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="admin-pw-error">{error}</p>
        </div>
        <div className="admin-pw-actions">
          <Link href="/" className="admin-pw-cancel" style={{ textDecoration: 'none' }}>
            Back to Home
          </Link>
          <button className="admin-pw-submit" onClick={submit}>
            <LucideIcon name="Unlock" size={14} />
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Main Dashboard ---- */

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [apps, setApps] = useState<MissingApp[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFieldFilters, setActiveFieldFilters] = useState<Set<FieldFilter>>(new Set());

  // Check for existing session
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_PWD_KEY);
    if (stored) {
      setPassword(stored);
      setAuthenticated(true);
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (!authenticated || !password) return;
    setLoading(true);
    setError('');

    fetch(`/api/admin-missing?password=${encodeURIComponent(password)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch');
        }
        return res.json();
      })
      .then((data) => {
        setApps(data.apps);
        setTotalApps(data.totalApps);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        if (err.message === 'Invalid password') {
          setAuthenticated(false);
          sessionStorage.removeItem(ADMIN_PWD_KEY);
        }
      });
  }, [authenticated, password]);

  const handleAuth = useCallback((pwd: string) => {
    sessionStorage.setItem(ADMIN_PWD_KEY, pwd);
    sessionStorage.setItem('playlab-admin-mode', 'true');
    setPassword(pwd);
    setAuthenticated(true);
  }, []);

  const toggleFieldFilter = useCallback((field: FieldFilter) => {
    setActiveFieldFilters((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const filteredApps = useMemo(() => {
    if (activeFieldFilters.size === 0) return apps;
    return apps.filter((app) =>
      [...activeFieldFilters].some((f) => app.missing.includes(f))
    );
  }, [apps, activeFieldFilters]);

  if (!authenticated) {
    return <PasswordModal onSuccess={handleAuth} />;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div className="container">
          <Link href="/" style={{ color: 'var(--cream)', opacity: 0.7, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <LucideIcon name="arrow-left" size={14} />
            Back to Gardens
          </Link>
          <h1>Missing Fields Dashboard</h1>
          <p>Apps that need attention — sorted by session count (highest traffic first)</p>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-value">{apps.length}</span>
              <span className="admin-stat-label">Apps missing fields</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{totalApps}</span>
              <span className="admin-stat-label">Total apps</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">
                {totalApps > 0 ? Math.round(((totalApps - apps.length) / totalApps) * 100) : 0}%
              </span>
              <span className="admin-stat-label">Complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container section">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            Loading apps...
          </p>
        ) : error ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--orange)' }}>
            Error: {error}
          </p>
        ) : (
          <>
            <div className="admin-filters">
              {FIELD_FILTERS.map((field) => (
                <button
                  key={field}
                  className={`admin-filter-btn${activeFieldFilters.has(field) ? ' active' : ''}`}
                  onClick={() => toggleFieldFilter(field)}
                >
                  Missing {field}
                </button>
              ))}
              {activeFieldFilters.size > 0 && (
                <button
                  className="admin-filter-btn"
                  onClick={() => setActiveFieldFilters(new Set())}
                >
                  Clear filters
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Showing {filteredApps.length} of {apps.length} apps
              </span>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>App Name</th>
                    <th>Sessions</th>
                    <th>Missing Fields</th>
                    <th>Collections</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => {
                    // Build deep link to first collection
                    const collectionSlug = app.collections[0]
                      ? app.collections[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      : '';
                    const deepLink = collectionSlug
                      ? `/collection/${collectionSlug}#app=${app.id}`
                      : '#';

                    return (
                      <tr key={app.id}>
                        <td>
                          <a href={deepLink} target="_blank" rel="noopener noreferrer">
                            {app.name}
                          </a>
                        </td>
                        <td>{app.sessions.toLocaleString()}</td>
                        <td>
                          {app.missing.map((field) => (
                            <span key={field} className="admin-missing-badge">
                              {field}
                            </span>
                          ))}
                        </td>
                        <td>
                          {app.collections.map((col) => (
                            <span key={col} className="admin-collection-badge">
                              {col}
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredApps.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        {activeFieldFilters.size > 0
                          ? 'No apps match the selected filters'
                          : 'All apps have complete fields!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

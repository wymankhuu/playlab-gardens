'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getTagColor } from '@/lib/tagColors';

interface MissingApp {
  name: string;
  id: string;
  sessions: number;
  creator: string;
  url: string;
  missing: string[];
  collections: string[];
}

interface AdminMissingFieldsProps {
  password: string;
  onOpenApp?: (appId: string, collectionId: string) => void;
}

const FIELD_FILTERS = ['description', 'usage', 'impact', 'creator'] as const;

export default function AdminMissingFields({ password, onOpenApp }: AdminMissingFieldsProps) {
  const [apps, setApps] = useState<MissingApp[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin-missing?password=${encodeURIComponent(password)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await res.json();
      setApps(data.apps || []);
      setTotalApps(data.totalApps || 0);
      setMissingCount(data.missingCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFilter = (field: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const filteredApps = activeFilters.size === 0
    ? apps
    : apps.filter((app) =>
        Array.from(activeFilters).every((f) => app.missing.includes(f))
      );

  const completionPct = totalApps > 0
    ? Math.round(((totalApps - missingCount) / totalApps) * 100)
    : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: '#888' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px', color: '#c62828', fontSize: '14px' }}>
        <AlertCircle size={18} />
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '16px 20px',
        backgroundColor: '#fff',
        border: '1px solid #e8e4dc',
        borderRadius: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#e65100' }}>{missingCount}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Apps missing fields</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2d2a26' }}>{totalApps}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Total apps</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b9e5a' }}>{completionPct}%</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Completion</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {FIELD_FILTERS.map((field) => {
          const active = activeFilters.has(field);
          return (
            <button
              key={field}
              onClick={() => toggleFilter(field)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: active ? '1px solid #e65100' : '1px solid #d4d0c8',
                backgroundColor: active ? '#fff3e0' : '#fff',
                color: active ? '#e65100' : '#2d2a26',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {field}
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button
            onClick={() => setActiveFilters(new Set())}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #d4d0c8',
              backgroundColor: '#fff',
              color: '#888',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e8e4dc',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e8e4dc', backgroundColor: '#f8f7f4' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>App Name</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#2d2a26', width: '80px' }}>Sessions</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>Missing Fields</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>Collections</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  {activeFilters.size > 0 ? 'No apps match the selected filters' : 'All apps have complete fields!'}
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => {
                    if (onOpenApp && app.collections.length > 0) {
                      const slug = app.collections[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      onOpenApp(app.id, slug);
                    }
                  }}
                  style={{
                    borderBottom: '1px solid #e8e4dc',
                    cursor: onOpenApp ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8f7f4';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#2d2a26' }}>{app.name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#888' }}>
                    {app.sessions.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {app.missing.map((field) => (
                        <span
                          key={field}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            backgroundColor: '#fff3e0',
                            color: '#e65100',
                            textTransform: 'capitalize',
                          }}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {app.collections.map((col) => {
                        const color = getTagColor(col);
                        return (
                          <span
                            key={col}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: color.bg,
                              color: color.text,
                            }}
                          >
                            {col}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
        Showing {filteredApps.length} of {missingCount} apps with missing fields
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

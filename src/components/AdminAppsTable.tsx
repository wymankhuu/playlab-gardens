'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { getTagColor } from '@/lib/tagColors';
import BulkTagModal from '@/components/BulkTagModal';

export interface AdminApp {
  notionId: string;
  name: string;
  id: string;
  creator: string;
  role: string;
  description: string;
  usage: string;
  impact: string;
  url: string;
  tags: string[];
  sessions: number;
  iterations: number;
  homepageHidden: boolean;
  collectionOrder: number;
  missing: string[];
}

interface AdminAppsTableProps {
  password: string;
  collections: string[];
  onOpenApp: (app: AdminApp) => void;
}

type SortField = 'name' | 'sessions';
type SortDir = 'asc' | 'desc';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  teacher: { bg: '#e8f5e9', text: '#2e7d32' },
  student: { bg: '#f3e5f5', text: '#7b1fa2' },
  coach: { bg: '#e3f2fd', text: '#1565c0' },
};

function getRoleBadge(role: string) {
  const key = (role || '').toLowerCase().trim();
  return ROLE_COLORS[key] || { bg: '#f0f0f0', text: '#666' };
}

export default function AdminAppsTable({ password, collections, onOpenApp }: AdminAppsTableProps) {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('sessions');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'addTag' | 'removeTag' | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        password,
        page: String(page),
        pageSize: '50',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (collectionFilter) params.set('collection', collectionFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin-apps?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      setApps(data.apps || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching apps:', err);
    } finally {
      setLoading(false);
    }
  }, [password, page, debouncedSearch, collectionFilter, statusFilter]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Reset selection on data change
  useEffect(() => {
    setSelected(new Set());
  }, [page, debouncedSearch, collectionFilter, statusFilter]);

  // Client-side sorting
  const sortedApps = [...apps].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a.sessions - b.sessions;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const toggleSelectAll = () => {
    if (selected.size === sortedApps.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedApps.map((a) => a.notionId)));
    }
  };

  const toggleSelect = (notionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(notionId)) next.delete(notionId);
      else next.add(notionId);
      return next;
    });
  };

  const handleBulkHideShow = async (action: 'hide' | 'show') => {
    if (selected.size === 0) return;
    try {
      const res = await fetch('/api/admin-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          notionIds: Array.from(selected),
          action,
        }),
      });
      if (res.ok) {
        setSelected(new Set());
        fetchApps();
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div>
      {/* Search & filters */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: '13px',
              border: '1px solid #d4d0c8',
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={collectionFilter}
          onChange={(e) => { setCollectionFilter(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            border: '1px solid #d4d0c8',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#2d2a26',
            cursor: 'pointer',
          }}
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            border: '1px solid #d4d0c8',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#2d2a26',
            cursor: 'pointer',
          }}
        >
          <option value="">All Status</option>
          <option value="missing">Missing Fields</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          marginBottom: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '13px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, color: '#1565c0' }}>
            {selected.size} selected
          </span>
          <button
            onClick={() => setBulkAction('addTag')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #6b9e5a',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Add Tag
          </button>
          <button
            onClick={() => setBulkAction('removeTag')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #e65100',
              backgroundColor: '#fff3e0',
              color: '#e65100',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Remove Tag
          </button>
          <button
            onClick={() => handleBulkHideShow('hide')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #c62828',
              backgroundColor: '#fce4ec',
              color: '#c62828',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Hide
          </button>
          <button
            onClick={() => handleBulkHideShow('show')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #1565c0',
              backgroundColor: '#e3f2fd',
              color: '#1565c0',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Show
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e8e4dc',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: '#888' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e4dc', backgroundColor: '#f8f7f4' }}>
                <th style={{ padding: '10px 14px', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={sortedApps.length > 0 && selected.size === sortedApps.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#2d2a26',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    App Name <SortIcon field="name" />
                  </span>
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>Role</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>Tags</th>
                <th
                  onClick={() => toggleSort('sessions')}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#2d2a26',
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '90px',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    Sessions <SortIcon field="sessions" />
                  </span>
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#2d2a26' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedApps.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                    No apps found
                  </td>
                </tr>
              ) : (
                sortedApps.map((app) => {
                  const isHidden = app.homepageHidden;
                  const roleBadge = getRoleBadge(app.role);
                  return (
                    <tr
                      key={app.notionId}
                      style={{
                        borderBottom: '1px solid #e8e4dc',
                        opacity: isHidden ? 0.6 : 1,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8f7f4';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(app.notionId)}
                          onChange={() => toggleSelect(app.notionId)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td
                        style={{ padding: '10px 14px', fontWeight: 500, color: '#2d2a26' }}
                        onClick={() => onOpenApp(app)}
                      >
                        {app.name}
                        {app.creator && (
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: 400 }}>
                            by {app.creator}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={() => onOpenApp(app)}>
                        {app.role && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.text,
                            textTransform: 'capitalize',
                          }}>
                            {app.role}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={() => onOpenApp(app)}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {app.tags.map((tag) => {
                            const color = getTagColor(tag);
                            return (
                              <span
                                key={tag}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  backgroundColor: color.bg,
                                  color: color.text,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td
                        style={{ padding: '10px 14px', textAlign: 'right', color: '#888' }}
                        onClick={() => onOpenApp(app)}
                      >
                        {app.sessions.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={() => onOpenApp(app)}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {isHidden && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: '#fce4ec',
                              color: '#c62828',
                            }}>
                              Hidden
                            </span>
                          )}
                          {app.missing.length > 0 && (
                            <span style={{
                              fontSize: '11px',
                              color: '#e65100',
                              fontWeight: 500,
                            }}>
                              {app.missing.length} missing
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px',
        fontSize: '13px',
        color: '#888',
      }}>
        <span>{total} total apps</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d4d0c8',
              backgroundColor: '#fff',
              color: page <= 1 ? '#ccc' : '#2d2a26',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            Prev
          </button>
          <span style={{ color: '#2d2a26' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d4d0c8',
              backgroundColor: '#fff',
              color: page >= totalPages ? '#ccc' : '#2d2a26',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Bulk tag modal */}
      {bulkAction && (
        <BulkTagModal
          action={bulkAction}
          selectedCount={selected.size}
          selectedNotionIds={Array.from(selected)}
          password={password}
          onComplete={() => {
            setBulkAction(null);
            setSelected(new Set());
            fetchApps();
          }}
          onClose={() => setBulkAction(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

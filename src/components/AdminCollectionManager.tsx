'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, GripVertical, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';

interface CollectionApp {
  notionId: string;
  name: string;
  sessions: number;
  homepageHidden: boolean;
  collectionOrder: number;
}

interface AdminCollectionManagerProps {
  password: string;
  collections: string[];
}

export default function AdminCollectionManager({ password, collections }: AdminCollectionManagerProps) {
  const [selectedCollection, setSelectedCollection] = useState(collections[0] || '');
  const [apps, setApps] = useState<CollectionApp[]>([]);
  const [originalApps, setOriginalApps] = useState<CollectionApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchApps = useCallback(async () => {
    if (!selectedCollection) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        password,
        collection: selectedCollection,
        pageSize: '200',
      });
      const res = await fetch(`/api/admin-apps?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      const fetched: CollectionApp[] = (data.apps || []).map((a: any) => ({
        notionId: a.notionId,
        name: a.name,
        sessions: a.sessions,
        homepageHidden: a.homepageHidden,
        collectionOrder: a.collectionOrder,
      }));

      // Sort by collectionOrder, then sessions desc
      fetched.sort((a, b) => {
        if (a.collectionOrder !== b.collectionOrder) return a.collectionOrder - b.collectionOrder;
        return b.sessions - a.sessions;
      });

      setApps(fetched);
      setOriginalApps(JSON.parse(JSON.stringify(fetched)));
      setHasChanges(false);
    } catch (err) {
      console.error('Error fetching collection apps:', err);
    } finally {
      setLoading(false);
    }
  }, [password, selectedCollection]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const visibleApps = apps.filter((a) => !a.homepageHidden);
  const hiddenApps = apps.filter((a) => a.homepageHidden);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...visibleApps];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    // Rebuild apps array: reordered visible + hidden
    setApps([...reordered, ...hiddenApps]);
    setHasChanges(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleHide = (notionId: string) => {
    setApps((prev) =>
      prev.map((a) =>
        a.notionId === notionId ? { ...a, homepageHidden: !a.homepageHidden } : a
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save order for visible apps
      const appOrder = visibleApps.map((app, i) => ({
        notionId: app.notionId,
        order: i + 1,
      }));

      // Save order
      const orderRes = await fetch('/api/admin-collection-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          collection: selectedCollection,
          appOrder,
        }),
      });
      if (!orderRes.ok) throw new Error('Failed to save order');

      // Save hidden state changes
      const hiddenChanged = apps.filter((app) => {
        const orig = originalApps.find((o) => o.notionId === app.notionId);
        return orig && orig.homepageHidden !== app.homepageHidden;
      });

      if (hiddenChanged.length > 0) {
        const hideRes = await fetch('/api/admin-hide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password,
            apps: hiddenChanged.map((a) => ({
              notionId: a.notionId,
              hidden: a.homepageHidden,
            })),
          }),
        });
        if (!hideRes.ok) throw new Error('Failed to update visibility');
      }

      setOriginalApps(JSON.parse(JSON.stringify(apps)));
      setHasChanges(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setApps(JSON.parse(JSON.stringify(originalApps)));
    setHasChanges(false);
  };

  return (
    <div>
      {/* Collection selector */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d4d0c8',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#2d2a26',
            cursor: 'pointer',
            fontWeight: 500,
            flex: '1 1 200px',
          }}
        >
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {hasChanges && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#6b9e5a',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Order'}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d4d0c8',
                backgroundColor: '#fff',
                color: '#2d2a26',
                fontSize: '13px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </>
        )}
      </div>

      {/* Summary */}
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
        {visibleApps.length} visible on homepage &middot; {hiddenApps.length} hidden
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: '#888' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Visible apps — draggable */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e8e4dc',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            {visibleApps.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No visible apps in this collection
              </div>
            ) : (
              visibleApps.map((app, index) => (
                <div
                  key={app.notionId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderBottom: index < visibleApps.length - 1 ? '1px solid #e8e4dc' : 'none',
                    cursor: 'grab',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8f7f4';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <GripVertical size={16} style={{ color: '#ccc', flexShrink: 0 }} />
                  <span style={{
                    width: '28px',
                    fontSize: '12px',
                    color: '#888',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#2d2a26' }}>
                    {app.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>
                    {app.sessions.toLocaleString()} sessions
                  </span>
                  <button
                    onClick={() => toggleHide(app.notionId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d4d0c8',
                      backgroundColor: '#fff',
                      color: '#888',
                      fontSize: '12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <EyeOff size={12} />
                    Hide
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Hidden apps */}
          {hiddenApps.length > 0 && (
            <div style={{
              border: '2px dashed #d4d0c8',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#888',
                backgroundColor: '#f8f7f4',
                borderBottom: '1px solid #e8e4dc',
              }}>
                Hidden Apps
              </div>
              {hiddenApps.map((app, index) => (
                <div
                  key={app.notionId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderBottom: index < hiddenApps.length - 1 ? '1px solid #e8e4dc' : 'none',
                    opacity: 0.6,
                  }}
                >
                  <span style={{ flex: 1, fontSize: '13px', color: '#2d2a26' }}>
                    {app.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>
                    {app.sessions.toLocaleString()} sessions
                  </span>
                  <button
                    onClick={() => toggleHide(app.notionId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #6b9e5a',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      fontSize: '12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={12} />
                    Show
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

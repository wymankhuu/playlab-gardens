'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getTagColor } from '@/lib/tagColors';

interface BulkTagModalProps {
  action: 'addTag' | 'removeTag';
  selectedCount: number;
  selectedNotionIds: string[];
  password: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function BulkTagModal({
  action,
  selectedCount,
  selectedNotionIds,
  password,
  onComplete,
  onClose,
}: BulkTagModalProps) {
  const [allTags, setAllTags] = useState<{ name: string; color: string }[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTags() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin-tags?password=${encodeURIComponent(password)}`);
        const data = await res.json();
        if (data.tags) setAllTags(data.tags);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTags();
  }, [password]);

  const filtered = search.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTags;

  async function handleConfirm() {
    if (!selectedTag) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          notionIds: selectedNotionIds,
          action: action === 'addTag' ? 'add' : 'remove',
          tag: selectedTag,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update tags');
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  }

  const actionLabel = action === 'addTag' ? 'Add' : 'Remove';
  const actionPreposition = action === 'addTag' ? 'to' : 'from';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          width: '420px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#2d2a26' }}>
            {actionLabel} Tag — {selectedCount} app{selectedCount !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirmation step */}
        {selectedTag ? (
          <div>
            <p style={{ fontSize: '14px', color: '#2d2a26', margin: '0 0 16px' }}>
              {actionLabel} &lsquo;{selectedTag}&rsquo; {actionPreposition} {selectedCount} app
              {selectedCount !== 1 ? 's' : ''}?
            </p>
            {error && (
              <p style={{ fontSize: '13px', color: '#c62828', margin: '0 0 12px' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setError(null);
                }}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d4d0c8',
                  background: '#fff',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: '#2d2a26',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: action === 'addTag' ? '#6b9e5a' : '#c62828',
                  color: '#fff',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {processing && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {processing ? 'Processing...' : `${actionLabel} Tag`}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags..."
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #d4d0c8',
                borderRadius: '8px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />

            {/* Tag list */}
            <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  No tags found
                </div>
              ) : (
                filtered.map((tag) => {
                  const color = getTagColor(tag.name);
                  return (
                    <button
                      key={tag.name}
                      onClick={() => setSelectedTag(tag.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textAlign: 'left',
                        borderRadius: '6px',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8f7f4';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: color.bg,
                          color: color.text,
                        }}
                      >
                        {tag.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

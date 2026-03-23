'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { getTagColor } from '@/lib/tagColors';

interface TagEditorProps {
  appNotionId: string;
  currentTags: string[];
  password: string;
  onTagsChanged: (newTags: string[]) => void;
}

export default function TagEditor({ appNotionId, currentTags, password, onTagsChanged }: TagEditorProps) {
  const [allTags, setAllTags] = useState<{ name: string; color: string }[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  async function addTag(tag: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, notionId: appNotionId, action: 'add', tag }),
      });
      if (res.ok) {
        const newTags = [...currentTags, tag];
        onTagsChanged(newTags);
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(tag: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, notionId: appNotionId, action: 'remove', tag }),
      });
      if (res.ok) {
        const newTags = currentTags.filter((t) => t !== tag);
        onTagsChanged(newTags);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
    } finally {
      setSaving(false);
    }
  }

  async function createAndAddTag(tagName: string) {
    const confirmed = window.confirm(
      `Create '${tagName}' as a new tag? This will create a new collection page on the site.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const createRes = await fetch('/api/admin-tags/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, tagName }),
      });
      if (!createRes.ok) {
        console.error('Failed to create tag');
        return;
      }
      await addTag(tagName);
      await fetchTags();
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setSaving(false);
      setSearch('');
    }
  }

  const availableTags = allTags
    .map((t) => t.name)
    .filter((t) => !currentTags.includes(t));

  const filtered = search.trim()
    ? availableTags.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : availableTags;

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());
  const showCreate = search.trim().length > 0 && !exactMatch;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Current tags as pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {currentTags.map((tag) => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: color.bg,
                color: color.text,
                whiteSpace: 'nowrap',
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  color: color.text,
                  opacity: 0.7,
                }}
                title={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </div>

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Add tag..."
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: '13px',
          border: '1px solid #d4d0c8',
          borderRadius: '6px',
          outline: 'none',
          backgroundColor: '#fff',
        }}
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '2px',
            backgroundColor: '#fff',
            border: '1px solid #d4d0c8',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#888' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              {filtered.map((tag) => {
                const color = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      addTag(tag);
                      setSearch('');
                    }}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      color: '#2d2a26',
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
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: color.bg,
                        color: color.text,
                      }}
                    >
                      {tag}
                    </span>
                  </button>
                );
              })}
              {showCreate && (
                <button
                  onClick={() => createAndAddTag(search.trim())}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    borderTop: filtered.length > 0 ? '1px solid #e8e4dc' : 'none',
                    background: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    color: '#6b9e5a',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8f7f4';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <Plus size={14} />
                  Create &quot;{search.trim()}&quot; as new tag
                </button>
              )}
              {filtered.length === 0 && !showCreate && (
                <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  No tags available
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

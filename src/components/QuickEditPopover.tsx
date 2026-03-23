'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { App } from '@/lib/notion';

const ADMIN_PWD_KEY = 'playlab-admin-pwd';

interface QuickEditPopoverProps {
  app: App;
  anchorRect: DOMRect;
  onClose: () => void;
  onSaved?: (updatedFields: Partial<App>) => void;
}

function getMissingFields(app: App): string[] {
  const missing: string[] = [];
  if (!app.creator) missing.push('creator');
  if (!app.description || !app.description.trim()) missing.push('description');
  if (!app.usage || !app.usage.trim()) missing.push('usage');
  if (!app.impact || !app.impact.trim()) missing.push('impact');
  return missing;
}

export default function QuickEditPopover({
  app,
  anchorRect,
  onClose,
  onSaved,
}: QuickEditPopoverProps) {
  const missingFields = getMissingFields(app);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [creator, setCreator] = useState(app.creator || '');
  const [description, setDescription] = useState(app.description || '');
  const [usage, setUsage] = useState(app.usage || '');
  const [impact, setImpact] = useState(app.impact || '');
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Save');

  // Position the popover
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const top = anchorRect.bottom + 8;
    let left = anchorRect.left;
    // Keep it within viewport
    if (left + 320 > window.innerWidth) {
      left = window.innerWidth - 330;
    }
    if (left < 10) left = 10;
    setPosition({ top, left });
  }, [anchorRect]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // Delay to avoid the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveLabel('Saving...');
    try {
      const password = sessionStorage.getItem(ADMIN_PWD_KEY) || '';
      const res = await fetch('/api/admin-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          appId: app.id,
          appName: app.name,
          creator: creator.trim(),
          role: app.role || '',
          description: description.trim(),
          usage: usage.trim(),
          impact: impact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Save failed: ' + (data.error || 'Unknown error'));
        setSaveLabel('Save');
        setSaving(false);
        return;
      }
      setSaveLabel('Saved!');
      if (onSaved) {
        onSaved({
          creator: creator.trim(),
          description: description.trim(),
          usage: usage.trim(),
          impact: impact.trim(),
        });
      }
      setTimeout(() => onClose(), 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Save failed: ' + message);
      setSaveLabel('Save');
      setSaving(false);
    }
  }, [app, creator, description, usage, impact, onClose, onSaved]);

  if (missingFields.length === 0) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="quick-edit-popover"
      style={{ top: position.top, left: position.left }}
    >
      <h4>Edit Missing Fields — {app.name}</h4>

      {missingFields.includes('creator') && (
        <div className="quick-edit-field">
          <label>Creator</label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
      )}

      {missingFields.includes('description') && (
        <div className="quick-edit-field">
          <label>Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this app do?"
          />
        </div>
      )}

      {missingFields.includes('usage') && (
        <div className="quick-edit-field">
          <label>How It&apos;s Being Used</label>
          <textarea
            rows={2}
            value={usage}
            onChange={(e) => setUsage(e.target.value)}
            placeholder="How are educators or students using this?"
          />
        </div>
      )}

      {missingFields.includes('impact') && (
        <div className="quick-edit-field">
          <label>Impact</label>
          <textarea
            rows={2}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            placeholder="What difference has this made?"
          />
        </div>
      )}

      <div className="quick-edit-actions">
        <button
          className="quick-edit-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saveLabel}
        </button>
        <button className="quick-edit-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

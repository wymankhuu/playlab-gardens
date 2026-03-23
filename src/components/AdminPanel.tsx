'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { App } from '@/lib/notion';
import { escapeHtml } from '@/lib/utils';
import { LucideIcon } from '@/lib/icons';
import TagEditor from './TagEditor';

/* ==========================================
   Admin Panel — edit fields, save, pin
   Renders inside the AppDrawer
   ========================================== */

interface AdminPanelProps {
  app: App;
  onAppUpdated: (updatedFields: Partial<App>) => void;
}

/** Session-storage keys */
const ADMIN_MODE_KEY = 'playlab-admin-mode';
const ADMIN_PWD_KEY = 'playlab-admin-pwd';

/* ---- Password Modal ---- */

function PasswordModal({
  onSuccess,
  onCancel,
}: {
  onSuccess: (pwd: string) => void;
  onCancel: () => void;
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
      if (e.key === 'Escape') onCancel();
      setError('');
    },
    [submit, onCancel],
  );

  return (
    <div
      className="admin-pw-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="admin-pw-modal">
        <div className="admin-pw-header">
          <div className="admin-pw-icon">
            <LucideIcon name="Lock" size={20} />
          </div>
          <h3 className="admin-pw-title">Admin Access</h3>
          <p className="admin-pw-subtitle">Enter the password to edit apps</p>
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
          <button className="admin-pw-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="admin-pw-submit" onClick={submit}>
            <LucideIcon name="Unlock" size={14} />
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Admin Panel (edit form) ---- */

function AdminEditPanel({ app, onAppUpdated }: AdminPanelProps) {
  const [creator, setCreator] = useState(app.creator || '');
  const [role, setRole] = useState(app.role || '');
  const [description, setDescription] = useState(app.description || '');
  const [usage, setUsage] = useState(app.usage || '');
  const [impact, setImpact] = useState(app.impact || '');
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Save to Database');
  const [pinning, setPinning] = useState(false);

  // Reset fields when app changes
  useEffect(() => {
    setCreator(app.creator || '');
    setRole(app.role || '');
    setDescription(app.description || '');
    setUsage(app.usage || '');
    setImpact(app.impact || '');
    setSaveLabel('Save to Database');
  }, [app.id, app.creator, app.role, app.description, app.usage, app.impact]);

  const getPassword = () => sessionStorage.getItem(ADMIN_PWD_KEY) || '';

  const handleSave = async () => {
    setSaving(true);
    setSaveLabel('Saving...');
    try {
      const res = await fetch('/api/admin-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: getPassword(),
          appId: app.id,
          appName: app.name,
          creator: creator.trim(),
          role: role.trim(),
          description: description.trim(),
          usage: usage.trim(),
          impact: impact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Save failed: ' + (data.error || 'Unknown error'));
        setSaveLabel('Save to Database');
        setSaving(false);
        return;
      }
      onAppUpdated({
        creator: creator.trim(),
        role: role.trim(),
        description: description.trim(),
        usage: usage.trim(),
        impact: impact.trim(),
      });
      setSaveLabel('Saved!');
      setTimeout(() => {
        setSaveLabel('Save to Database');
        setSaving(false);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Save failed: ' + message);
      setSaveLabel('Save to Database');
      setSaving(false);
    }
  };

  const handlePin = async () => {
    const newPinned = !app.pinned;
    setPinning(true);
    const collectionName =
      app.tags && app.tags.length > 0 ? app.tags[0] : '';
    try {
      const res = await fetch('/api/admin-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: getPassword(),
          appName: app.name,
          pinned: newPinned,
          collectionName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Pin failed: ' + (data.error || 'Unknown error'));
        setPinning(false);
        return;
      }
      onAppUpdated({ pinned: newPinned });
      setPinning(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Pin failed: ' + message);
      setPinning(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <LucideIcon name="PenLine" size={14} />
        <span>Edit App</span>
      </div>

      <button
        className={`admin-pin-drawer-btn${app.pinned ? ' pinned' : ''}`}
        onClick={handlePin}
        disabled={pinning}
        data-app-name={app.name}
        data-collection-name={
          app.tags && app.tags.length > 0 ? app.tags[0] : ''
        }
      >
        <LucideIcon name={app.pinned ? 'PinOff' : 'Pin'} size={14} />
        {pinning
          ? app.pinned
            ? 'Unpinning...'
            : 'Pinning...'
          : app.pinned
            ? 'Unpin from Homepage'
            : 'Pin to Homepage'}
      </button>

      <div className="admin-row">
        <div className="admin-field admin-field--half">
          <label className="admin-label" htmlFor="admin-creator">
            Creator
          </label>
          <input
            type="text"
            className="admin-input"
            id="admin-creator"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div className="admin-field admin-field--half">
          <label className="admin-label" htmlFor="admin-role">
            Role
          </label>
          <input
            type="text"
            className="admin-input"
            id="admin-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Teacher, Student, Coach"
          />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-label" htmlFor="admin-description">
          Description
        </label>
        <textarea
          className="admin-textarea"
          id="admin-description"
          rows={2}
          placeholder="What does this app do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="admin-field">
        <label className="admin-label" htmlFor="admin-usage">
          <LucideIcon name="BookOpen" size={12} />
          How It&apos;s Being Used
        </label>
        <textarea
          className="admin-textarea"
          id="admin-usage"
          rows={3}
          placeholder="How are educators or students using this?"
          value={usage}
          onChange={(e) => setUsage(e.target.value)}
        />
      </div>

      <div className="admin-field">
        <label className="admin-label" htmlFor="admin-impact">
          <LucideIcon name="TrendingUp" size={12} />
          Impact
        </label>
        <textarea
          className="admin-textarea"
          id="admin-impact"
          rows={3}
          placeholder="What difference has this made?"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
        />
      </div>

      {app.notionId && (
        <TagEditor
          appNotionId={app.notionId}
          currentTags={app.tags || []}
          password={sessionStorage.getItem(ADMIN_PWD_KEY) || ''}
          onTagsChanged={(newTags) => {
            onAppUpdated({ tags: newTags });
          }}
        />
      )}

      <div className="admin-actions">
        <button
          className="admin-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          <LucideIcon name="Save" size={14} />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

/* ---- Exported hook + components ---- */

export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_MODE_KEY) === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const enterAdmin = useCallback((pwd: string) => {
    sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
    sessionStorage.setItem(ADMIN_PWD_KEY, pwd);
    setIsAdmin(true);
  }, []);

  const exitAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_MODE_KEY);
    sessionStorage.removeItem(ADMIN_PWD_KEY);
    setIsAdmin(false);
  }, []);

  return { isAdmin, enterAdmin, exitAdmin };
}

export { PasswordModal, AdminEditPanel };
export default AdminEditPanel;

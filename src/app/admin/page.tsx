'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { App } from '@/lib/notion';
import AdminDashboard from '@/components/AdminDashboard';
import AppDrawer from '@/components/AppDrawer';
import { LucideIcon } from '@/lib/icons';

const ADMIN_PWD_KEY = 'playlab-admin-pwd';
const ADMIN_MODE_KEY = 'playlab-admin-mode';

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

  const submit = useCallback(async () => {
    const pwd = value.trim();
    if (!pwd) {
      setError('Please enter a password');
      inputRef.current?.focus();
      return;
    }
    // Validate password against the server
    try {
      const res = await fetch(`/api/admin-missing?password=${encodeURIComponent(pwd)}`);
      if (!res.ok) {
        setError('Invalid password');
        inputRef.current?.focus();
        return;
      }
      onSuccess(pwd);
    } catch {
      setError('Connection error');
      inputRef.current?.focus();
    }
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

/* ---- Helper: map admin app response to App type ---- */

function toApp(adminApp: Record<string, unknown>): App {
  return {
    id: (adminApp.id as string) || '',
    name: (adminApp.name as string) || '',
    description: (adminApp.description as string) || '',
    url: (adminApp.url as string) || '',
    creator: (adminApp.creator as string) || '',
    role: (adminApp.role as string) || '',
    usage: (adminApp.usage as string) || '',
    impact: (adminApp.impact as string) || '',
    sessions: (adminApp.sessions as number) || 0,
    iterations: (adminApp.iterations as number) || 0,
    tags: (adminApp.tags as string[]) || [],
    notionId: (adminApp.notionId as string) || '',
    homepageHidden: (adminApp.homepageHidden as boolean) || false,
    collectionOrder: (adminApp.collectionOrder as number) || 0,
  };
}

/* ---- Main Dashboard Page ---- */

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [drawerApp, setDrawerApp] = useState<App | null>(null);

  // Check for existing session
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_PWD_KEY);
    if (stored) {
      setPassword(stored);
      setAuthenticated(true);
    }
  }, []);

  const handleAuth = useCallback((pwd: string) => {
    sessionStorage.setItem(ADMIN_PWD_KEY, pwd);
    sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
    setPassword(pwd);
    setAuthenticated(true);
  }, []);

  const handleExitAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_PWD_KEY);
    sessionStorage.removeItem(ADMIN_MODE_KEY);
    setAuthenticated(false);
    setPassword('');
  }, []);

  const handleOpenApp = useCallback((app: Record<string, unknown>) => {
    setDrawerApp(toApp(app));
  }, []);

  const handleAppUpdated = useCallback((app: App, fields: Partial<App>) => {
    setDrawerApp((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  if (!authenticated) {
    return <PasswordModal onSuccess={handleAuth} />;
  }

  return (
    <>
      <AdminDashboard
        password={password}
        onOpenApp={handleOpenApp}
        onExitAdmin={handleExitAdmin}
      />
      <AppDrawer
        app={drawerApp}
        allApps={drawerApp ? [drawerApp] : []}
        onClose={() => setDrawerApp(null)}
        onAppUpdated={handleAppUpdated}
      />
    </>
  );
}

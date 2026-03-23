'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminMode } from './AdminPanel';

export default function AdminToolbar() {
  const { isAdmin, exitAdmin } = useAdminMode();
  const router = useRouter();
  const [missingCount, setMissingCount] = useState<number | null>(null);

  // Fetch missing-fields count when admin mode is active
  useEffect(() => {
    if (!isAdmin) return;
    const pwd = sessionStorage.getItem('playlab-admin-pwd') || '';
    if (!pwd) return;

    fetch(`/api/admin-missing?password=${encodeURIComponent(pwd)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.apps?.length === 'number') {
          setMissingCount(data.apps.length);
        }
      })
      .catch(() => {
        // Silently fail — stat is optional
      });
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleRefresh = () => {
    router.refresh();
  };

  const handleExport = () => {
    const pwd = sessionStorage.getItem('playlab-admin-pwd') || '';
    window.open(
      `/api/export-csv?password=${encodeURIComponent(pwd)}`,
      '_blank',
    );
  };

  const handleExit = () => {
    exitAdmin();
    router.refresh();
  };

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-label">
        <span className="admin-toolbar-dot" />
        Admin Mode
      </div>

      <div className="admin-toolbar-stat">
        {missingCount !== null ? (
          <Link href="/admin">{missingCount} apps missing fields</Link>
        ) : (
          <span>Loading stats...</span>
        )}
      </div>

      <div className="admin-toolbar-actions">
        <button className="admin-toolbar-btn" onClick={handleExport}>
          Export CSV
        </button>
        <button className="admin-toolbar-btn" onClick={handleRefresh}>
          Refresh Data
        </button>
        <Link href="/admin" className="admin-toolbar-btn">
          Dashboard
        </Link>
        <button
          className="admin-toolbar-btn admin-toolbar-btn--exit"
          onClick={handleExit}
        >
          Exit
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, FolderOpen, AlertCircle, RefreshCw, Download, LogOut } from 'lucide-react';
import AdminAppsTable from '@/components/AdminAppsTable';
import AdminCollectionManager from '@/components/AdminCollectionManager';
import AdminMissingFields from '@/components/AdminMissingFields';

type Tab = 'apps' | 'collections' | 'missing';

interface AdminDashboardProps {
  password: string;
  onOpenApp: (app: any) => void;
  onExitAdmin: () => void;
}

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'apps', label: 'Apps', icon: LayoutGrid },
  { key: 'collections', label: 'Collections', icon: FolderOpen },
  { key: 'missing', label: 'Missing Fields', icon: AlertCircle },
];

export default function AdminDashboard({ password, onOpenApp, onExitAdmin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('apps');
  const [collections, setCollections] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin-tags?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.tags) {
        setCollections(data.tags.map((t: { name: string }) => t.name));
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  }, [password]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/revalidate', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Refresh failed:', err);
      setRefreshing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#2d2a26' }}>
          Apps Manager
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={`/api/export-csv?password=${encodeURIComponent(password)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #d4d0c8',
              backgroundColor: '#fff',
              color: '#2d2a26',
              fontSize: '13px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Export CSV
          </a>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #d4d0c8',
              backgroundColor: '#fff',
              color: '#2d2a26',
              fontSize: '13px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={onExitAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #c62828',
              backgroundColor: '#fff',
              color: '#c62828',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            Exit Admin
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '2px solid #e8e4dc',
        marginBottom: '20px',
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                color: active ? '#2d2a26' : '#888',
                borderBottom: active ? '2px solid #6b9e5a' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'apps' && (
        <AdminAppsTable
          password={password}
          collections={collections}
          onOpenApp={onOpenApp}
        />
      )}
      {activeTab === 'collections' && (
        <AdminCollectionManager
          password={password}
          collections={collections}
        />
      )}
      {activeTab === 'missing' && (
        <AdminMissingFields
          password={password}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

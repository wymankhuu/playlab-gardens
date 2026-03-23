'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Collection, App } from '@/lib/notion';
import HomePage from '@/components/HomePage';
import AppDrawer from '@/components/AppDrawer';

interface HomePageClientProps {
  collections: Collection[];
}

export default function HomePageClient({ collections }: HomePageClientProps) {
  const [drawerApp, setDrawerApp] = useState<App | null>(null);

  // Flatten all apps for the drawer's related-apps feature
  const allApps = useMemo(() => {
    const map = new Map<string, App>();
    for (const col of collections) {
      for (const app of col.apps) {
        if (!map.has(app.id)) {
          map.set(app.id, app);
        }
      }
    }
    return [...map.values()];
  }, [collections]);

  const handleOpenApp = useCallback((app: App) => {
    setDrawerApp(app);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerApp(null);
    // Clean up hash if present
    if (window.location.hash.startsWith('#app=')) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <>
      <HomePage collections={collections} onOpenApp={handleOpenApp} />
      <AppDrawer
        app={drawerApp}
        allApps={allApps}
        onClose={handleCloseDrawer}
      />
    </>
  );
}

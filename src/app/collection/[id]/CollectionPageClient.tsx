'use client';

import { useState, useCallback } from 'react';
import type { Collection, App } from '@/lib/notion';
import CollectionPage from '@/components/CollectionPage';
import AppDrawer from '@/components/AppDrawer';

interface CollectionPageClientProps {
  collection: Collection;
}

export default function CollectionPageClient({ collection: initialCollection }: CollectionPageClientProps) {
  const [collection, setCollection] = useState(initialCollection);
  const [drawerApp, setDrawerApp] = useState<App | null>(null);

  const handleOpenApp = useCallback((app: App) => {
    setDrawerApp(app);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerApp(null);
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#app=')) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // When admin updates an app (pin/unpin, edit fields), update the collection state
  const handleAppUpdated = useCallback((app: App, fields: Partial<App>) => {
    setCollection((prev) => ({
      ...prev,
      apps: prev.apps.map((a) =>
        a.id === app.id ? { ...a, ...fields } : a
      ),
    }));
  }, []);

  return (
    <>
      <CollectionPage collection={collection} onOpenApp={handleOpenApp} />
      <AppDrawer
        app={drawerApp}
        allApps={collection.apps}
        accentColor={collection.iconColor}
        onClose={handleCloseDrawer}
        onAppUpdated={handleAppUpdated}
      />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollections, getCollection } from '@/lib/notion';
import CollectionPageClient from './CollectionPageClient';

// ---------------------------------------------------------------------------
// Static params — pre-render every collection page at build time
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((col) => ({ id: col.id }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata for SEO
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) {
    return { title: 'Collection Not Found | Playlab Gardens' };
  }
  const displayName = collection.name;
  const description =
    collection.description ||
    `Explore ${collection.appCount} apps in the ${displayName} collection.`;
  return {
    title: `${displayName} | Playlab Gardens`,
    description,
    openGraph: {
      title: `${displayName} | Playlab Gardens`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | Playlab Gardens`,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------
export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [collection, allCollections] = await Promise.all([
    getCollection(id),
    getCollections(),
  ]);

  if (!collection) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '120px 24px' }}>
        <h1 className="heading-lg">Collection not found</h1>
        <p className="text-body" style={{ marginTop: 16, opacity: 0.7 }}>
          The collection you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '10px 24px',
            borderRadius: '999px',
            background: '#0D2818',
            color: '#FBF9F6',
            fontWeight: 500,
          }}
        >
          Back to Gardens
        </Link>
      </div>
    );
  }

  // Build lightweight collection summaries for related-collections sidebar
  const collectionSummaries = allCollections.map((col) => ({
    id: col.id,
    name: col.name,
    iconColor: col.iconColor,
  }));

  return (
    <CollectionPageClient
      collection={collection}
      allCollectionSummaries={collectionSummaries}
    />
  );
}

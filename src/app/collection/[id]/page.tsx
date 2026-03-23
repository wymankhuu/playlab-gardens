import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollections, getCollection } from '@/lib/notion';
import CollectionFilter from '@/components/CollectionFilter';

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
  return {
    title: `${collection.name} | Playlab Gardens`,
    description:
      collection.description ||
      `Explore ${collection.appCount} apps in the ${collection.name} collection.`,
    openGraph: {
      title: `${collection.name} | Playlab Gardens`,
      description:
        collection.description ||
        `Explore ${collection.appCount} apps in the ${collection.name} collection.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollection(id);

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

  // Serialize apps for the client component
  const clientApps = collection.apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    url: app.url,
    creator: app.creator,
    role: app.role,
    sessions: app.sessions,
    tags: app.tags,
  }));

  return (
    <>
      {/* Collection Hero */}
      <section
        className="collection-hero"
        style={{ '--accent': collection.iconColor } as React.CSSProperties}
      >
        <div className="collection-hero-shapes">
          <div className="collection-hero-shape collection-hero-shape-1" />
          <div className="collection-hero-shape collection-hero-shape-2" />
        </div>
        <div className="collection-hero-content container">
          <Link href="/" className="collection-breadcrumb">
            &larr; All Collections
          </Link>
          <div className="collection-hero-header">
            <div
              className="collection-hero-icon"
              style={{ backgroundColor: collection.iconColor }}
            >
              {collection.iconEmoji || collection.name.charAt(0)}
            </div>
            <div className="collection-hero-text">
              <h1>{collection.name}</h1>
              {collection.description && (
                <p className="collection-hero-desc">{collection.description}</p>
              )}
            </div>
          </div>
          <div className="collection-hero-meta">
            <span className="collection-hero-stat">
              {collection.appCount} app{collection.appCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      {/* Apps Grid with Client-Side Filtering */}
      <div className="container section">
        <CollectionFilter apps={clientApps} accentColor={collection.iconColor} />
      </div>
    </>
  );
}

import Link from 'next/link';
import { getCollections, pickPreview } from '@/lib/notion';
import { COLLECTION_CATEGORIES } from '@/lib/labels';

// Group label to display name
const GROUP_LABELS: Record<string, string> = {
  subject: 'Subjects',
  grade: 'Grade Levels',
  useCase: 'Use Cases',
  org: 'Organizations',
};

// Order to render groups
const GROUP_ORDER = ['subject', 'grade', 'useCase', 'org'];

export default async function HomePage() {
  const collections = await getCollections();

  // Build a lookup: lowercase collection name -> category key
  const categoryLookup: Record<string, string> = {};
  for (const [category, names] of Object.entries(COLLECTION_CATEGORIES)) {
    for (const name of names) {
      categoryLookup[name.toLowerCase()] = category;
    }
  }

  // Group collections
  const grouped: Record<string, typeof collections> = {
    subject: [],
    grade: [],
    useCase: [],
    org: [],
  };
  const ungrouped: typeof collections = [];

  for (const col of collections) {
    const key = categoryLookup[col.name.toLowerCase()];
    if (key && grouped[key]) {
      grouped[key].push(col);
    } else {
      ungrouped.push(col);
    }
  }

  // Find flowers collection for spotlight
  const flowersCollection = collections.find(
    (c) => c.name.toLowerCase() === 'flowers',
  );

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-shapes">
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
          <div className="hero-shape hero-shape-4" />
        </div>
        <div className="hero-content container">
          <h1 className="heading-xl">Welcome to the Playlab Community Gardens</h1>
          <p className="hero-tagline">
            Hundreds of apps built by educators, for their students and
            communities. Each one shaped by a real classroom, a real need.
          </p>
        </div>
      </section>

      <div className="container">
        {/* Flowers Spotlight Banner */}
        {flowersCollection && (
          <section className="section">
            <Link
              href={`/collection/${flowersCollection.id}`}
              className="flowers-spotlight"
            >
              <div className="flowers-spotlight-bg" />
              <div className="flowers-spotlight-content">
                <span className="flowers-spotlight-badge">Featured Collection</span>
                <h2 className="flowers-spotlight-title">Flowers</h2>
                <p className="flowers-spotlight-desc">
                  {flowersCollection.description ||
                    'See how individuals across the Playlab community are building to reflect their unique contexts, roles, and goals.'}
                </p>
                <span className="flowers-spotlight-cta">
                  Explore {flowersCollection.appCount} apps &rarr;
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* Collection Groups */}
        {GROUP_ORDER.map((groupKey) => {
          const cols = grouped[groupKey];
          if (!cols || cols.length === 0) return null;
          const label = GROUP_LABELS[groupKey];

          return (
            <section key={groupKey} className="section">
              <div className="section-header">
                <h2>{label}</h2>
                <span className="section-count">
                  {cols.length} collection{cols.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="collections-grid">
                {cols.map((col) => {
                  const preview = pickPreview(col.apps, 3, col.name);
                  return (
                    <Link
                      key={col.id}
                      href={`/collection/${col.id}`}
                      className="collection-section"
                      style={
                        { '--collection-accent': col.iconColor } as React.CSSProperties
                      }
                    >
                      <div className="collection-section-header">
                        <div className="collection-section-title">
                          <div
                            className="collection-section-icon"
                            style={{ backgroundColor: col.iconColor }}
                          >
                            {col.iconEmoji || col.name.charAt(0)}
                          </div>
                          <span className="collection-section-name">{col.name}</span>
                        </div>
                        <span className="collection-section-viewall">
                          View all &rarr;
                        </span>
                      </div>
                      <div className="collection-section-meta">
                        <span className="collection-section-count">
                          {col.appCount} app{col.appCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {preview.length > 0 && (
                        <div className="collection-preview-apps">
                          {preview.map((app) => (
                            <div key={app.id} className="preview-app-card">
                              <div className="preview-app-card-name">{app.name}</div>
                              <div className="preview-app-card-desc">
                                {app.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Ungrouped collections */}
        {ungrouped.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2>More Collections</h2>
              <span className="section-count">
                {ungrouped.length} collection{ungrouped.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="collections-grid">
              {ungrouped.map((col) => {
                const preview = pickPreview(col.apps, 3, col.name);
                return (
                  <Link
                    key={col.id}
                    href={`/collection/${col.id}`}
                    className="collection-section"
                    style={
                      { '--collection-accent': col.iconColor } as React.CSSProperties
                    }
                  >
                    <div className="collection-section-header">
                      <div className="collection-section-title">
                        <div
                          className="collection-section-icon"
                          style={{ backgroundColor: col.iconColor }}
                        >
                          {col.name.charAt(0)}
                        </div>
                        <span className="collection-section-name">{col.name}</span>
                      </div>
                      <span className="collection-section-viewall">
                        View all &rarr;
                      </span>
                    </div>
                    <div className="collection-section-meta">
                      <span className="collection-section-count">
                        {col.appCount} app{col.appCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {preview.length > 0 && (
                      <div className="collection-preview-apps">
                        {preview.map((app) => (
                          <div key={app.id} className="preview-app-card">
                            <div className="preview-app-card-name">{app.name}</div>
                            <div className="preview-app-card-desc">
                              {app.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

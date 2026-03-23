import type { Metadata } from 'next';
import { getSeeds } from '@/lib/notion';

export const metadata: Metadata = {
  title: 'Seeds | Playlab Gardens',
  description:
    'Starter templates to jumpstart your app-building journey. Pick a seed, remix it, and make it your own.',
};

export default async function SeedsPage() {
  const seedCollections = await getSeeds();

  return (
    <>
      {/* Hero */}
      <section className="seeds-hero">
        <div className="seeds-hero-bg" />
        <div className="seeds-hero-content container">
          <h1 className="seeds-hero-title">Seeds</h1>
          <p className="seeds-hero-desc">
            Starter templates to jumpstart your app-building journey. Pick a
            seed, remix it, and make it your own.
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="container section">
        <div className="seeds-steps">
          <div className="seeds-step">
            <div className="seeds-step-number">1</div>
            <h3 className="seeds-step-title">Browse</h3>
            <p className="seeds-step-desc">
              Explore seed templates organized by category
            </p>
          </div>
          <div className="seeds-step">
            <div className="seeds-step-number">2</div>
            <h3 className="seeds-step-title">Remix</h3>
            <p className="seeds-step-desc">
              Click any seed to open it in Playlab and make it yours
            </p>
          </div>
          <div className="seeds-step">
            <div className="seeds-step-number">3</div>
            <h3 className="seeds-step-title">Grow</h3>
            <p className="seeds-step-desc">
              Customize it for your classroom and share it back
            </p>
          </div>
        </div>
      </div>

      {/* Seed Collections */}
      <div className="container section">
        {seedCollections.map((sc) => (
          <div
            key={sc.id}
            className="seed-collection-section"
            style={{ '--seed-accent': sc.color } as React.CSSProperties}
          >
            <div className="seed-collection-header">
              <div className="seed-collection-header-left">
                {sc.image && (
                  <img
                    className="seed-collection-flower"
                    src={`/${sc.image}`}
                    alt=""
                    width={44}
                    height={44}
                  />
                )}
                <div className="seed-collection-meta">
                  <h2 className="seed-collection-title">{sc.name}</h2>
                  <span className="seed-collection-count">
                    {sc.apps.length} seed{sc.apps.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            {sc.description && (
              <p className="seed-collection-desc">{sc.description}</p>
            )}
            <div className="seeds-grid">
              {sc.apps.map((seed) => (
                <a
                  key={seed.name}
                  href={seed.remixUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-card"
                  style={{ '--collection-accent': sc.color } as React.CSSProperties}
                >
                  <div className="app-card-body">
                    <div className="app-card-creator">
                      <span
                        className="app-card-avatar"
                        style={{ backgroundColor: sc.color }}
                      >
                        {seed.creator
                          ? seed.creator.charAt(0).toUpperCase()
                          : 'S'}
                      </span>
                      {seed.creator || 'Seed App'}
                    </div>
                    <div className="app-card-name">{seed.name}</div>
                    <div className="app-card-desc">{seed.description}</div>
                    {seed.tags && seed.tags.length > 0 && (
                      <div className="app-card-tags">
                        {seed.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="app-tag">
                            {tag}
                          </span>
                        ))}
                        {seed.tags.length > 2 && (
                          <span className="app-tag app-tag--more">
                            +{seed.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        {seedCollections.length === 0 && (
          <div className="seeds-empty">
            <div className="seeds-empty-icon">&#127793;</div>
            <h3>Seeds are sprouting</h3>
            <p>Check back soon for starter templates you can remix.</p>
          </div>
        )}
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { getCultivators } from '@/lib/notion';

export const metadata: Metadata = {
  title: 'Cultivators | Playlab Gardens',
  description:
    'Behind every app is a person who saw something missing and decided to build it. These are the educators, students, and leaders whose work is shaping what Playlab becomes.',
  openGraph: {
    title: 'Cultivators | Playlab Gardens',
    description:
      'Behind every app is a person who saw something missing and decided to build it. These are the educators, students, and leaders whose work is shaping what Playlab becomes.',
    images: ['https://playlabgardens.com/images/beat-3.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cultivators | Playlab Gardens',
    description:
      'Behind every app is a person who saw something missing and decided to build it. These are the educators, students, and leaders whose work is shaping what Playlab becomes.',
    images: ['https://playlabgardens.com/images/beat-3.webp'],
  },
};

export default async function CultivatorsPage() {
  const cultivators = await getCultivators();

  return (
    <>
      {/* Hero */}
      <section className="cultivators-hero">
        <div className="cultivators-hero-bg" />
        <div className="cultivators-hero-content container">
          <h1 className="cultivators-hero-title">Cultivators</h1>
          <p className="cultivators-hero-desc">
            Behind every app is a person who saw something missing and decided to
            build it. These are the educators, students, and leaders whose work
            is shaping what Playlab becomes — one tool, one classroom, one
            community at a time.
          </p>
        </div>
      </section>

      {/* Spotlight Banner */}
      <div className="container section">
        <div className="cultivators-spotlight">
          <div className="cultivators-spotlight-bg" />
          <div className="cultivators-spotlight-content">
            <span className="cultivators-spotlight-badge">
              Monthly Spotlight
            </span>
            <h2 className="cultivators-spotlight-title">March 2026</h2>
            <p className="cultivators-spotlight-desc">
              Three educators building at the edges — where data meets equity,
              where AI meets language, and where analog classrooms meet digital
              preparation. Meet this month&apos;s cultivators.
            </p>
          </div>
        </div>
      </div>

      {/* Cultivator Cards */}
      <div className="container section">
        {cultivators.length > 0 ? (
          <div className="cultivators-grid">
            {cultivators.map((cultivator) => {
              const initials = cultivator.name
                .split(' ')
                .map((w) => w.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={cultivator.name} className="cultivator-card">
                  <div className="cultivator-card-top">
                    <div className="cultivator-header">
                      {cultivator.headshotUrl ? (
                        <img
                          className="cultivator-headshot"
                          src={cultivator.headshotUrl}
                          alt={cultivator.name}
                          width={72}
                          height={72}
                        />
                      ) : (
                        <div className="cultivator-avatar">{initials}</div>
                      )}
                      <div>
                        <h3 className="cultivator-name">{cultivator.name}</h3>
                        <p className="cultivator-role">
                          {[cultivator.role, cultivator.organization]
                            .filter(Boolean)
                            .join(' at ')}
                        </p>
                      </div>
                    </div>
                    {cultivator.month && (
                      <span className="cultivator-month-pill">
                        {cultivator.month}
                      </span>
                    )}
                  </div>

                  {cultivator.about && (
                    <div className="cultivator-section">
                      <p className="cultivator-about">{cultivator.about}</p>
                    </div>
                  )}

                  {cultivator.usage && (
                    <div className="cultivator-section">
                      <h4 className="cultivator-section-title">
                        How They Use Playlab
                      </h4>
                      <p className="cultivator-section-text">
                        {cultivator.usage}
                      </p>
                    </div>
                  )}

                  {cultivator.impact && (
                    <div className="cultivator-section">
                      <h4 className="cultivator-section-title">Impact</h4>
                      <p className="cultivator-section-text">
                        {cultivator.impact}
                      </p>
                    </div>
                  )}

                  {cultivator.blogLink && (
                    <div className="cultivator-section">
                      <a
                        href={cultivator.blogLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cultivator-blog-link"
                      >
                        Read their story &rarr;
                      </a>
                    </div>
                  )}

                  {cultivator.apps.length > 0 && (
                    <div className="cultivator-section">
                      <h4 className="cultivator-section-title">Their Apps</h4>
                      <div className="cultivator-apps">
                        {cultivator.apps.map((app) => (
                          <a
                            key={app.id}
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cultivator-app-link"
                          >
                            <span className="cultivator-app-name">
                              {app.name}
                            </span>
                            <span className="cultivator-app-arrow">
                              &rarr;
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cultivators-empty">
            <div className="cultivators-empty-icon">&#127807;</div>
            <h3>Cultivators coming soon</h3>
            <p>
              We&apos;re spotlighting community leaders who are shaping the
              future of education through Playlab.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

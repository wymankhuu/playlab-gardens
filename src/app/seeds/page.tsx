import type { Metadata } from 'next';
import { getSeeds } from '@/lib/notion';
import SeedsClient from './SeedsClient';

export const metadata: Metadata = {
  title: 'Seeds | Playlab Gardens',
  description:
    "These aren't finished apps — they're starting points. Pick one, add your expertise, your curriculum, your students' needs, and nurture it into something only you could grow.",
  openGraph: {
    title: 'Seeds | Playlab Gardens',
    description:
      "These aren't finished apps — they're starting points. Pick one, add your expertise, your curriculum, your students' needs, and nurture it into something only you could grow.",
    images: ['https://playlabgardens.com/images/beat-1.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seeds | Playlab Gardens',
    description:
      "These aren't finished apps — they're starting points. Pick one, add your expertise, your curriculum, your students' needs, and nurture it into something only you could grow.",
    images: ['https://playlabgardens.com/images/beat-1.webp'],
  },
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
            These aren&apos;t finished apps — they&apos;re starting points. Pick
            one, add your expertise, your curriculum, your students&apos; needs,
            and nurture it into something only you could grow.
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="container section">
        <div className="seeds-steps">
          <div
            className="seeds-step"
            style={{ background: '#2654d4' }}
          >
            <div className="seeds-step-number">1</div>
            <h3 className="seeds-step-title">Pick a seed</h3>
            <p className="seeds-step-desc">
              Browse starter templates and click &apos;Plant this seed&apos; to
              get started
            </p>
          </div>
          <div
            className="seeds-step"
            style={{ background: '#9b59b6' }}
          >
            <div className="seeds-step-number">2</div>
            <h3 className="seeds-step-title">Add your context</h3>
            <p className="seeds-step-desc">
              Customize it with your curriculum, pedagogy, knowledge, and your
              voice
            </p>
          </div>
          <div
            className="seeds-step"
            style={{ background: '#e84393' }}
          >
            <div className="seeds-step-number">3</div>
            <h3 className="seeds-step-title">Watch it grow</h3>
            <p className="seeds-step-desc">
              Share it, iterate, and see it come to life in your environments
            </p>
          </div>
        </div>
      </div>

      {/* Seed Collections */}
      <SeedsClient seedCollections={seedCollections} />
    </>
  );
}

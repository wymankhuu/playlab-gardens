import '@/css/styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Playlab Gardens',
  description:
    'Hundreds of apps built by educators, for their students and communities. Each one shaped by a real classroom, a real need.',
  openGraph: {
    title: 'Playlab Gardens',
    description:
      'Hundreds of apps built by educators, for their students and communities.',
    images: ['https://playlabgardens.com/images/landing-illustration.webp'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="nav-logo">
              Playlab Gardens
            </Link>
            <ul className="nav-links">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/seeds">Seeds</Link>
              </li>
              <li>
                <Link href="/cultivators">Cultivators</Link>
              </li>
              <li>
                <Link href="/share" className="nav-cta">
                  Share Your App
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <main>{children}</main>

        <footer className="footer">
          <div className="footer-inner container">
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/seeds">Seeds</Link>
              <Link href="/cultivators">Cultivators</Link>
              <Link href="/share">Share Your App</Link>
            </div>
            <p className="footer-tagline">
              Built with love by the Playlab community
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

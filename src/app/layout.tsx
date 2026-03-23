import '@/css/styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AdminToolbar from '@/components/AdminToolbar';
import ScrollToTop from '@/components/ScrollToTop';
import FadeUpObserver from '@/components/FadeUpObserver';

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
  twitter: {
    card: 'summary_large_image',
    title: 'Playlab Gardens',
    description:
      'Hundreds of apps built by educators, for their students and communities.',
    images: ['https://playlabgardens.com/images/landing-illustration.webp'],
  },
  icons: {
    icon: '/images/favicon.webp',
  },
};

const FOOTER_LINKS = [
  { href: '/seeds', label: 'Seeds' },
  { href: '/collection/flowers', label: 'Flowers' },
  { href: '/', label: 'Gardens' },
  { href: '/cultivators', label: 'Cultivators' },
  { href: '/share', label: 'Share Your App' },
  { href: 'https://playlab.ai', label: 'Start Building', external: true },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Nav />
        <AdminToolbar />

        {children}

        <footer className="footer">
          <div className="footer-inner container">
            <div className="footer-links">
              {FOOTER_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                )
              )}
            </div>
            <p className="footer-tagline">
              Brought to you by Playlab Education Inc., a 501(c)3 nonprofit.
              <br />
              &copy; 2026 Playlab Education Inc.
            </p>
          </div>
        </footer>

        <ScrollToTop />
        <FadeUpObserver />
      </body>
    </html>
  );
}

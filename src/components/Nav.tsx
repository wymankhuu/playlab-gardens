'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Gardens' },
  { href: '/collection/flowers', label: 'Flowers' },
  { href: '/seeds', label: 'Seeds' },
  { href: '/cultivators', label: 'Cultivators' },
  { href: '/share', label: 'Share your app' },
];

function NavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getActivePath = useCallback(() => {
    if (pathname === '/collection/flowers') return '/collection/flowers';
    if (pathname === '/seeds') return '/seeds';
    if (pathname === '/cultivators') return '/cultivators';
    if (pathname === '/share') return '/share';
    if (pathname === '/') return '/';
    return '';
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      const nav = document.querySelector('.nav');
      if (nav && !nav.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mobileOpen]);

  const activePath = getActivePath();

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img src="/images/favicon.webp" alt="Playlab" className="nav-logo-img" />
          Playlab Gardens
        </Link>
        <ul className={`nav-links${mobileOpen ? ' mobile-open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={link.href === activePath ? 'active' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <a
          href="https://playlab.ai"
          className="nav-cta"
          target="_blank"
          rel="noopener"
        >
          Start Building
        </a>
        <button
          className="mobile-menu-btn"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export default function Nav() {
  return (
    <Suspense fallback={
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <img src="/images/favicon.webp" alt="Playlab" className="nav-logo-img" />
            Playlab Gardens
          </Link>
        </div>
      </nav>
    }>
      <NavInner />
    </Suspense>
  );
}

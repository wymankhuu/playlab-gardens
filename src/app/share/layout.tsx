import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Share Your App | Playlab Gardens',
  description:
    'Built something on Playlab? Tell us about it. We review every submission and add apps to the Gardens so other educators can discover and learn from your work.',
  openGraph: {
    title: 'Share Your App | Playlab Gardens',
    description:
      'Built something on Playlab? Tell us about it. We review every submission and add apps to the Gardens so other educators can discover and learn from your work.',
    images: ['https://playlabgardens.com/images/beat-2.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Share Your App | Playlab Gardens',
    description:
      'Built something on Playlab? Tell us about it. We review every submission and add apps to the Gardens so other educators can discover and learn from your work.',
    images: ['https://playlabgardens.com/images/beat-2.webp'],
  },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

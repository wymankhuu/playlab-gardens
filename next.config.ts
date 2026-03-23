import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Preserve old URL patterns as redirects
  async redirects() {
    return [
      {
        source: '/collection.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/seeds.html',
        destination: '/seeds',
        permanent: true,
      },
      {
        source: '/cultivators.html',
        destination: '/cultivators',
        permanent: true,
      },
      {
        source: '/share.html',
        destination: '/share',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

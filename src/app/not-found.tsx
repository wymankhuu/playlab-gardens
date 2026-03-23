import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container section" style={{ textAlign: 'center', padding: '120px 24px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌿</div>
      <h1 className="heading-lg">Page not found</h1>
      <p className="text-body" style={{ marginTop: 16, opacity: 0.7 }}>
        This page doesn&apos;t exist in the Gardens.
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

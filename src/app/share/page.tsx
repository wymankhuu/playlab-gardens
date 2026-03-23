'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export default function SharePage() {
  const [form, setForm] = useState({
    appName: '',
    url: '',
    creator: '',
    role: '',
    description: '',
    usage: '',
    impact: '',
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/submit-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <section className="share-hero">
          <div className="container">
            <Link href="/" className="breadcrumb-link">
              &larr; Back to Gardens
            </Link>
            <h1 className="share-hero-title">Share Your App</h1>
          </div>
        </section>
        <div className="container section">
          <div
            className="share-form-container"
            style={{ textAlign: 'center', padding: '60px 0' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>&#127881;</div>
            <h2 className="heading-lg" style={{ marginBottom: 12 }}>
              Thank you!
            </h2>
            <p
              className="text-body"
              style={{ opacity: 0.7, marginBottom: 24 }}
            >
              Your app has been submitted. Our team will review it and add it to
              the Gardens soon.
            </p>
            <button
              className="share-submit-btn"
              onClick={() => {
                setSubmitted(false);
                setConsent(false);
                setForm({
                  appName: '',
                  url: '',
                  creator: '',
                  role: '',
                  description: '',
                  usage: '',
                  impact: '',
                });
              }}
            >
              Submit Another App
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="share-hero">
        <div className="container">
          <Link href="/" className="breadcrumb-link">
            &larr; Back to Gardens
          </Link>
          <h1 className="share-hero-title">Share Your App</h1>
          <p className="share-hero-desc">
            Built something on Playlab? Tell us about it. We review every
            submission and add apps to the Gardens so other educators can
            discover and learn from your work.
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="container section">
        <div className="share-form-container">
          <form className="share-form" onSubmit={handleSubmit}>
            {/* App Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="appName">
                App Name <span className="form-required">*</span>
              </label>
              <input
                id="appName"
                className="form-input"
                type="text"
                placeholder="What's your app called?"
                value={form.appName}
                onChange={(e) => updateField('appName', e.target.value)}
                required
              />
            </div>

            {/* Playlab URL */}
            <div className="form-group">
              <label className="form-label" htmlFor="url">
                Playlab URL <span className="form-required">*</span>
              </label>
              <input
                id="url"
                className="form-input"
                type="url"
                placeholder="https://playlab.ai/project/..."
                value={form.url}
                onChange={(e) => updateField('url', e.target.value)}
                required
              />
            </div>

            {/* Creator + Role row */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="creator">
                  Your Name <span className="form-required">*</span>
                </label>
                <input
                  id="creator"
                  className="form-input"
                  type="text"
                  placeholder="First and last name"
                  value={form.creator}
                  onChange={(e) => updateField('creator', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="role">
                  Your Role <span className="form-required">*</span>
                </label>
                <input
                  id="role"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Teacher, Student, Coach"
                  value={form.role}
                  onChange={(e) => updateField('role', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description <span className="form-required">*</span>
              </label>
              <textarea
                id="description"
                className="form-textarea"
                placeholder="What does your app do? (1-2 sentences)"
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                required
              />
            </div>

            {/* How It's Being Used */}
            <div className="form-group">
              <label className="form-label" htmlFor="usage">
                How It&apos;s Being Used{' '}
                <span className="form-required">*</span>
              </label>
              <textarea
                id="usage"
                className="form-textarea"
                placeholder="How are students or educators using this app? What does a typical session look like?"
                rows={3}
                value={form.usage}
                onChange={(e) => updateField('usage', e.target.value)}
                required
              />
            </div>

            {/* Impact */}
            <div className="form-group">
              <label className="form-label" htmlFor="impact">
                Impact <span className="form-required">*</span>
              </label>
              <textarea
                id="impact"
                className="form-textarea"
                placeholder="What difference has this app made? Any outcomes, stories, or numbers you can share?"
                rows={3}
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                required
              />
            </div>

            {/* Public consent checkbox */}
            <div className="form-group">
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 'normal',
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I&apos;m willing to have my app shared publicly in the Playlab
                Gardens
              </label>
            </div>

            {error && (
              <p
                style={{
                  color: '#e74c3c',
                  fontFamily: 'var(--font-caption)',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="share-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Your App'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

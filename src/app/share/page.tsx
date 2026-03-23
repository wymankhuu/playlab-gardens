'use client';

import { useState, type FormEvent } from 'react';

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
        body: JSON.stringify(form),
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
            <h1 className="share-hero-title">Share Your App</h1>
          </div>
        </section>
        <div className="container section">
          <div className="share-form-container" style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>&#127881;</div>
            <h2 className="heading-lg" style={{ marginBottom: 12 }}>
              Thank you!
            </h2>
            <p className="text-body" style={{ opacity: 0.7, marginBottom: 24 }}>
              Your app has been submitted. Our team will review it and add it to
              the Gardens soon.
            </p>
            <button
              className="share-submit-btn"
              onClick={() => {
                setSubmitted(false);
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
          <h1 className="share-hero-title">Share Your App</h1>
          <p className="share-hero-desc">
            Built something with Playlab? Share it with the community. Every
            app tells a story — we want to hear yours.
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
                placeholder="e.g., Math Practice Partner"
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
                  placeholder="e.g., Maria Garcia"
                  value={form.creator}
                  onChange={(e) => updateField('creator', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="role">
                  Your Role
                </label>
                <input
                  id="role"
                  className="form-input"
                  type="text"
                  placeholder="e.g., 5th Grade Teacher"
                  value={form.role}
                  onChange={(e) => updateField('role', e.target.value)}
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
                placeholder="What does your app do? Who is it for?"
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                required
              />
            </div>

            {/* How It's Being Used */}
            <div className="form-group">
              <label className="form-label" htmlFor="usage">
                How It&apos;s Being Used
              </label>
              <textarea
                id="usage"
                className="form-textarea"
                placeholder="How are you or your students using this app in the classroom?"
                rows={3}
                value={form.usage}
                onChange={(e) => updateField('usage', e.target.value)}
              />
            </div>

            {/* Impact */}
            <div className="form-group">
              <label className="form-label" htmlFor="impact">
                Impact
              </label>
              <textarea
                id="impact"
                className="form-textarea"
                placeholder="What impact has this app had on learning or teaching?"
                rows={3}
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
              />
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

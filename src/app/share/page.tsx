'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { suggestTags } from '@/lib/autotag';

const PLAYLAB_URL_PATTERN = /^https?:\/\/(www\.)?playlab\.ai\/project\/.+$/;
const DEBOUNCE_MS = 500;

interface FieldErrors {
  appName?: string;
  url?: string;
  creator?: string;
  role?: string;
  description?: string;
  usage?: string;
  impact?: string;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FieldErrors];
        return next;
      });
    }
  }

  // Debounced auto-tag suggestions when description changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!form.description.trim()) {
      setSuggestedTags([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const tags = suggestTags(form.description);
      setSuggestedTags(tags);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.description]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.appName.trim()) {
      errors.appName = 'App name is required.';
    }

    if (!form.url.trim()) {
      errors.url = 'Playlab URL is required.';
    } else if (!PLAYLAB_URL_PATTERN.test(form.url.trim())) {
      errors.url = 'Please enter a valid Playlab URL (https://playlab.ai/project/...).';
    }

    if (!form.creator.trim()) {
      errors.creator = 'Your name is required.';
    }

    if (!form.role.trim()) {
      errors.role = 'Your role is required.';
    }

    if (!form.description.trim()) {
      errors.description = 'Description is required.';
    }

    if (!form.usage.trim()) {
      errors.usage = 'Please describe how the app is being used.';
    }

    if (!form.impact.trim()) {
      errors.impact = 'Please describe the impact of the app.';
    }

    return errors;
  }

  function scrollToFirstError(errors: FieldErrors) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    const el = document.getElementById(firstField);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/submit-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          consent,
          suggestedCollections: [...selectedTags],
        }),
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
                setFieldErrors({});
                setSuggestedTags([]);
                setSelectedTags(new Set());
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
          <form className="share-form" ref={formRef} onSubmit={handleSubmit} noValidate>
            {/* App Name */}
            <div className={`form-group${fieldErrors.appName ? ' form-group--error' : ''}`}>
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
              {fieldErrors.appName && (
                <p className="form-error">{fieldErrors.appName}</p>
              )}
            </div>

            {/* Playlab URL */}
            <div className={`form-group${fieldErrors.url ? ' form-group--error' : ''}`}>
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
              {fieldErrors.url && (
                <p className="form-error">{fieldErrors.url}</p>
              )}
            </div>

            {/* Creator + Role row */}
            <div className="form-row">
              <div className={`form-group${fieldErrors.creator ? ' form-group--error' : ''}`}>
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
                {fieldErrors.creator && (
                  <p className="form-error">{fieldErrors.creator}</p>
                )}
              </div>
              <div className={`form-group${fieldErrors.role ? ' form-group--error' : ''}`}>
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
                {fieldErrors.role && (
                  <p className="form-error">{fieldErrors.role}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className={`form-group${fieldErrors.description ? ' form-group--error' : ''}`}>
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
              {fieldErrors.description && (
                <p className="form-error">{fieldErrors.description}</p>
              )}

              {/* Auto-tag suggestions */}
              {suggestedTags.length > 0 && (
                <div className="autotag-suggestions" aria-live="polite">
                  <span className="autotag-label">Suggested collections:</span>
                  <div className="autotag-pills">
                    {suggestedTags.map((tag) => {
                      const isSelected = selectedTags.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`autotag-pill${isSelected ? ' autotag-pill--selected' : ''}`}
                          onClick={() => toggleTag(tag)}
                          aria-pressed={isSelected}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* How It's Being Used */}
            <div className={`form-group${fieldErrors.usage ? ' form-group--error' : ''}`}>
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
              {fieldErrors.usage && (
                <p className="form-error">{fieldErrors.usage}</p>
              )}
            </div>

            {/* Impact */}
            <div className={`form-group${fieldErrors.impact ? ' form-group--error' : ''}`}>
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
              {fieldErrors.impact && (
                <p className="form-error">{fieldErrors.impact}</p>
              )}
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

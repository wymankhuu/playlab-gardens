/* ==========================================
   Playlab Gardens — Shared Utilities
   ========================================== */

// ---- API Helpers ----
const API_BASE = '/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function apiUrl(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  return url.toString();
}

// ---- Modal ----
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openAppModal(app) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  document.getElementById('modal-title').textContent = app.name;
  document.getElementById('modal-creator').textContent = app.creator ? `by ${app.creator}` : '';
  document.getElementById('modal-desc').textContent = app.description || 'No description available.';
  document.getElementById('modal-sessions').textContent = formatNumber(app.sessions || 0);
  document.getElementById('modal-iterations').textContent = formatNumber(app.iterations || 0);

  const ctaLink = document.getElementById('modal-cta');
  ctaLink.href = app.url || `https://playlab.ai/app/${app.id}`;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus the close button for accessibility
  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ---- Rendering Helpers ----
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '…';
}

// ---- Skeleton Loaders ----
function renderSkeletons(container, count, className) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = `skeleton ${className}`;
    container.appendChild(el);
  }
}

// ---- Collection Card HTML ----
function collectionCardHTML(col, featured = false) {
  const cardClass = featured ? 'collection-card featured-card' : 'collection-card';
  const typeBadge = col.type ? `<span class="collection-card-type">${escapeHtml(col.type)}</span>` : '';
  const countText = col.appCount ? `${col.appCount} app${col.appCount !== 1 ? 's' : ''}` : '';

  return `
    <a href="collection.html?id=${encodeURIComponent(col.id)}" class="${cardClass}">
      <div class="collection-card-icon" style="background-color: ${col.iconColor || '#00983F'}">
        ${col.iconEmoji || '📚'}
      </div>
      <div class="collection-card-name">${escapeHtml(col.name)}</div>
      ${col.description ? `<div class="collection-card-desc">${escapeHtml(truncate(col.description, 100))}</div>` : ''}
      <div class="collection-card-meta">
        ${countText ? `<span class="collection-card-count">${countText}</span>` : ''}
        ${typeBadge}
        <span class="collection-card-arrow">→</span>
      </div>
    </a>
  `;
}

// ---- App Card HTML ----
function appCardHTML(app) {
  const sessions = app.sessions ? `<span class="app-badge">${formatNumber(app.sessions)} sessions</span>` : '';
  return `
    <div class="app-card" data-app-id="${escapeHtml(app.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(app.name)}">
      <div class="app-card-name">${escapeHtml(app.name)}</div>
      ${app.creator ? `<div class="app-card-creator">by ${escapeHtml(app.creator)}</div>` : ''}
      ${app.description ? `<div class="app-card-desc">${escapeHtml(truncate(app.description, 150))}</div>` : ''}
      <div class="app-card-meta">
        ${sessions}
      </div>
    </div>
  `;
}

// ---- Empty/Error States ----
function emptyStateHTML(message) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🌿</div>
      <h3>${escapeHtml(message)}</h3>
      <p>Check back soon — new apps are added regularly.</p>
    </div>
  `;
}

function errorStateHTML(message) {
  return `
    <div class="error-state">
      <div class="error-state-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p>${escapeHtml(message || 'Please try again later.')}</p>
    </div>
  `;
}

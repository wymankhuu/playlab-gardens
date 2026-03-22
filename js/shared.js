/* ==========================================
   Playlab Gardens — Shared Utilities
   ========================================== */

// ---- Star / Favorite System (localStorage + API) ----
const STARS_KEY = 'playlab-gardens-stars';
const _starCountCache = {};

function getStarredApps() {
  try { return JSON.parse(localStorage.getItem(STARS_KEY)) || {}; } catch { return {}; }
}

function isStarred(appId) {
  return !!getStarredApps()[appId];
}

function toggleStar(appId) {
  const stars = getStarredApps();
  const nowStarred = !stars[appId];
  if (nowStarred) {
    stars[appId] = Date.now();
  } else {
    delete stars[appId];
  }
  localStorage.setItem(STARS_KEY, JSON.stringify(stars));

  // Call API to update persistent count
  fetch('/api/star', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, action: nowStarred ? 'star' : 'unstar' }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.count != null) {
        _starCountCache[appId] = data.count;
        updateStarCountDisplays(appId, data.count);
      }
    })
    .catch(() => {});

  return nowStarred;
}

function updateStarCountDisplays(appId, count) {
  // Update card badge
  const cardBtn = document.querySelector(`.app-star-btn[data-app-id="${appId}"]`);
  if (cardBtn) {
    const countEl = cardBtn.querySelector('.star-count');
    if (countEl) countEl.textContent = count > 0 ? count : '';
  }
  // Update drawer count
  const drawerCount = document.getElementById('drawer-star-count');
  if (drawerCount && drawerCount.dataset.appId === appId) {
    drawerCount.textContent = count > 0 ? `★ ${count}` : '★ 0';
  }
}

async function loadStarCounts(appIds) {
  if (!appIds || appIds.length === 0) return;
  const unique = [...new Set(appIds)].slice(0, 100);
  try {
    const res = await fetch(`/api/stars?ids=${unique.join(',')}`);
    const counts = await res.json();
    for (const [id, count] of Object.entries(counts)) {
      _starCountCache[id] = count;
      updateStarCountDisplays(id, count);
    }
  } catch {}
}

function initStarButtons() {
  document.addEventListener('click', function(e) {
    const cardBtn = e.target.closest('.app-star-btn');
    if (cardBtn) {
      e.stopPropagation();
      const appId = cardBtn.dataset.appId;
      const nowStarred = toggleStar(appId);
      cardBtn.classList.toggle('starred', nowStarred);
      cardBtn.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
      // Sync drawer
      const drawerStarBtn = document.getElementById('drawer-star-btn');
      if (drawerStarBtn && drawerStarBtn.dataset.appId === appId) {
        drawerStarBtn.classList.toggle('starred', nowStarred);
        drawerStarBtn.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
      }
      return;
    }
    // Drawer star button
    const drawerBtn = e.target.closest('#drawer-star-btn');
    if (drawerBtn) {
      e.stopPropagation();
      const appId = drawerBtn.dataset.appId;
      const nowStarred = toggleStar(appId);
      drawerBtn.classList.toggle('starred', nowStarred);
      drawerBtn.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
      const cardStar = document.querySelector(`.app-star-btn[data-app-id="${appId}"]`);
      if (cardStar) {
        cardStar.classList.toggle('starred', nowStarred);
        cardStar.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
      }
    }
  });

  // Load star counts for visible cards after a short delay
  setTimeout(() => {
    const cards = document.querySelectorAll('.app-star-btn[data-app-id]');
    const ids = [...cards].map(c => c.dataset.appId).filter(Boolean);
    if (ids.length > 0) loadStarCounts(ids);
  }, 500);
}

// ---- QR Code Modal ----
function showQRModal(url, name) {
  // Remove existing modal
  const existing = document.getElementById('qr-modal');
  if (existing) existing.remove();

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&margin=10`;

  const modal = document.createElement('div');
  modal.id = 'qr-modal';
  modal.className = 'qr-modal-overlay';
  modal.innerHTML = `
    <div class="qr-modal">
      <div class="qr-modal-header">
        <h3 class="qr-modal-title">${escapeHtml(name)}</h3>
        <button class="qr-modal-close" aria-label="Close">✕</button>
      </div>
      <div class="qr-modal-body">
        <img src="${qrImageUrl}" alt="QR code for ${escapeHtml(name)}" class="qr-modal-image" width="300" height="300">
        <p class="qr-modal-url">${escapeHtml(url)}</p>
      </div>
      <div class="qr-modal-actions">
        <a href="${qrImageUrl}" download="qr-${name.toLowerCase().replace(/\s+/g, '-')}.png" class="qr-download-btn">Download QR</a>
        <button class="qr-copy-btn" data-url="${escapeHtml(url)}">Copy Link</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector('.qr-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onEsc); }
  });

  // Copy button
  modal.querySelector('.qr-copy-btn').addEventListener('click', function() {
    navigator.clipboard.writeText(url).then(() => {
      this.textContent = 'Copied!';
      setTimeout(() => { this.textContent = 'Copy Link'; }, 2000);
    });
  });
}

document.addEventListener('click', function(e) {
  const qrBtn = e.target.closest('.qr-code-btn');
  if (!qrBtn) return;
  e.stopPropagation();
  showQRModal(qrBtn.dataset.url, qrBtn.dataset.name || 'Collection');
});

// ---- Share Link Handler (all pages) ----
document.addEventListener('click', function(e) {
  const shareBtn = e.target.closest('.share-link-btn');
  if (!shareBtn) return;
  e.stopPropagation();
  const url = shareBtn.dataset.url;
  if (navigator.clipboard && url) {
    navigator.clipboard.writeText(url).then(() => {
      // Add toast if not already there
      if (!shareBtn.querySelector('.copied-toast')) {
        const toast = document.createElement('span');
        toast.className = 'copied-toast';
        toast.textContent = 'Link copied!';
        shareBtn.appendChild(toast);
      }
      shareBtn.classList.add('copied');
      setTimeout(() => {
        shareBtn.classList.remove('copied');
        const toast = shareBtn.querySelector('.copied-toast');
        if (toast) toast.remove();
      }, 2000);
    });
  }
});

// ---- Mobile Menu ----
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    links.classList.toggle('open');
  });

  document.addEventListener('click', () => links.classList.remove('open'));
  links.addEventListener('click', () => links.classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') links.classList.remove('open');
  });
}
document.addEventListener('DOMContentLoaded', initMobileMenu);

// ---- Scroll to Top ----
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 600);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
document.addEventListener('DOMContentLoaded', initScrollTop);
document.addEventListener('DOMContentLoaded', initStarButtons);

// ---- Meta Helpers ----
function updateMeta(nameOrProp, content) {
  let el = document.querySelector(`meta[property="${nameOrProp}"]`)
    || document.querySelector(`meta[name="${nameOrProp}"]`);
  if (el) {
    el.setAttribute('content', content);
  }
}

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

// ---- Lucide Icon Mapping ----
// Maps collection names (lowercase) to Lucide icon names
const COLLECTION_ICONS = {
  'project-based learning': 'rocket',
  'student-built apps': 'code',
  'study partners': 'book-open',
  'writing coaches': 'pen-tool',
  'career & vocational': 'graduation-cap',
  'assessment & feedback': 'clipboard-check',
  'science / stem': 'flask-conical',
  'math': 'calculator',
  'ela / literacy': 'book-text',
  'social studies / history': 'landmark',
  'arts & design': 'palette',
  'business / economics': 'briefcase',
  'cultural studies': 'globe',
  'religious studies': 'heart',
  'elementary': 'baby',
  'middle school': 'backpack',
  'high school': 'school',
  'higher ed': 'graduation-cap',
  'ca community colleges': 'building',
  'teacher tools': 'wrench',
  'ghana': 'map-pin',
  'nyc': 'map-pin',
  'texas': 'map-pin',
  'fairfax': 'map-pin',
  'ciob': 'building-2',
  'flowers': 'flower-2',
  'ai assistants': 'brain',
  'sel / wellbeing': 'smile',
  'ell / esl': 'languages',
  'special education': 'accessibility',
  'niche & emerging': 'trending-up',
  'illustrative mathematics': 'square-function',
  'world languages': 'languages',
  'gamified learning': 'gamepad-2',
  'kipp': 'map-pin',
  'data-driven instruction': 'bar-chart-3',
  'family & community': 'users',
  'school leadership': 'shield',
  'reading intervention': 'book-marked',
  'amplify': 'volume-2',
  'leading educators': 'award',
  'health & pe': 'activity',
  'creative & engagement': 'lightbulb',
  'music & performing arts': 'music',
  'professional development': 'briefcase',
  'lesson planning': 'calendar',
  'differentiation & access': 'accessibility',
};

function getCollectionIcon(name) {
  const lower = (name || '').toLowerCase();
  // Exact match first
  if (COLLECTION_ICONS[lower]) return COLLECTION_ICONS[lower];
  // Partial match
  for (const [key, icon] of Object.entries(COLLECTION_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  // Fallback based on type
  if (lower.includes('showcase') || lower.includes('district')) return 'map-pin';
  return 'folder';
}

function lucideIconHTML(iconName, size = 20) {
  return `<i data-lucide="${iconName}" style="width:${size}px;height:${size}px;"></i>`;
}

// Call after rendering HTML that contains lucide icons
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ---- Drawer Panel ----
// ---- Admin Mode ----
let isAdminMode = false;
let adminPassword = '';
let currentDrawerApp = null;

function initAdminToggle() {
  const toggle = document.getElementById('admin-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    if (isAdminMode) {
      isAdminMode = false;
      adminPassword = '';
      toggle.classList.remove('admin-active');
      toggle.title = 'Enter admin mode';
      // Re-open current app in view mode if drawer is open
      if (currentDrawerApp) openAppModal(currentDrawerApp);
    } else {
      showPasswordModal((pwd) => {
        adminPassword = pwd;
        isAdminMode = true;
        toggle.classList.add('admin-active');
        toggle.title = 'Exit admin mode';
        if (currentDrawerApp) openAppModal(currentDrawerApp);
      });
    }
  });
}


function showPasswordModal(onSuccess) {
  // Remove any existing modal
  const existing = document.getElementById('admin-password-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-password-modal';
  modal.className = 'admin-pw-overlay';
  modal.innerHTML = `
    <div class="admin-pw-modal">
      <div class="admin-pw-header">
        <div class="admin-pw-icon">
          ${lucideIconHTML('lock', 20)}
        </div>
        <h3 class="admin-pw-title">Admin Access</h3>
        <p class="admin-pw-subtitle">Enter the password to edit apps</p>
      </div>
      <div class="admin-pw-body">
        <input type="password" class="admin-pw-input" id="admin-pw-field" placeholder="Password" autocomplete="off" autofocus>
        <p class="admin-pw-error" id="admin-pw-error"></p>
      </div>
      <div class="admin-pw-actions">
        <button class="admin-pw-cancel" id="admin-pw-cancel">Cancel</button>
        <button class="admin-pw-submit" id="admin-pw-submit">
          ${lucideIconHTML('unlock', 14)}
          Enter
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  refreshIcons();

  const input = document.getElementById('admin-pw-field');
  const error = document.getElementById('admin-pw-error');
  const submitBtn = document.getElementById('admin-pw-submit');

  // Focus input after animation
  setTimeout(() => input.focus(), 50);

  function close() {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 150);
  }

  function submit() {
    const pwd = input.value.trim();
    if (!pwd) {
      error.textContent = 'Please enter a password';
      input.focus();
      return;
    }
    close();
    onSuccess(pwd);
  }

  submitBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
    error.textContent = '';
  });
  document.getElementById('admin-pw-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

async function saveToDatabase(app, fields) {
  try {
    const res = await fetch(apiUrl('/admin-save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword,
        appId: app.id,
        appName: app.name,
        ...fields,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert('Save failed: ' + (data.error || 'Unknown error'));
      return false;
    }
    return true;
  } catch (err) {
    alert('Save failed: ' + err.message);
    return false;
  }
}

function initModal() {
  const overlay = document.getElementById('drawer-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', () => closeDrawer());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  initAdminToggle();
}

function openAppModal(app) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  currentDrawerApp = app;

  // App name
  document.getElementById('drawer-app-name').textContent = app.name;

  // Creator
  const creatorSection = document.getElementById('drawer-creator');
  const creatorName = app.creator || '';
  const creatorRole = app.role || 'Teacher';
  if (creatorName) {
    creatorSection.style.display = '';
    const initials = creatorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('drawer-creator-avatar').textContent = initials;
    document.getElementById('drawer-creator-name').textContent = creatorName;
    document.getElementById('drawer-creator-role').textContent = creatorRole;
  } else {
    creatorSection.style.display = isAdminMode ? '' : 'none';
    document.getElementById('drawer-creator-avatar').textContent = '?';
    document.getElementById('drawer-creator-name').textContent = 'Unknown';
    document.getElementById('drawer-creator-role').textContent = 'Teacher';
  }

  // Labels
  // Collection tags
  const drawerLabels = document.getElementById('drawer-labels');
  if (drawerLabels) {
    if (app.tags && app.tags.length > 0) {
      const pillColors = ['#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A', '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D'];
      const pills = app.tags.map((tag, i) => {
        const color = pillColors[i % pillColors.length];
        return `<a href="collection.html?id=${encodeURIComponent(tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))}" class="drawer-collection-pill" style="background: ${color}20; color: ${color}; border-color: ${color}40;">${escapeHtml(tag)}</a>`;
      }).join('');
      drawerLabels.style.display = '';
      drawerLabels.innerHTML = `<div class="drawer-section-label">Collections</div><div class="drawer-collection-pills">${pills}</div>`;
    } else {
      drawerLabels.style.display = 'none';
    }
  }

  // Description — always show, using fallback if needed
  const aboutSection = document.getElementById('drawer-about-section');
  const descEl = document.getElementById('drawer-desc');
  const desc = generateFallbackDescription(app);
  aboutSection.style.display = '';
  descEl.textContent = desc;

  // How It's Being Used
  const usageBox = document.getElementById('drawer-usage');
  if (usageBox) {
    const usageText = usageBox.querySelector('.drawer-info-box-text');
    const usageContent = app.usage || null;
    if (usageContent) {
      usageText.textContent = usageContent;
      usageText.classList.toggle('drawer-info-box-placeholder', !app.usage);
    } else {
      usageText.textContent = 'Usage details coming soon';
      usageText.classList.add('drawer-info-box-placeholder');
    }
  }

  // Impact
  const iterations = app.iterations || 0;
  document.getElementById('drawer-iterations').textContent = `${formatNumber(iterations)} remixes`;

  // Star button + count in drawer header
  const drawerStar = document.getElementById('drawer-star-btn');
  if (drawerStar) {
    const starred = isStarred(app.id);
    drawerStar.dataset.appId = app.id;
    drawerStar.classList.toggle('starred', starred);
    drawerStar.querySelector('.star-icon').innerHTML = starred ? '★' : '☆';
  }
  const drawerStarCount = document.getElementById('drawer-star-count');
  if (drawerStarCount) {
    drawerStarCount.dataset.appId = app.id;
    const cached = _starCountCache[app.id] || 0;
    drawerStarCount.textContent = `★ ${cached}`;
    // Fetch fresh count
    loadStarCounts([app.id]);
  }

  const impactText = document.getElementById('drawer-impact-text');
  if (impactText) {
    const impactContent = app.impact || generateImpactBlurb(iterations);
    if (impactContent) {
      impactText.textContent = impactContent;
      impactText.style.display = '';
    } else {
      impactText.style.display = 'none';
    }
  }

  // CTA links
  const appUrl = app.url || `https://playlab.ai/project/${app.id}`;
  document.getElementById('drawer-cta').href = appUrl;
  document.getElementById('drawer-remix').href = `https://playlab.ai/remix/${app.id}`;

  // Copy link button
  const copyBtn = document.getElementById('drawer-copy-link');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const deepLink = `${window.location.origin}${window.location.pathname}#app=${app.id}`;
      navigator.clipboard.writeText(deepLink).then(() => {
        copyBtn.textContent = 'Link copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
      });
    };
  }

  // Related apps
  renderRelatedApps(app);

  // Admin edit panel
  renderAdminPanel(app);

  // Open
  overlay.classList.add('active');
  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Deep link
  if (app.id) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#app=${app.id}`);
  }

  const closeBtn = drawer.querySelector('.drawer-close');
  if (closeBtn) closeBtn.focus();

  refreshIcons();
}


function renderAdminPanel(app) {
  const container = document.getElementById('drawer-admin');
  if (!container) return;

  if (!isAdminMode) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <i data-lucide="pen-line" style="width:14px;height:14px;"></i>
        <span>Edit App</span>
      </div>
      <div class="admin-row">
        <div class="admin-field admin-field--half">
          <label class="admin-label" for="admin-creator">Creator</label>
          <input type="text" class="admin-input" id="admin-creator" value="${escapeHtml(app.creator || '')}" placeholder="Jane Smith">
        </div>
        <div class="admin-field admin-field--half">
          <label class="admin-label" for="admin-role">Role</label>
          <input type="text" class="admin-input" id="admin-role" value="${escapeHtml(app.role || '')}" placeholder="Teacher, Student, Coach">
        </div>
      </div>
      <div class="admin-field">
        <label class="admin-label" for="admin-description">Description</label>
        <textarea class="admin-textarea" id="admin-description" rows="2" placeholder="What does this app do?">${escapeHtml(app.description || '')}</textarea>
      </div>
      <div class="admin-field">
        <label class="admin-label" for="admin-usage">
          <i data-lucide="book-open" style="width:12px;height:12px;opacity:0.5;"></i>
          How It's Being Used
        </label>
        <textarea class="admin-textarea" id="admin-usage" rows="3" placeholder="How are educators or students using this?">${escapeHtml(app.usage || '')}</textarea>
      </div>
      <div class="admin-field">
        <label class="admin-label" for="admin-impact">
          <i data-lucide="trending-up" style="width:12px;height:12px;opacity:0.5;"></i>
          Impact
        </label>
        <textarea class="admin-textarea" id="admin-impact" rows="3" placeholder="What difference has this made?">${escapeHtml(app.impact || '')}</textarea>
      </div>
      <div class="admin-actions">
        <button class="admin-save-btn" id="admin-save-btn">
          <i data-lucide="save" style="width:14px;height:14px;"></i>
          Save to Database
        </button>
      </div>
    </div>
  `;

  document.getElementById('admin-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('admin-save-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const fields = {
      creator: document.getElementById('admin-creator').value.trim(),
      role: document.getElementById('admin-role').value.trim(),
      description: document.getElementById('admin-description').value.trim(),
      usage: document.getElementById('admin-usage').value.trim(),
      impact: document.getElementById('admin-impact').value.trim(),
    };

    const success = await saveToDatabase(app, fields);
    if (success) {
      app.creator = fields.creator;
      app.role = fields.role;
      app.description = fields.description;
      app.usage = fields.usage;
      app.impact = fields.impact;

      // Update the card in the grid immediately
      refreshAppCard(app);

      btn.textContent = 'Saved!';
      setTimeout(() => {
        btn.textContent = 'Save to Database';
        btn.disabled = false;
        openAppModal(app);
      }, 1000);
    } else {
      btn.textContent = 'Save to Database';
      btn.disabled = false;
    }
  });

  refreshIcons();
}

// All apps cache for related apps lookup
let _allAppsFlat = null;

function getAllAppsFlat() {
  if (_allAppsFlat) return _allAppsFlat;
  // Try to get from allCollections (home page) or allApps (collection page)
  const collections = (typeof allCollections !== 'undefined') ? allCollections : [];
  const seen = new Set();
  _allAppsFlat = [];
  for (const col of collections) {
    const apps = col.previewApps || col.apps || [];
    for (const app of apps) {
      if (!seen.has(app.id)) {
        seen.add(app.id);
        _allAppsFlat.push(app);
      }
    }
  }
  // Also check allApps from collection page
  if (typeof allApps !== 'undefined') {
    for (const app of allApps) {
      if (!seen.has(app.id)) {
        seen.add(app.id);
        _allAppsFlat.push(app);
      }
    }
  }
  return _allAppsFlat;
}

function renderRelatedApps(app) {
  const container = document.getElementById('drawer-related');
  if (!container) return;

  if (!app.tags || app.tags.length === 0) {
    container.style.display = 'none';
    return;
  }

  const all = getAllAppsFlat();
  // Score other apps by number of shared tags
  const scored = all
    .filter(a => a.id !== app.id && a.tags)
    .map(a => ({
      app: a,
      shared: a.tags.filter(t => app.tags.includes(t)).length,
    }))
    .filter(s => s.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3);

  if (scored.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  container.innerHTML = `
    <div class="drawer-section-label">Related Apps</div>
    <div class="drawer-related-list">
      ${scored.map(({ app: r }) => `
        <div class="drawer-related-item" data-app-id="${escapeHtml(r.id)}">
          <div class="drawer-related-name">${escapeHtml(r.name)}</div>
          ${r.creator ? `<div class="drawer-related-creator">${escapeHtml(r.creator)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // Click handlers for related apps
  container.querySelectorAll('.drawer-related-item').forEach(item => {
    const relId = item.dataset.appId;
    const relApp = all.find(a => a.id === relId);
    if (relApp) {
      item.addEventListener('click', () => openAppModal(relApp));
      item.style.cursor = 'pointer';
    }
  });
}

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  overlay.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';

  // Clear deep link hash
  if (window.location.hash.startsWith('#app=')) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

// Keep backward compat alias
function closeModal() { closeDrawer(); }

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

// Limit to first 1-2 sentences
function shortDesc(str) {
  if (!str) return '';
  const sentences = str.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return truncate(str, 150);
  const short = sentences.slice(0, 2).join('').trim();
  return truncate(short, 200);
}

// ---- Label Helpers ----
function mergeLabelsIntoApps(apps, labelsMap) {
  if (!labelsMap) return;
  for (const app of apps) {
    app.labels = labelsMap[app.id] || null;
  }
}

// ---- Description & Drawer Helpers ----

function generateFallbackDescription(app) {
  if (app.description && app.description.trim()) return app.description;
  return 'An educator-built Playlab app.';
}

function generateImpactBlurb(iterations) {
  if (!iterations) return null;
  if (iterations >= 10) return `Remixed ${iterations} times by other educators.`;
  if (iterations > 0) return `Remixed ${iterations} time${iterations !== 1 ? 's' : ''}.`;
  return null;
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

// ---- Collection Descriptions ----
const COLLECTION_DESCRIPTIONS = {
  'ai assistants': 'Educators are reimagining what a teaching assistant can be. These AI-powered tools handle everything from lesson scaffolding to real-time student support — each one reflecting a different vision of how intelligence can serve the classroom.',
  'amplify': 'Amplify educators have taken their deep curriculum knowledge and built something new with it. These apps extend and personalize the Amplify experience in ways only the people closest to the work could imagine.',
  'arts & design': 'Where creativity meets craft. Educators and students have built tools that open up visual arts, design thinking, and creative expression — proving that art education thrives when learners can shape their own tools.',
  'assessment & feedback': 'The community has built dozens of different approaches to understanding what students know. From quick formative checks to deep rubric-based feedback, each tool reflects a different classroom reality and a different philosophy of assessment.',
  'business / economics': 'Financial literacy, entrepreneurship, economic reasoning — educators across contexts have built tools that bring the complexity of the business world into classrooms in accessible, student-centered ways.',
  'ca community colleges': 'California\'s community college educators are building for a student population unlike any other — working adults, first-generation learners, career changers. These apps reflect that diversity and the creativity it demands.',
  'ciob': 'CIOB district educators have channeled their knowledge of their communities into tools that serve their specific students. What started as individual experiments has become a growing library of locally-rooted innovation.',
  'career & vocational': 'From resume builders to industry simulations, educators are helping students see a future beyond the classroom. These tools connect academic learning to real-world career paths in ways that feel personal and practical.',
  'creative & engagement': 'Some of the most inventive work in the community lives here. These apps use storytelling, play, and surprise to pull students in — reminding us that engagement isn\'t a trick, it\'s a design challenge.',
  'cultural studies': 'Educators have built tools that honor the richness of human culture — from indigenous traditions to diaspora histories. Each app opens a window into a different community\'s story, told with care and nuance.',
  'data-driven instruction': 'What happens when teachers can see patterns in student learning in real time? These tools turn data into something actionable, helping educators adjust their practice with clarity rather than guesswork.',
  'differentiation & access': 'Every learner arrives differently. These apps are built by educators who know that firsthand — tools that flex, adapt, and meet students where they actually are, not where a pacing guide says they should be.',
  'ela / literacy': 'Reading and writing look different in every classroom. This collection captures that range — from phonics coaches to literary analysis partners, each app shaped by an educator\'s unique understanding of how literacy grows.',
  'ell / esl': 'Language learning is deeply personal work. These tools were built by educators who understand the particular challenges and joys of supporting multilingual students — bridging languages, cultures, and confidence.',
  'elementary': 'Teaching young learners requires a special kind of imagination. These apps are playful, patient, and purposeful — built by educators who understand that the early years set the foundation for everything that follows.',
  'fairfax': 'More than 1,100 Fairfax County Public Schools students from 25 high schools designed AI-powered solutions to real-world problems as part of the Seize the Moment Student AI Innovation Challenge — shaping the future of their communities one app at a time.',
  'family & community': 'Learning doesn\'t stop at the school door. These tools help families participate in their children\'s education — bridging the gap between home and classroom with warmth and practical support.',
  'flowers': 'See how individuals across the Playlab community are building to reflect their unique contexts, roles, and goals. Each app here tells a different story — a teacher solving a problem no one else saw, a student reimagining how learning could work, a coach finding new ways to support their team. This is what it looks like when educators grow something of their own.',
  'gamified learning': 'Points, quests, narratives, challenges — educators have found countless ways to make learning feel like play. These apps prove that rigor and fun aren\'t opposites; they\'re collaborators.',
  'ghana': 'Ghana\'s educator community has embraced app-building with remarkable energy. From curriculum-aligned subject tools to creative student projects, these apps represent one of the most vibrant collections on the platform.',
  'health & pe': 'Bodies, minds, nutrition, movement — health education covers enormous ground. These apps reflect educators who see wellness holistically, building tools that meet students in the fullness of who they are.',
  'high school': 'High school students are ready for complexity. These tools rise to that — offering sophisticated support for advanced coursework, college prep, and the social-emotional challenges of adolescence.',
  'higher ed': 'College and university educators are building for a different kind of learner — self-directed, time-pressed, and hungry for depth. These apps bring AI into higher education with the rigor the context demands.',
  'illustrative mathematics': 'IM educators know their curriculum inside and out. These apps extend that expertise into new territory — interactive practice, lesson internalization, and student support that stays true to the IM philosophy.',
  'kipp': 'KIPP educators build with urgency and heart. These apps carry that energy — tools designed for specific schools, specific grade levels, and the specific belief that every student deserves an excellent education.',
  'leading educators': 'The Leading Educators community brings a coaching lens to everything they build. These apps support not just students but the professional growth of the educators who serve them.',
  'lesson planning': 'Behind every great lesson is a plan. These tools help educators think through sequence, differentiation, and timing — turning the invisible work of preparation into something more structured and shareable.',
  'math': 'Math education is a space of enormous creativity right now. From visual models to AI tutors to curriculum-aligned practice, this collection captures the community\'s many approaches to helping students think mathematically.',
  'middle school': 'Middle schoolers are figuring out who they are. These tools meet that energy — engaging, age-appropriate, and built by educators who understand the unique developmental moment of early adolescence.',
  'music & performing arts': 'Music theory, performance practice, creative composition — educators in the arts are proving that AI tools can enhance rather than replace the deeply human experience of making music and art together.',
  'nyc': 'New York City\'s educators bring the energy and diversity of the city into everything they build. These apps reflect classrooms where dozens of languages, cultures, and perspectives converge every day.',
  'niche & emerging': 'The edges are where innovation happens. These apps explore topics that don\'t fit neatly into traditional categories — unusual subjects, experimental formats, and ideas that might define tomorrow\'s classrooms.',
  'professional development': 'Educators building tools for other educators. These apps support coaching, reflection, and growth — the kind of professional learning that actually changes practice, not just checks a compliance box.',
  'project-based learning': 'PBL demands a different kind of tool — one that supports open-ended inquiry, student agency, and real-world connection. These apps help educators and students design projects that matter.',
  'reading intervention': 'When a student struggles to read, the stakes are high. These tools are built by educators who feel that urgency — targeted, evidence-informed approaches to helping every student become a reader.',
  'religious studies': 'Faith, ethics, scripture, and theology — educators in religious communities have built tools that honor the depth and sensitivity of spiritual education while embracing what technology makes newly possible.',
  'sel / wellbeing': 'Social-emotional learning isn\'t a curriculum add-on; it\'s the foundation. These tools help students develop self-awareness, empathy, and resilience — built by educators who know that wellbeing comes first.',
  'school leadership': 'Principals, coaches, and district leaders are building too. These tools tackle the operational and strategic challenges of running schools — from observation protocols to data dashboards to communication aids.',
  'science / stem': 'From biology to physics to engineering design, STEM educators are building tools that make abstract concepts tangible. The range here is extraordinary — reflecting the breadth of scientific curiosity itself.',
  'social studies / history': 'History is never just one story. These apps help students engage with primary sources, multiple perspectives, and the messy complexity of how societies work — past and present.',
  'special education': 'Every IEP tells a different story. These tools are built by educators who write those stories every day — apps that flex to meet individual needs with patience, precision, and genuine care.',
  'student-built apps': 'When students become builders, something shifts. These apps were created by learners themselves — proof that the best way to understand technology is to make something meaningful with it.',
  'study partners': 'Late nights, tough concepts, upcoming exams — these AI companions meet students in their moments of need. Each one offers a slightly different approach to the ancient art of studying together.',
  'teacher tools': 'The largest collection in the garden, and for good reason. Educators are prolific builders when given the right tools. From admin shortcuts to pedagogical experiments, this is where teacher ingenuity lives.',
  'texas': 'Everything\'s bigger in Texas, including the ambition of its educators. These apps span subjects, grade levels, and contexts — a snapshot of one state\'s growing community of builder-teachers.',
  'world languages': 'Language connects us. These apps help students learn Spanish, French, Mandarin, Arabic, and more — each one reflecting a different pedagogical tradition and a shared belief in the power of multilingualism.',
  'writing coaches': 'Writing is thinking made visible. These AI coaches help students at every stage of the writing process — brainstorming, drafting, revising — while preserving the student\'s own voice and ideas.',
  'operations and management': 'The work that keeps schools running rarely gets the spotlight. These tools tackle scheduling, communications, HR, and the thousand small decisions that shape whether a school day runs smoothly — built by the people who live that complexity every day.',
  'tutoring & practice': 'Practice makes permanent, not perfect — and these tools know the difference. Each one offers patient, adaptive support that meets students where they are and helps them build fluency through repetition that feels purposeful rather than punishing.',
};

function getCollectionDescription(col) {
  if (col.description && col.description.trim()) return col.description;
  return COLLECTION_DESCRIPTIONS[col.name.toLowerCase()] || `A curated collection of ${col.appCount} Playlab apps.`;
}

// ---- Collection Section HTML (full-width with preview apps) ----
function collectionSectionHTML(col) {
  const accentColor = col.iconColor || '#00983F';
  const iconName = getCollectionIcon(col.name);
  const countText = col.appCount ? `${col.appCount} app${col.appCount !== 1 ? 's' : ''}` : '';
  const collectionUrl = `collection.html?id=${encodeURIComponent(col.id)}`;
  const description = getCollectionDescription(col);

  // Build preview app cards
  let previewHTML = '';
  if (col.previewApps && col.previewApps.length > 0) {
    const cards = col.previewApps.map(app => {
      const desc = generateFallbackDescription(app);
      // Build tag pills (2-3 shown, +more)
      let previewTagHTML = '';
      if (app.tags && app.tags.length > 0) {
        const shown = app.tags.slice(0, 3);
        const extra = app.tags.length - 3;
        let pills = shown.map(t => `<span class="app-tag">${escapeHtml(t)}</span>`).join('');
        if (extra > 0) pills += `<span class="app-tag app-tag--more">+${extra}</span>`;
        previewTagHTML = `<div class="app-card-tags">${pills}</div>`;
      }
      const previewCreatorName = app.creator || 'Playlab Creator';
      const initials = app.creator
        ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'P';
      const creatorHTML = `<div class="app-card-creator"><span class="app-card-avatar">${escapeHtml(initials)}</span>${escapeHtml(previewCreatorName)}</div>`;
      return `
      <div class="preview-app-card" data-app-id="${escapeHtml(app.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(app.name)}">
        ${creatorHTML}
        <div class="preview-app-card-name">${escapeHtml(app.name)}</div>
        <div class="preview-app-card-desc">${escapeHtml(shortDesc(desc))}</div>
        ${previewTagHTML}
      </div>
    `;
    }).join('');
    previewHTML = `<div class="collection-preview-apps">${cards}</div>`;
  } else {
    previewHTML = `<div class="collection-section-empty">Apps coming soon</div>`;
  }

  return `
    <section class="collection-section" id="col-${escapeHtml(col.id)}" data-type="${escapeHtml(col.type || 'topic')}" style="--collection-accent: ${accentColor};">
      <div class="collection-section-header">
        <div class="collection-section-title">
          <div class="collection-section-icon" style="background-color: ${accentColor}">
            ${lucideIconHTML(iconName, 18)}
          </div>
          <h3 class="collection-section-name">${escapeHtml(col.name)}</h3>
        </div>
        <div class="collection-section-actions">
          <button class="qr-code-btn" data-url="${window.location.origin}/${escapeHtml(collectionUrl)}" data-name="${escapeHtml(col.name)}" title="Generate QR code" aria-label="Generate QR code">
            ${lucideIconHTML('qr-code', 14)}
          </button>
          <button class="share-link-btn" data-url="${window.location.origin}/${escapeHtml(collectionUrl)}" title="Copy share link" aria-label="Copy share link">
            ${lucideIconHTML('link', 14)}
          </button>
          <a href="${collectionUrl}" class="collection-section-viewall">View all →</a>
        </div>
      </div>
      <p class="collection-section-desc">${escapeHtml(truncate(description, 280))}</p>
      <div class="collection-section-meta">
        ${countText ? `<span class="collection-section-count">${countText}</span>` : ''}
      </div>
      ${previewHTML}
    </section>
  `;
}

// ---- App Card HTML ----
function appCardHTML(app) {
  const desc = generateFallbackDescription(app);

  // Creator initials for avatar — default to Playlab Creator
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator
    ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'P';

  // Build tag pills from app.tags
  let tagHTML = '';
  if (app.tags && app.tags.length > 0) {
    const shown = app.tags.slice(0, 3);
    const extra = app.tags.length - 3;
    let pills = shown.map(t => `<span class="app-tag">${escapeHtml(t)}</span>`).join('');
    if (extra > 0) pills += `<span class="app-tag app-tag--more">+${extra}</span>`;
    tagHTML = `<div class="app-card-tags">${pills}</div>`;
  }

  const starred = isStarred(app.id);
  return `
    <div class="app-card" data-app-id="${escapeHtml(app.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(app.name)}">
      <button class="app-star-btn ${starred ? 'starred' : ''}" data-app-id="${escapeHtml(app.id)}" aria-label="Star this app" title="Star this app">
        <span class="star-icon">${starred ? '★' : '☆'}</span>
        <span class="star-count">${(_starCountCache[app.id] || 0) > 0 ? _starCountCache[app.id] : ''}</span>
      </button>
      <div class="app-card-body">
        <div class="app-card-creator">
          <span class="app-card-avatar">${escapeHtml(initials)}</span>
          ${escapeHtml(creatorName)}
        </div>
        <div class="app-card-name">${escapeHtml(app.name)}</div>
        <div class="app-card-desc">${escapeHtml(shortDesc(desc))}</div>
        ${tagHTML}
      </div>
    </div>
  `;
}

// ---- Live Card Update ----
function refreshAppCard(app) {
  const desc = generateFallbackDescription(app);
  const creatorName = app.creator || 'Playlab Creator';
  const initials = app.creator
    ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'P';
  const creatorHTML = `<span class="app-card-avatar">${escapeHtml(initials)}</span>${escapeHtml(creatorName)}`;

  // Update all matching cards in-place (preserves click handlers)
  document.querySelectorAll(`.app-card[data-app-id="${app.id}"], .preview-app-card[data-app-id="${app.id}"]`).forEach(card => {
    const nameEl = card.querySelector('.app-card-name, .preview-app-card-name');
    const descEl = card.querySelector('.app-card-desc, .preview-app-card-desc');
    const creatorEl = card.querySelector('.app-card-creator');
    if (nameEl) nameEl.textContent = app.name;
    if (descEl) descEl.textContent = shortDesc(desc);
    if (creatorEl) creatorEl.innerHTML = creatorHTML;
  });
}

// ---- Empty/Error States ----
function emptyStateHTML(message) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${lucideIconHTML('search', 48)}</div>
      <h3>${escapeHtml(message)}</h3>
      <p>Try a different search term, or <a href="/">browse all collections</a>.</p>
    </div>
  `;
}

function errorStateHTML(message) {
  return `
    <div class="error-state">
      <div class="error-state-icon">${lucideIconHTML('cloud-off', 48)}</div>
      <h3>Something went wrong</h3>
      <p>${escapeHtml(message || 'Please try refreshing the page.')}</p>
    </div>
  `;
}

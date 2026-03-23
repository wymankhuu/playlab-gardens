/* ==========================================
   Playlab Gardens — Shared Utilities
   ========================================== */

// ---- Constants ----
const MAX_STAR_IDS_PER_REQUEST = 100;
const MAX_PREVIEW_TAGS = 3;
const MAX_INITIALS = 2;
const MAX_RELATED_APPS = 3;
const COPY_FEEDBACK_MS = 2000;
const MODAL_FADE_MS = 150;
const ICON_INIT_DELAY_MS = 100;
const DRAWER_TRANSITION_MS = 800;
const TRUNCATE_SHORT = 150;
const TRUNCATE_LONG = 200;
const MAX_SHORT_SENTENCES = 2;

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
  const unique = [...new Set(appIds)].slice(0, MAX_STAR_IDS_PER_REQUEST);
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
      // Bounce animation
      cardBtn.classList.remove('star-animate');
      void cardBtn.offsetWidth;
      cardBtn.classList.add('star-animate');
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
      // Bounce animation
      drawerBtn.classList.remove('star-animate');
      void drawerBtn.offsetWidth;
      drawerBtn.classList.add('star-animate');
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

// ---- Admin Pin Card Buttons (delegated) ----
document.addEventListener('click', function(e) {
  const pinBtn = e.target.closest('.admin-pin-card-btn');
  if (!pinBtn) return;
  e.stopPropagation();
  e.preventDefault();

  const appName = pinBtn.dataset.appName;
  const collectionName = pinBtn.dataset.collectionName;
  const isPinned = pinBtn.classList.contains('pinned');
  const newPinned = !isPinned;

  pinBtn.disabled = true;
  pinBtn.style.opacity = '0.5';

  togglePin(appName, newPinned, collectionName).then(function(success) {
    if (success) {
      pinBtn.classList.toggle('pinned', newPinned);
      pinBtn.title = newPinned ? 'Unpin' : 'Pin';
      pinBtn.innerHTML = lucideIconHTML(newPinned ? 'pin-off' : 'pin', 12);

      // Update the app object in memory
      const allAppsArr = getAllAppsFlat();
      const appObj = allAppsArr.find(function(a) { return a.name === appName; });
      if (appObj) appObj.pinned = newPinned;

      // Also update any other pin buttons for the same app on the page
      document.querySelectorAll('.admin-pin-card-btn[data-app-name="' + appName.replace(/"/g, '\\"') + '"]').forEach(function(btn) {
        btn.classList.toggle('pinned', newPinned);
        btn.title = newPinned ? 'Unpin' : 'Pin';
        btn.innerHTML = lucideIconHTML(newPinned ? 'pin-off' : 'pin', 12);
      });

      // Force Lucide to re-render all new icon elements
      setTimeout(function() { refreshIcons(); }, 10);
    }
    pinBtn.disabled = false;
    pinBtn.style.opacity = '';
  });
});

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
      setTimeout(() => { this.textContent = 'Copy Link'; }, COPY_FEEDBACK_MS);
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
document.addEventListener('DOMContentLoaded', initFadeUp);

// ---- Card Entrance Animations ----
function initFadeUp() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: just show everything
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-up').forEach(function(el) {
    observer.observe(el);
  });
}

// Re-observe newly added .fade-up elements (call after dynamic content)
function observeFadeUp(container) {
  if (!('IntersectionObserver' in window)) {
    (container || document).querySelectorAll('.fade-up:not(.visible)').forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  (container || document).querySelectorAll('.fade-up:not(.visible)').forEach(function(el) {
    observer.observe(el);
  });
}

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

// Auto-init lucide icons on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => refreshIcons(), ICON_INIT_DELAY_MS);
});

// ---- Drawer Panel ----
// ---- Admin Mode ----
let isAdminMode = false;
let adminPassword = '';
let currentDrawerApp = null;

// Restore admin mode from sessionStorage on load
if (sessionStorage.getItem('playlab-admin-mode') === 'true') {
  isAdminMode = true;
  adminPassword = sessionStorage.getItem('playlab-admin-pwd') || '';
}

function persistAdminState() {
  if (isAdminMode) {
    sessionStorage.setItem('playlab-admin-mode', 'true');
    sessionStorage.setItem('playlab-admin-pwd', adminPassword);
  } else {
    sessionStorage.removeItem('playlab-admin-mode');
    sessionStorage.removeItem('playlab-admin-pwd');
  }
}

function initAdminToggle() {
  const toggle = document.getElementById('admin-toggle');
  if (!toggle) return;

  // If admin mode was restored from sessionStorage, set toggle active immediately
  if (isAdminMode) {
    toggle.classList.add('admin-active');
    toggle.title = 'Exit admin mode';
  }

  toggle.addEventListener('click', () => {
    if (isAdminMode) {
      isAdminMode = false;
      adminPassword = '';
      persistAdminState();
      toggle.classList.remove('admin-active');
      toggle.title = 'Enter admin mode';
      // Re-open current app in view mode if drawer is open
      if (currentDrawerApp) openAppModal(currentDrawerApp);
    } else {
      showPasswordModal((pwd) => {
        adminPassword = pwd;
        isAdminMode = true;
        persistAdminState();
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
    setTimeout(() => modal.remove(), MODAL_FADE_MS);
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

let _savedScrollY = 0;

function openAppModal(app) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  currentDrawerApp = app;

  // Save scroll position before locking
  _savedScrollY = window.scrollY;

  // App name
  document.getElementById('drawer-app-name').textContent = app.name;

  // Creator
  const creatorSection = document.getElementById('drawer-creator');
  const creatorName = app.creator || '';
  const creatorRole = app.role || 'Teacher';
  if (creatorName) {
    creatorSection.style.display = '';
    const initials = creatorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, MAX_INITIALS);
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
        setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, COPY_FEEDBACK_MS);
      });
    };
  }

  // Related apps
  renderRelatedApps(app);

  // Admin edit panel
  renderAdminPanel(app);

  // Set drawer accent from the collection page's accent color or first tag
  const gridAccent = document.getElementById('apps-grid');
  const accentColor = gridAccent ? getComputedStyle(gridAccent).getPropertyValue('--collection-accent').trim() : '';
  if (accentColor) {
    drawer.style.setProperty('--drawer-accent', accentColor);
  }

  // Open
  overlay.classList.add('active');
  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Deep link — pushState so browser Back closes the drawer
  if (app.id) {
    history.pushState({ drawerOpen: true, appId: app.id }, '', `${window.location.pathname}${window.location.search}#app=${app.id}`);
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

  // Get collection name from app tags for pin API
  const appCollectionName = (app.tags && app.tags.length > 0) ? app.tags[0] : '';

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <i data-lucide="pen-line" style="width:14px;height:14px;"></i>
        <span>Edit App</span>
      </div>
      <button class="admin-pin-drawer-btn ${app.pinned ? 'pinned' : ''}" id="admin-pin-btn"
        data-app-name="${escapeHtml(app.name)}" data-collection-name="${escapeHtml(appCollectionName)}">
        ${lucideIconHTML(app.pinned ? 'pin-off' : 'pin', 14)}
        ${app.pinned ? 'Unpin from Homepage' : 'Pin to Homepage'}
      </button>
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

  // Pin button handler
  document.getElementById('admin-pin-btn').addEventListener('click', async function() {
    const btn = this;
    const newPinned = !app.pinned;
    const appName = btn.dataset.appName;
    const collectionName = btn.dataset.collectionName;

    btn.disabled = true;
    btn.textContent = newPinned ? 'Pinning...' : 'Unpinning...';

    const success = await togglePin(appName, newPinned, collectionName);
    if (success) {
      app.pinned = newPinned;
      btn.textContent = newPinned ? 'Pinned!' : 'Unpinned!';
      setTimeout(() => openAppModal(app), DRAWER_TRANSITION_MS);
    } else {
      btn.disabled = false;
      btn.innerHTML = `${lucideIconHTML(app.pinned ? 'pin-off' : 'pin', 14)} ${app.pinned ? 'Unpin from Homepage' : 'Pin to Homepage'}`;
      refreshIcons();
    }
  });

  refreshIcons();
}

async function togglePin(appName, pinned, collectionName) {
  try {
    const res = await fetch(apiUrl('/admin-pin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword,
        appName: appName,
        pinned: pinned,
        collectionName: collectionName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert('Pin failed: ' + (data.error || 'Unknown error'));
      return false;
    }
    return true;
  } catch (err) {
    alert('Pin failed: ' + err.message);
    return false;
  }
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
    .slice(0, MAX_RELATED_APPS);

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

let _closingViaPopstate = false;

function closeDrawer(fromPopstate) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  overlay.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';

  // Restore scroll position
  window.scrollTo(0, _savedScrollY);

  // If not triggered by popstate, go back to remove the pushState entry
  if (!fromPopstate && window.location.hash.startsWith('#app=')) {
    _closingViaPopstate = true;
    history.back();
  }
}

// Handle browser Back button → close drawer
window.addEventListener('popstate', (e) => {
  if (_closingViaPopstate) {
    _closingViaPopstate = false;
    return;
  }
  const drawer = document.getElementById('drawer');
  if (drawer && drawer.classList.contains('active')) {
    closeDrawer(true);
  }
});


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
  if (!sentences) return truncate(str, TRUNCATE_SHORT);
  const short = sentences.slice(0, MAX_SHORT_SENTENCES).join('').trim();
  return truncate(short, TRUNCATE_LONG);
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
// Descriptions are now baked into collections.json by the export script.
// This function reads from the data directly — no duplicate map needed.
function getCollectionDescription(col) {
  if (col.description && col.description.trim()) return col.description;
  return `A curated collection of ${col.appCount} Playlab apps.`;
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
        const shown = app.tags.slice(0, MAX_PREVIEW_TAGS);
        const extra = app.tags.length - 3;
        let pills = shown.map(t => `<span class="app-tag">${escapeHtml(t)}</span>`).join('');
        if (extra > 0) pills += `<span class="app-tag app-tag--more">+${extra}</span>`;
        previewTagHTML = `<div class="app-card-tags">${pills}</div>`;
      }
      const previewCreatorName = app.creator || 'Playlab Creator';
      const initials = app.creator
        ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, MAX_INITIALS)
        : 'P';
      const creatorHTML = `<div class="app-card-creator"><span class="app-card-avatar">${escapeHtml(initials)}</span>${escapeHtml(previewCreatorName)}</div>`;
      let previewPinBtn = '';
      if (isAdminMode) {
        const pinLabel = app.pinned ? 'Unpin' : 'Pin';
        previewPinBtn = `<button class="admin-pin-card-btn ${app.pinned ? 'pinned' : ''}" data-app-name="${escapeHtml(app.name)}" data-collection-name="${escapeHtml(col.name)}" title="${pinLabel}" aria-label="${pinLabel}">
          ${lucideIconHTML(app.pinned ? 'pin-off' : 'pin', 12)}
        </button>`;
      }
      return `
      <div class="preview-app-card" data-app-id="${escapeHtml(app.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(app.name)}">
        ${previewPinBtn}
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
    <section class="collection-section fade-up" id="col-${escapeHtml(col.id)}" data-type="${escapeHtml(col.type || 'topic')}" style="--collection-accent: ${accentColor};">
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
    ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, MAX_INITIALS)
    : 'P';

  // Build tag pills from app.tags
  let tagHTML = '';
  if (app.tags && app.tags.length > 0) {
    const shown = app.tags.slice(0, MAX_PREVIEW_TAGS);
    const extra = app.tags.length - 3;
    let pills = shown.map(t => `<span class="app-tag">${escapeHtml(t)}</span>`).join('');
    if (extra > 0) pills += `<span class="app-tag app-tag--more">+${extra}</span>`;
    tagHTML = `<div class="app-card-tags">${pills}</div>`;
  }

  const starred = isStarred(app.id);

  // Admin mode: flag cards missing key fields + pin button
  let adminFlag = '';
  let adminPinBtn = '';
  if (isAdminMode) {
    const missing = [];
    if (!app.creator) missing.push('creator');
    if (!app.description || !app.description.trim()) missing.push('description');
    if (!app.usage || !app.usage.trim()) missing.push('usage');
    if (!app.impact || !app.impact.trim()) missing.push('impact');
    if (missing.length > 0) {
      adminFlag = `<span class="admin-missing-dot" title="Missing: ${missing.join(', ')}">${missing.length}</span>`;
    }
    const pinLabel = app.pinned ? 'Unpin' : 'Pin';
    const colName = (app.tags && app.tags.length > 0) ? app.tags[0] : '';
    adminPinBtn = `<button class="admin-pin-card-btn ${app.pinned ? 'pinned' : ''}" data-app-name="${escapeHtml(app.name)}" data-collection-name="${escapeHtml(colName)}" title="${pinLabel}" aria-label="${pinLabel}">
      ${lucideIconHTML(app.pinned ? 'pin-off' : 'pin', 12)}
    </button>`;
  }

  return `
    <div class="app-card ${isAdminMode && adminFlag ? 'admin-missing' : ''}" data-app-id="${escapeHtml(app.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(app.name)}">
      ${adminFlag}
      ${adminPinBtn}
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
    ? app.creator.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, MAX_INITIALS)
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

/* ==========================================
   Playlab Gardens — Drawer Panel (lazy-loaded)

   This file is loaded dynamically when a user
   first opens an app detail drawer. It contains
   the star system, admin panel, related apps,
   and all drawer interaction logic.
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
  const cardBtn = document.querySelector(`.app-star-btn[data-app-id="${appId}"]`);
  if (cardBtn) {
    const countEl = cardBtn.querySelector('.star-count');
    if (countEl) countEl.textContent = count > 0 ? count : '';
  }
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

// Star button click handlers (delegated)
document.addEventListener('click', function(e) {
  const cardBtn = e.target.closest('.app-star-btn');
  if (cardBtn) {
    e.stopPropagation();
    const appId = cardBtn.dataset.appId;
    const nowStarred = toggleStar(appId);
    cardBtn.classList.toggle('starred', nowStarred);
    cardBtn.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
    const drawerStarBtn = document.getElementById('drawer-star-btn');
    if (drawerStarBtn && drawerStarBtn.dataset.appId === appId) {
      drawerStarBtn.classList.toggle('starred', nowStarred);
      drawerStarBtn.querySelector('.star-icon').innerHTML = nowStarred ? '★' : '☆';
    }
    return;
  }
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

      const allAppsArr = getAllAppsFlat();
      const appObj = allAppsArr.find(function(a) { return a.name === appName; });
      if (appObj) appObj.pinned = newPinned;

      document.querySelectorAll('.admin-pin-card-btn[data-app-name="' + appName.replace(/"/g, '\\"') + '"]').forEach(function(btn) {
        btn.classList.toggle('pinned', newPinned);
        btn.title = newPinned ? 'Unpin' : 'Pin';
        btn.innerHTML = lucideIconHTML(newPinned ? 'pin-off' : 'pin', 12);
      });

      setTimeout(function() { refreshIcons(); }, 10);
    }
    pinBtn.disabled = false;
    pinBtn.style.opacity = '';
  });
});

// ---- Admin Mode ----
// isAdminMode and adminPassword are defined in shared.js (lightweight globals)

function initAdminToggle() {
  const toggle = document.getElementById('admin-toggle');
  if (!toggle) return;

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
  const existing = document.getElementById('admin-password-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-password-modal';
  modal.className = 'admin-pw-overlay';
  modal.innerHTML = `
    <div class="admin-pw-modal">
      <div class="admin-pw-header">
        <div class="admin-pw-icon">${lucideIconHTML('lock', 20)}</div>
        <h3 class="admin-pw-title">Admin Access</h3>
        <p class="admin-pw-subtitle">Enter the password to edit apps</p>
      </div>
      <div class="admin-pw-body">
        <input type="password" class="admin-pw-input" id="admin-pw-field" placeholder="Password" autocomplete="off" autofocus>
        <p class="admin-pw-error" id="admin-pw-error"></p>
      </div>
      <div class="admin-pw-actions">
        <button class="admin-pw-cancel" id="admin-pw-cancel">Cancel</button>
        <button class="admin-pw-submit" id="admin-pw-submit">${lucideIconHTML('unlock', 14)} Enter</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  refreshIcons();

  const input = document.getElementById('admin-pw-field');
  const error = document.getElementById('admin-pw-error');
  const submitBtn = document.getElementById('admin-pw-submit');

  setTimeout(() => input.focus(), 50);

  function close() {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), MODAL_FADE_MS);
  }

  function submit() {
    const pwd = input.value.trim();
    if (!pwd) { error.textContent = 'Please enter a password'; input.focus(); return; }
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
      body: JSON.stringify({ password: adminPassword, appId: app.id, appName: app.name, ...fields }),
    });
    const data = await res.json();
    if (!res.ok) { alert('Save failed: ' + (data.error || 'Unknown error')); return false; }
    return true;
  } catch (err) { alert('Save failed: ' + err.message); return false; }
}

// ---- Drawer Init ----
let currentDrawerApp = null;

function initModal() {
  const overlay = document.getElementById('drawer-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', () => closeDrawer());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  initAdminToggle();
}

// ---- Open App Modal ----
let _savedScrollY = 0;

function openAppModal(app) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  currentDrawerApp = app;
  _savedScrollY = window.scrollY;

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

  // Description
  const aboutSection = document.getElementById('drawer-about-section');
  const descEl = document.getElementById('drawer-desc');
  aboutSection.style.display = '';
  descEl.textContent = generateFallbackDescription(app);

  // How It's Being Used
  const usageBox = document.getElementById('drawer-usage');
  if (usageBox) {
    const usageText = usageBox.querySelector('.drawer-info-box-text');
    if (app.usage) {
      usageText.textContent = app.usage;
      usageText.classList.remove('drawer-info-box-placeholder');
    } else {
      usageText.textContent = 'Usage details coming soon';
      usageText.classList.add('drawer-info-box-placeholder');
    }
  }

  // Impact
  const iterations = app.iterations || 0;
  document.getElementById('drawer-iterations').textContent = `${formatNumber(iterations)} remixes`;

  // Star button
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
    drawerStarCount.textContent = `★ ${_starCountCache[app.id] || 0}`;
    loadStarCounts([app.id]);
  }

  // Impact text
  const impactText = document.getElementById('drawer-impact-text');
  if (impactText) {
    const impactContent = app.impact || generateImpactBlurb(iterations);
    if (impactContent) { impactText.textContent = impactContent; impactText.style.display = ''; }
    else { impactText.style.display = 'none'; }
  }

  // CTA links
  const appUrl = app.url || `https://playlab.ai/project/${app.id}`;
  document.getElementById('drawer-cta').href = appUrl;
  document.getElementById('drawer-remix').href = `https://playlab.ai/remix/${app.id}`;

  // Copy link
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

  renderRelatedApps(app);
  renderAdminPanel(app);

  // Open
  overlay.classList.add('active');
  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Deep link
  if (app.id) {
    history.pushState({ drawerOpen: true, appId: app.id }, '', `${window.location.pathname}${window.location.search}#app=${app.id}`);
  }

  const closeBtn = drawer.querySelector('.drawer-close');
  if (closeBtn) closeBtn.focus();

  refreshIcons();
}

// ---- Close Drawer ----
let _closingViaPopstate = false;

function closeDrawer(fromPopstate) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  if (!overlay || !drawer) return;

  overlay.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';
  window.scrollTo(0, _savedScrollY);

  if (!fromPopstate && window.location.hash.startsWith('#app=')) {
    _closingViaPopstate = true;
    history.back();
  }
}

window.addEventListener('popstate', (e) => {
  if (_closingViaPopstate) { _closingViaPopstate = false; return; }
  const drawer = document.getElementById('drawer');
  if (drawer && drawer.classList.contains('active')) closeDrawer(true);
});

// ---- Admin Panel ----
function renderAdminPanel(app) {
  const container = document.getElementById('drawer-admin');
  if (!container) return;

  if (!isAdminMode) { container.style.display = 'none'; return; }
  container.style.display = '';

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
          <i data-lucide="book-open" style="width:12px;height:12px;opacity:0.5;"></i> How It's Being Used
        </label>
        <textarea class="admin-textarea" id="admin-usage" rows="3" placeholder="How are educators or students using this?">${escapeHtml(app.usage || '')}</textarea>
      </div>
      <div class="admin-field">
        <label class="admin-label" for="admin-impact">
          <i data-lucide="trending-up" style="width:12px;height:12px;opacity:0.5;"></i> Impact
        </label>
        <textarea class="admin-textarea" id="admin-impact" rows="3" placeholder="What difference has this made?">${escapeHtml(app.impact || '')}</textarea>
      </div>
      <div class="admin-actions">
        <button class="admin-save-btn" id="admin-save-btn">
          <i data-lucide="save" style="width:14px;height:14px;"></i> Save to Database
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
      refreshAppCard(app);
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = 'Save to Database'; btn.disabled = false; openAppModal(app); }, 1000);
    } else {
      btn.textContent = 'Save to Database';
      btn.disabled = false;
    }
  });

  document.getElementById('admin-pin-btn').addEventListener('click', async function() {
    const btn = this;
    const newPinned = !app.pinned;
    btn.disabled = true;
    btn.textContent = newPinned ? 'Pinning...' : 'Unpinning...';

    const success = await togglePin(btn.dataset.appName, newPinned, btn.dataset.collectionName);
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
      body: JSON.stringify({ password: adminPassword, appName, pinned, collectionName }),
    });
    const data = await res.json();
    if (!res.ok) { alert('Pin failed: ' + (data.error || 'Unknown error')); return false; }
    return true;
  } catch (err) { alert('Pin failed: ' + err.message); return false; }
}

// ---- Related Apps ----
let _allAppsFlat = null;

function getAllAppsFlat() {
  if (_allAppsFlat) return _allAppsFlat;
  const collections = (typeof allCollections !== 'undefined') ? allCollections : [];
  const seen = new Set();
  _allAppsFlat = [];
  for (const col of collections) {
    const apps = col.previewApps || col.apps || [];
    for (const app of apps) {
      if (!seen.has(app.id)) { seen.add(app.id); _allAppsFlat.push(app); }
    }
  }
  if (typeof allApps !== 'undefined') {
    for (const app of allApps) {
      if (!seen.has(app.id)) { seen.add(app.id); _allAppsFlat.push(app); }
    }
  }
  return _allAppsFlat;
}

function renderRelatedApps(app) {
  const container = document.getElementById('drawer-related');
  if (!container) return;
  if (!app.tags || app.tags.length === 0) { container.style.display = 'none'; return; }

  const all = getAllAppsFlat();
  const scored = all
    .filter(a => a.id !== app.id && a.tags)
    .map(a => ({ app: a, shared: a.tags.filter(t => app.tags.includes(t)).length }))
    .filter(s => s.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, MAX_RELATED_APPS);

  if (scored.length === 0) { container.style.display = 'none'; return; }

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

  container.querySelectorAll('.drawer-related-item').forEach(item => {
    const relId = item.dataset.appId;
    const relApp = all.find(a => a.id === relId);
    if (relApp) { item.addEventListener('click', () => openAppModal(relApp)); item.style.cursor = 'pointer'; }
  });
}

// ---- Signal ready ----
// Load star counts for any visible cards
setTimeout(() => {
  const cards = document.querySelectorAll('.app-star-btn[data-app-id]');
  const ids = [...cards].map(c => c.dataset.appId).filter(Boolean);
  if (ids.length > 0) loadStarCounts(ids);
}, 500);

// Signal that drawer is ready and process any queued open calls
window._drawerReady = true;
if (window._drawerQueue) {
  window._drawerQueue.forEach(app => openAppModal(app));
  window._drawerQueue = null;
}

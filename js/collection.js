/* ==========================================
   Playlab Gardens — Collection Page
   ========================================== */

let allApps = [];
let collectionSearchQuery = '';
let activeTagFilters = new Set();
document.addEventListener('DOMContentLoaded', async () => {
  initModal();
  initCollectionSearch();
  highlightNavForCollection();
  await loadCollection();
  checkCollectionDeepLink();
});

function highlightNavForCollection() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id === 'flowers') {
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.href.includes('id=flowers')) a.classList.add('active');
    });
  }
}

function checkCollectionDeepLink() {
  const hash = window.location.hash;
  if (!hash.startsWith('#app=')) return;
  const appId = hash.slice(5);
  if (!appId) return;
  const app = allApps.find(a => a.id === appId);
  if (app) openAppModal(app);
}

async function loadCollection() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('No collection specified.');
    return;
  }

  const appsGrid = document.getElementById('apps-grid');
  const appsCount = document.getElementById('apps-count');

  renderSkeletons(appsGrid, 6, 'skeleton-app-card');

  try {
    const [data, labelsData] = await Promise.all([
      fetchJSON(apiUrl(`/collection/${encodeURIComponent(id)}`)),
      fetchJSON(apiUrl('/app-labels')).catch(() => null),
    ]);

    if (labelsData && labelsData.labels) {
      mergeLabelsIntoApps(data.apps, labelsData.labels);
    }

    allApps = data.apps;

    renderCollectionHeader(data);
    buildCollectionDropdownFilters();
    renderApps();
    refreshIcons();
  } catch (err) {
    console.error('Failed to load collection:', err);
    appsGrid.innerHTML = errorStateHTML('Could not load this collection.');
    refreshIcons();
  }
}

function renderApps() {
  const appsGrid = document.getElementById('apps-grid');
  const appsCount = document.getElementById('apps-count');

  let filtered = allApps;

  // Apply search query
  if (collectionSearchQuery) {
    const q = collectionSearchQuery.toLowerCase();
    filtered = filtered.filter(app =>
      app.name.toLowerCase().includes(q) ||
      (app.description || '').toLowerCase().includes(q) ||
      (app.creator || '').toLowerCase().includes(q)
    );
  }

  // Apply tag filters
  if (activeTagFilters.size > 0) {
    filtered = filtered.filter(app => {
      if (!app.tags) return false;
      return [...activeTagFilters].some(tag => app.tags.includes(tag));
    });
  }

  if (filtered.length === 0) {
    appsGrid.innerHTML = emptyStateHTML('No apps match the selected filters');
    appsCount.textContent = '0 apps in this collection';
  } else {
    appsGrid.innerHTML = filtered.map(appCardHTML).join('');
    appsCount.textContent = `${filtered.length} app${filtered.length !== 1 ? 's' : ''} in this collection`;
    attachAppCardListeners(appsGrid, filtered);
  }
  refreshIcons();
}

function buildCollectionDropdownFilters() {
  const container = document.getElementById('collection-filters');
  const group = document.getElementById('collection-filter-group');
  if (!container || !group) return;

  // Collect all unique tags from apps
  const tagCounts = {};
  for (const app of allApps) {
    if (!app.tags) continue;
    for (const tag of app.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  if (sortedTags.length === 0) return;

  container.style.display = '';

  // Build a single "Filter by collection" dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'filter-dropdown';
  dropdown.innerHTML = `
    <button class="filter-dropdown-btn" aria-haspopup="listbox" aria-expanded="false">
      Also in <span class="filter-arrow">&#9662;</span>
    </button>
    <div class="filter-dropdown-menu" role="group" style="text-align:left;">
      ${sortedTags.map(tag => `
        <label class="filter-dropdown-item" data-value="${escapeHtml(tag)}">
          <input type="checkbox" value="${escapeHtml(tag)}">
          <span>${escapeHtml(tag)}</span>
        </label>
      `).join('')}
    </div>
  `;
  group.appendChild(dropdown);

  const btn = dropdown.querySelector('.filter-dropdown-btn');
  const menu = dropdown.querySelector('.filter-dropdown-menu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    btn.setAttribute('aria-expanded', !isOpen);
  });

  menu.addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.type !== 'checkbox') return;
    if (cb.checked) activeTagFilters.add(cb.value);
    else activeTagFilters.delete(cb.value);
    cb.closest('.filter-dropdown-item').classList.toggle('checked', cb.checked);
    btn.classList.toggle('has-selection', activeTagFilters.size > 0);
    renderApps();
  });

  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
}

function renderCollectionHeader(col) {
  const icon = document.getElementById('collection-icon');
  const title = document.getElementById('collection-title');
  const desc = document.getElementById('collection-desc');
  const orgContext = document.getElementById('collection-org-context');

  const color = col.iconColor || '#00983F';
  const iconName = getCollectionIcon(col.name);

  icon.style.backgroundColor = color;
  icon.innerHTML = lucideIconHTML(iconName, 28);
  title.textContent = col.name;
  desc.textContent = getCollectionDescription(col);

  // Set hero accent color and background image by type
  const hero = document.querySelector('.collection-hero');
  if (hero) {
    hero.style.setProperty('--accent', color);

    // Pick hero image based on collection type/category
    const lower = col.name.toLowerCase();
    const subjectNames = ['science', 'stem', 'math', 'ela', 'literacy', 'social studies', 'history', 'arts', 'design', 'business', 'economics', 'cultural', 'religious', 'health', 'pe', 'music', 'performing', 'world languages', 'illustrative'];
    const gradeNames = ['elementary', 'middle school', 'high school', 'higher ed'];
    const isFlowers = lower === 'flowers';

    let heroImage = 'beat-5.png'; // default
    if (isFlowers) heroImage = 'beat-2.png';
    else if (col.type === 'org') heroImage = 'beat-3.png';
    else if (subjectNames.some(s => lower.includes(s))) heroImage = 'beat-1.png';
    else if (gradeNames.some(g => lower.includes(g))) heroImage = 'beat-6.png';
    else heroImage = 'beat-5.png'; // use cases

    hero.style.backgroundImage = `url('images/${heroImage}')`;
  }

  // Org collection treatment
  if (col.type === 'org') {
    orgContext.classList.remove('hidden');
    document.getElementById('collection-org-name').textContent = col.name.replace(/\s*Showcase\s*/i, '') + ' Organization';
  }

  // Update page title and OG meta
  document.title = `${col.name} — Playlab Gardens`;
  const colDesc = getCollectionDescription(col);
  updateMeta('description', colDesc);
  updateMeta('og:title', `${col.name} — Playlab Community Gardens`);
  updateMeta('og:description', colDesc);
  updateMeta('twitter:title', `${col.name} — Playlab Community Gardens`);
  updateMeta('twitter:description', colDesc);

  // Wire up share/QR buttons
  const pageUrl = window.location.href;
  const qrBtn = document.getElementById('collection-qr-btn');
  const shareBtn = document.getElementById('collection-share-btn');
  if (qrBtn) {
    qrBtn.dataset.url = pageUrl;
    qrBtn.dataset.name = col.name;
  }
  if (shareBtn) {
    shareBtn.dataset.url = pageUrl;
  }

  refreshIcons();
}

function showError(message) {
  const appsGrid = document.getElementById('apps-grid');
  appsGrid.innerHTML = errorStateHTML(message);
  refreshIcons();
}

// ---- Collection Search ----
function initCollectionSearch() {
  const input = document.getElementById('collection-search-input');
  const clearBtn = document.getElementById('collection-search-clear');
  if (!input) return;

  let timeout;
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.classList.toggle('visible', q.length > 0);
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      collectionSearchQuery = q;
      renderApps();
    }, 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      clearBtn.classList.remove('visible');
      collectionSearchQuery = '';
      renderApps();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    collectionSearchQuery = '';
    renderApps();
    input.focus();
  });
}

// ---- App Card Click → Modal ----
function attachAppCardListeners(container, apps) {
  container.querySelectorAll('.app-card').forEach((card) => {
    const appId = card.dataset.appId;
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    const handler = (e) => {
      if (e.target.closest('.admin-pin-card-btn')) return;
      openAppModal(app);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(e);
      }
    });
  });
}

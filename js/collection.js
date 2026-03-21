/* ==========================================
   Playlab Gardens — Collection Page
   ========================================== */

let allApps = [];
let activeFilterPills = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  initModal();
  await loadCollection();
  checkCollectionDeepLink();
});

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
      loadOverrides(),
    ]);

    // Merge labels and overrides into apps
    if (labelsData && labelsData.labels) {
      mergeLabelsIntoApps(data.apps, labelsData.labels);
    }
    mergeOverridesIntoApps(data.apps);

    allApps = data.apps;

    renderCollectionHeader(data);
    buildFilterPills();
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

  // Apply filter pills
  if (activeFilterPills.size > 0) {
    filtered = allApps.filter(app => {
      if (!app.labels) return false;
      const appLabelSet = [
        ...(app.labels.subjects || []),
        ...(app.labels.grades || []),
        ...(app.labels.useCases || []),
      ];
      // App must have at least one of the selected labels
      return [...activeFilterPills].some(label => appLabelSet.includes(label));
    });
  }

  if (filtered.length === 0) {
    appsGrid.innerHTML = emptyStateHTML('No apps match the selected filters');
    appsCount.textContent = '0 apps';
  } else {
    appsGrid.innerHTML = filtered.map(appCardHTML).join('');
    appsCount.textContent = `${filtered.length} app${filtered.length !== 1 ? 's' : ''}`;
    attachAppCardListeners(appsGrid, filtered);
  }
  refreshIcons();
}

function buildFilterPills() {
  const container = document.getElementById('filter-pills');
  if (!container) return;

  // Collect all unique labels from apps in this collection
  const labelCounts = {};
  for (const app of allApps) {
    if (!app.labels) continue;
    const allLabels = [
      ...(app.labels.subjects || []).map(l => ({ label: l, category: 'subject' })),
      ...(app.labels.grades || []).map(l => ({ label: l, category: 'grade' })),
      ...(app.labels.useCases || []).map(l => ({ label: l, category: 'useCase' })),
    ];
    for (const { label, category } of allLabels) {
      if (!labelCounts[label]) {
        labelCounts[label] = { count: 0, category };
      }
      labelCounts[label].count++;
    }
  }

  // Sort: grades first, then subjects, then use cases, then by count
  const categoryOrder = { grade: 0, subject: 1, useCase: 2 };
  const sorted = Object.entries(labelCounts)
    .sort((a, b) => {
      const catDiff = (categoryOrder[a[1].category] || 9) - (categoryOrder[b[1].category] || 9);
      if (catDiff !== 0) return catDiff;
      return b[1].count - a[1].count;
    });

  if (sorted.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  container.innerHTML = sorted.map(([label]) =>
    `<button class="filter-pill" data-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`
  ).join('') + '<button class="filter-pill-clear" style="display:none;">Clear filters</button>';

  // Attach click handlers
  container.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const label = pill.dataset.label;
      if (activeFilterPills.has(label)) {
        activeFilterPills.delete(label);
        pill.classList.remove('active');
      } else {
        activeFilterPills.add(label);
        pill.classList.add('active');
      }
      // Show/hide clear button
      const clearBtn = container.querySelector('.filter-pill-clear');
      if (clearBtn) {
        clearBtn.style.display = activeFilterPills.size > 0 ? '' : 'none';
      }
      renderApps();
    });
  });

  // Clear button
  const clearBtn = container.querySelector('.filter-pill-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      activeFilterPills.clear();
      container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      clearBtn.style.display = 'none';
      renderApps();
    });
  }
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

  refreshIcons();
}

function showError(message) {
  const appsGrid = document.getElementById('apps-grid');
  appsGrid.innerHTML = errorStateHTML(message);
  refreshIcons();
}

// ---- App Card Click → Modal ----
function attachAppCardListeners(container, apps) {
  container.querySelectorAll('.app-card').forEach((card) => {
    const appId = card.dataset.appId;
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    const handler = () => openAppModal(app);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  });
}

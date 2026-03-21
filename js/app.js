/* ==========================================
   Playlab Gardens — Home Page
   ========================================== */

let allCollections = [];
let filterOptions = null;
let activeDropdownFilters = { subject: new Set(), grade: new Set(), useCase: new Set(), org: new Set() };

document.addEventListener('DOMContentLoaded', async () => {
  initModal();
  initSearch();
  await loadCollections();
  checkDeepLink();
});

// ---- Load Collections ----
async function loadCollections() {
  const collectionsGrid = document.getElementById('collections-grid');

  renderSkeletons(collectionsGrid, 6, 'skeleton-card');

  try {
    const [data, labelsData] = await Promise.all([
      fetchJSON(apiUrl('/collections')),
      fetchJSON(apiUrl('/app-labels')).catch(() => null),
    ]);

    allCollections = data;

    if (labelsData) {
      filterOptions = labelsData.filterOptions;
      initDropdownFilters();
      restoreFiltersFromURL();
    }

    renderFilteredCollections();
    refreshIcons();
  } catch (err) {
    console.error('Failed to load collections:', err);
    collectionsGrid.innerHTML = errorStateHTML('Could not load collections.');
    refreshIcons();
  }
}

// ---- Render Collections ----
function renderFilteredCollections() {
  const collectionsGrid = document.getElementById('collections-grid');
  const collectionsCount = document.getElementById('collections-count');

  let filtered = [...allCollections];
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  // Apply dropdown filters
  const hasDropdownFilter = Object.values(activeDropdownFilters).some(s => s.size > 0);
  if (hasDropdownFilter) {
    filtered = filtered.filter(col => {
      const colNameLower = col.name.toLowerCase();
      for (const [category, selectedLabels] of Object.entries(activeDropdownFilters)) {
        if (selectedLabels.size === 0) continue;
        if (category === 'org') {
          if (col.type !== 'org') return false;
          const matches = [...selectedLabels].some(label =>
            colNameLower.includes(label.toLowerCase()) || label.toLowerCase().includes(colNameLower)
          );
          if (!matches) return false;
        } else {
          const matches = [...selectedLabels].some(label =>
            colNameLower.includes(label.toLowerCase()) || label.toLowerCase().includes(colNameLower)
          );
          if (!matches) return false;
        }
      }
      return true;
    });
  }

  // Group collections by type
  const subjectNames = ['science / stem', 'math', 'ela / literacy', 'social studies / history', 'arts & design', 'business / economics', 'cultural studies', 'religious studies', 'health & pe', 'music & performing arts', 'world languages', 'illustrative mathematics'];
  const gradeNames = ['elementary', 'middle school', 'high school', 'higher ed'];
  const orgCheck = (name) => ['ghana', 'nyc', 'texas', 'fairfax', 'ciob', 'kipp', 'ca community colleges', 'amplify', 'leading educators'].some(o => name.toLowerCase().includes(o));

  const groups = [
    { title: 'Subjects', collections: [] },
    { title: 'Grade Levels', collections: [] },
    { title: 'Use Cases', collections: [] },
    { title: 'Organizations', collections: [] },
  ];

  for (const col of filtered) {
    const lower = col.name.toLowerCase();
    if (subjectNames.some(s => lower.includes(s) || s.includes(lower))) {
      groups[0].collections.push(col);
    } else if (gradeNames.some(g => lower.includes(g) || g.includes(lower))) {
      groups[1].collections.push(col);
    } else if (orgCheck(col.name)) {
      groups[3].collections.push(col);
    } else {
      groups[2].collections.push(col);
    }
  }

  let html = '';
  for (const group of groups) {
    if (group.collections.length === 0) continue;
    html += `<div class="collection-group">
      <h3 class="collection-group-title">${group.title}</h3>
      ${group.collections.map(c => collectionSectionHTML(c)).join('')}
    </div>`;
  }
  collectionsGrid.innerHTML = html;

  attachPreviewCardListeners(collectionsGrid, filtered);
  collectionsCount.textContent = `${filtered.length} collections`;

  // Show/hide clear filters button
  updateClearFiltersBtn();

  refreshIcons();
}

// ---- Filter URL State ----
function syncFiltersToURL() {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(activeDropdownFilters)) {
    if (values.size > 0) {
      params.set(key, [...values].join(','));
    }
  }
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  history.replaceState(null, '', newUrl);
}

function restoreFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['subject', 'grade', 'useCase', 'org']) {
    const val = params.get(key);
    if (val) {
      val.split(',').forEach(v => activeDropdownFilters[key].add(v));
    }
  }

  // Update UI checkboxes to match
  for (const [key, values] of Object.entries(activeDropdownFilters)) {
    if (values.size === 0) continue;
    const dropdown = document.querySelector(`[data-category="${key}"]`);
    if (!dropdown) continue;
    const btn = dropdown.querySelector('.filter-dropdown-btn');
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (values.has(cb.value)) {
        cb.checked = true;
        cb.closest('.filter-dropdown-item')?.classList.add('checked');
      }
    });
    if (btn) btn.classList.toggle('has-selection', values.size > 0);
  }
}

// ---- Clear All Filters ----
function updateClearFiltersBtn() {
  const hasFilter = Object.values(activeDropdownFilters).some(s => s.size > 0);
  let btn = document.getElementById('clear-all-filters');

  if (hasFilter && !btn) {
    btn = document.createElement('button');
    btn.id = 'clear-all-filters';
    btn.className = 'clear-filters-btn';
    btn.textContent = 'Clear all filters';
    btn.addEventListener('click', clearAllFilters);
    const filterGroup = document.getElementById('label-filters');
    if (filterGroup) filterGroup.appendChild(btn);
  } else if (!hasFilter && btn) {
    btn.remove();
  }
}

function clearAllFilters() {
  for (const key of Object.keys(activeDropdownFilters)) {
    activeDropdownFilters[key].clear();
  }
  // Uncheck all checkboxes
  document.querySelectorAll('.filter-dropdown-item input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.filter-dropdown-item')?.classList.remove('checked');
  });
  document.querySelectorAll('.filter-dropdown-btn').forEach(btn => {
    btn.classList.remove('has-selection');
  });
  syncFiltersToURL();
  renderFilteredCollections();
}

// ---- Dropdown Filters ----
function initDropdownFilters() {
  if (!filterOptions) return;

  const labelFilters = document.getElementById('label-filters');
  if (!labelFilters) return;

  labelFilters.style.display = '';

  const orgOptions = allCollections
    .filter(c => c.type === 'org')
    .map(c => c.name)
    .sort();

  const categories = [
    { key: 'subject', options: filterOptions.subjects },
    { key: 'grade', options: filterOptions.grades },
    { key: 'useCase', options: filterOptions.useCases },
    { key: 'org', options: orgOptions },
  ];

  for (const { key, options } of categories) {
    const dropdown = labelFilters.querySelector(`[data-category="${key}"]`);
    if (!dropdown) continue;

    const menu = dropdown.querySelector('.filter-dropdown-menu');
    const btn = dropdown.querySelector('.filter-dropdown-btn');

    menu.innerHTML = options.map(opt => `
      <label class="filter-dropdown-item" data-value="${escapeHtml(opt)}">
        <input type="checkbox" value="${escapeHtml(opt)}">
        <span>${escapeHtml(opt)}</span>
      </label>
    `).join('');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) {
        menu.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    menu.addEventListener('change', (e) => {
      const checkbox = e.target;
      if (checkbox.type !== 'checkbox') return;

      if (checkbox.checked) {
        activeDropdownFilters[key].add(checkbox.value);
      } else {
        activeDropdownFilters[key].delete(checkbox.value);
      }

      checkbox.closest('.filter-dropdown-item').classList.toggle('checked', checkbox.checked);
      btn.classList.toggle('has-selection', activeDropdownFilters[key].size > 0);

      syncFiltersToURL();
      renderFilteredCollections();
    });
  }

  document.addEventListener('click', () => closeAllDropdowns());
  labelFilters.addEventListener('click', (e) => {
    if (e.target.closest('.filter-dropdown-menu')) e.stopPropagation();
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.filter-dropdown-menu.open').forEach(menu => menu.classList.remove('open'));
  document.querySelectorAll('.filter-dropdown-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

// ---- Search ----
let searchTimeout;

function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.classList.toggle('visible', q.length > 0);
    clearTimeout(searchTimeout);
    if (q.length === 0) {
      hideSearchResults();
      return;
    }
    searchTimeout = setTimeout(() => performSearch(q), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchTimeout);
      const q = input.value.trim();
      if (q) performSearch(q);
    }
    if (e.key === 'Escape') hideSearchResults();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    hideSearchResults();
    input.focus();
  });

  // Close search dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) hideSearchResults();
  });
}

async function performSearch(query) {
  const dropdown = getSearchDropdown();
  dropdown.innerHTML = '<div class="search-dropdown-loading">Searching...</div>';
  dropdown.classList.add('open');

  try {
    const data = await fetchJSON(apiUrl('/search', { q: query }));

    if (data.results.length === 0) {
      dropdown.innerHTML = '<div class="search-dropdown-empty">No apps found</div>';
    } else {
      const shown = data.results.slice(0, 8);
      dropdown.innerHTML = shown.map(app => `
        <div class="search-dropdown-item" data-app-id="${escapeHtml(app.id)}">
          <div class="search-dropdown-name">${escapeHtml(app.name)}</div>
          <div class="search-dropdown-desc">${escapeHtml(truncate(app.description || '', 80))}</div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
        const appId = item.dataset.appId;
        const app = data.results.find(a => a.id === appId);
        if (app) {
          item.addEventListener('click', () => {
            openAppModal(app);
            hideSearchResults();
          });
        }
      });
    }
  } catch (err) {
    dropdown.innerHTML = '<div class="search-dropdown-empty">Search failed</div>';
  }
}

function getSearchDropdown() {
  let dropdown = document.getElementById('search-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.className = 'search-dropdown';
    document.querySelector('.search-container').appendChild(dropdown);
  }
  return dropdown;
}

function hideSearchResults() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

// ---- Deep Link to App ----
function checkDeepLink() {
  const hash = window.location.hash;
  if (!hash.startsWith('#app=')) return;
  const appId = hash.slice(5);
  if (!appId) return;

  // Search all preview apps across collections
  for (const col of allCollections) {
    if (!col.previewApps) continue;
    const app = col.previewApps.find(a => a.id === appId);
    if (app) {
      openAppModal(app);
      return;
    }
  }
}

// ---- Preview Card Click → Modal ----
function attachPreviewCardListeners(container, collections) {
  const allPreviewApps = [];
  for (const col of collections) {
    if (col.previewApps) allPreviewApps.push(...col.previewApps);
  }

  container.querySelectorAll('.preview-app-card').forEach((card) => {
    const appId = card.dataset.appId;
    const app = allPreviewApps.find(a => a.id === appId);
    if (!app) return;

    const handler = () => openAppModal(app);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
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
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

/* ==========================================
   Playlab Gardens — Home Page
   ========================================== */

let allCollections = [];

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
    const data = await fetchJSON(apiUrl('/collections'));
    allCollections = data;
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

  // Build jump nav + sections
  const activeGroups = groups.filter(g => g.collections.length > 0);
  const jumpNav = `<nav class="jump-nav" aria-label="Jump to section">
    ${activeGroups.map(g => {
      const slug = g.title.toLowerCase().replace(/\s+/g, '-');
      return `<a href="#section-${slug}" class="jump-nav-link">${g.title}</a>`;
    }).join('')}
  </nav>`;

  // Build a lookup map from collection ID to collection data for lazy rendering
  const collectionMap = new Map();
  for (const col of filtered) {
    collectionMap.set(col.id, col);
  }

  let html = jumpNav;
  for (const group of activeGroups) {
    const slug = group.title.toLowerCase().replace(/\s+/g, '-');
    const pills = group.collections.map(c => {
      const anchorId = `col-${c.id}`;
      return `<a href="#${anchorId}" class="section-pill" data-collection-id="${escapeHtml(c.id)}">${escapeHtml(c.name)} <span class="section-pill-count">${c.appCount}</span></a>`;
    }).join('');

    // Render group headers and pills immediately; collection sections as placeholders
    const placeholders = group.collections.map(c =>
      `<div class="collection-section-placeholder" id="col-${escapeHtml(c.id)}" data-collection-id="${escapeHtml(c.id)}" style="min-height:320px;"></div>`
    ).join('');

    html += `<div class="collection-group" id="section-${slug}">
      <h3 class="collection-group-title">${group.title}</h3>
      <div class="section-pills">${pills}</div>
      ${placeholders}
    </div>`;
  }
  collectionsGrid.innerHTML = html;

  // Highlight active jump nav link on scroll
  initJumpNavHighlight();

  // Lazy-load collection sections as they approach the viewport
  const lazyObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const placeholder = entry.target;
      const colId = placeholder.dataset.collectionId;
      const col = collectionMap.get(colId);
      if (!col) continue;

      // Stop observing this placeholder
      observer.unobserve(placeholder);

      // Replace placeholder with full section HTML
      const temp = document.createElement('div');
      temp.innerHTML = collectionSectionHTML(col);
      const section = temp.firstElementChild;
      placeholder.replaceWith(section);

      // Render icons for the new section
      refreshIcons();

      // Attach preview card listeners scoped to this section
      attachPreviewCardListeners(section, [col]);
    }
  }, { rootMargin: '200px' });

  // Observe all placeholders
  collectionsGrid.querySelectorAll('.collection-section-placeholder').forEach(el => {
    lazyObserver.observe(el);
  });
  collectionsCount.textContent = `${filtered.length} collections`;

  // Smooth scroll for section pills
  collectionsGrid.addEventListener('click', (e) => {
    const pill = e.target.closest('.section-pill');
    if (!pill) return;
    const href = pill.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) {
      const offset = 140;
      window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
    }
  });

  refreshIcons();
}

// ---- Jump Nav Scroll Highlight ----
function initJumpNavHighlight() {
  const nav = document.querySelector('.jump-nav');
  if (!nav) return;

  const links = nav.querySelectorAll('.jump-nav-link');
  const sections = [...links].map(link => {
    const id = link.getAttribute('href').slice(1);
    return document.getElementById(id);
  }).filter(Boolean);

  // Smooth scroll on click
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        const offset = nav.offsetHeight + 80;
        window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });

  // Highlight on scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY + 200;
      let active = null;
      for (const section of sections) {
        if (section.offsetTop <= scrollY) active = section;
      }
      links.forEach(link => {
        const id = link.getAttribute('href').slice(1);
        link.classList.toggle('active', active && active.id === id);
      });
      ticking = false;
    });
  });
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
    // Search collections first
    const q = query.toLowerCase();
    const matchedCollections = allCollections.filter(col =>
      col.name.toLowerCase().includes(q)
    ).slice(0, 4);

    // Then search apps/builders
    const data = await fetchJSON(apiUrl('/search', { q: query }));
    const matchedApps = data.results.slice(0, 6);

    if (matchedCollections.length === 0 && matchedApps.length === 0) {
      dropdown.innerHTML = '<div class="search-dropdown-empty">No results found</div>';
    } else {
      let html = '';

      // Collections section
      if (matchedCollections.length > 0) {
        html += '<div class="search-dropdown-section-label">Collections</div>';
        html += matchedCollections.map(col => `
          <a href="collection.html?id=${encodeURIComponent(col.id)}" class="search-dropdown-item search-dropdown-collection">
            <div class="search-dropdown-name">${escapeHtml(col.name)}</div>
            <div class="search-dropdown-desc">${escapeHtml(truncate(col.description || col.appCount + ' apps', 80))}</div>
          </a>
        `).join('');
      }

      // Apps/Builders section
      if (matchedApps.length > 0) {
        html += '<div class="search-dropdown-section-label">Apps & Builders</div>';
        html += matchedApps.map(app => `
          <div class="search-dropdown-item" data-app-id="${escapeHtml(app.id)}">
            <div class="search-dropdown-name">${escapeHtml(app.name)}</div>
            <div class="search-dropdown-desc">${escapeHtml(truncate(app.description || '', 80))}</div>
          </div>
        `).join('');
      }

      dropdown.innerHTML = html;

      // Attach click handlers for app results
      dropdown.querySelectorAll('.search-dropdown-item[data-app-id]').forEach(item => {
        const appId = item.dataset.appId;
        const app = data.results.find(a => a.id === appId);
        if (app) {
          item.addEventListener('click', () => {
            openAppModal(app);
            hideSearchResults();
          });
        }
      });

      // Collection links close dropdown on click
      dropdown.querySelectorAll('.search-dropdown-collection').forEach(item => {
        item.addEventListener('click', () => hideSearchResults());
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

    const handler = (e) => {
      if (e.target.closest('.admin-pin-card-btn')) return;
      openAppModal(app);
    };
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

    const handler = (e) => {
      if (e.target.closest('.admin-pin-card-btn')) return;
      openAppModal(app);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
    });
  });
}

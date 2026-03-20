/* ==========================================
   Playlab Gardens — Home Page
   ========================================== */

// Featured collection names (hand-picked)
const FEATURED_NAMES = [
  'flowers',
  'project-based learning',
  'nyc showcase',
];

let allCollections = [];

document.addEventListener('DOMContentLoaded', async () => {
  initModal();
  initSearch();
  await loadCollections();
});

// ---- Load Collections ----
async function loadCollections() {
  const featuredGrid = document.getElementById('featured-grid');
  const collectionsGrid = document.getElementById('collections-grid');
  const collectionsCount = document.getElementById('collections-count');

  // Show skeletons
  renderSkeletons(featuredGrid, 3, 'skeleton-card');
  renderSkeletons(collectionsGrid, 6, 'skeleton-card');

  try {
    const data = await fetchJSON(apiUrl('/collections'));
    allCollections = data;

    // Render featured
    const featured = pickFeatured(data);
    featuredGrid.innerHTML = featured.map(c => collectionCardHTML(c, true)).join('');

    // Render all collections
    collectionsGrid.innerHTML = data.map(c => collectionCardHTML(c, false)).join('');
    collectionsCount.textContent = `${data.length} collections`;
  } catch (err) {
    console.error('Failed to load collections:', err);
    featuredGrid.innerHTML = '';
    collectionsGrid.innerHTML = errorStateHTML('Could not load collections.');
  }
}

function pickFeatured(collections) {
  const featured = [];

  for (const name of FEATURED_NAMES) {
    const match = collections.find(c =>
      c.name.toLowerCase().includes(name)
    );
    if (match) featured.push(match);
  }

  // Fill remaining slots with the first non-featured collections
  while (featured.length < 3 && collections.length > featured.length) {
    const next = collections.find(c => !featured.includes(c));
    if (next) featured.push(next);
    else break;
  }

  return featured.slice(0, 3);
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
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    hideSearchResults();
    input.focus();
  });
}

async function performSearch(query) {
  const resultsSection = document.getElementById('search-results');
  const resultsGrid = document.getElementById('search-results-grid');
  const resultsTitle = document.getElementById('search-results-title');
  const resultsCount = document.getElementById('search-results-count');
  const mainContent = document.getElementById('main-content');

  // Show search results, hide main
  resultsSection.classList.add('active');
  mainContent.classList.add('hidden');

  // Loading
  renderSkeletons(resultsGrid, 4, 'skeleton-app-card');
  resultsTitle.textContent = `Results for "${query}"`;
  resultsCount.textContent = 'Searching...';

  try {
    const data = await fetchJSON(apiUrl('/search', { q: query }));

    if (data.results.length === 0) {
      resultsGrid.innerHTML = emptyStateHTML(`No apps found for "${query}"`);
      resultsCount.textContent = '0 results';
    } else {
      resultsGrid.innerHTML = data.results.map(appCardHTML).join('');
      resultsCount.textContent = `${data.results.length} result${data.results.length !== 1 ? 's' : ''}`;
      attachAppCardListeners(resultsGrid, data.results);
    }
  } catch (err) {
    console.error('Search failed:', err);
    resultsGrid.innerHTML = errorStateHTML('Search failed. Please try again.');
    resultsCount.textContent = '';
  }
}

function hideSearchResults() {
  const resultsSection = document.getElementById('search-results');
  const mainContent = document.getElementById('main-content');
  resultsSection.classList.remove('active');
  mainContent.classList.remove('hidden');
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

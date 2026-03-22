/* ==========================================
   Playlab Gardens — Seeds Page
   ========================================== */

let _seedsData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadSeeds();
  initSeedsSearch();
});

async function loadSeeds() {
  const grid = document.getElementById('seeds-grid');

  try {
    _seedsData = await fetchJSON('/data/seeds.json');

    const collections = _seedsData.collections || [];
    const allSeeds = _seedsData.seeds || (Array.isArray(_seedsData) ? _seedsData : []);

    if (collections.length === 0 && allSeeds.length === 0) {
      grid.innerHTML = `
        <div class="seeds-empty">
          <div class="seeds-empty-icon">🌱</div>
          <h3>Seeds are sprouting</h3>
          <p>Starter templates are on the way. Check back soon to find your first seed to plant.</p>
        </div>
      `;
      return;
    }

    if (collections.length > 0) {
      grid.innerHTML = renderSeedSections(collections);
    } else {
      grid.innerHTML = allSeeds.map(seedPreviewCard).join('');
    }
  } catch (err) {
    console.error('Failed to load seeds:', err);
  }
}

function seedPreviewCard(seed) {
  const tagPills = seed.tags && seed.tags.length > 0
    ? seed.tags.slice(0, 3).map(t => `<span class="app-tag">${escapeHtml(t)}</span>`).join('')
    : '';
  const tagHTML = tagPills ? `<div class="app-card-tags">${tagPills}</div>` : '';

  return `
    <div class="seed-card-mini">
      <div class="seed-card-mini-name">${escapeHtml(seed.name)}</div>
      <div class="seed-card-mini-desc">${escapeHtml(shortDesc(seed.description))}</div>
      ${tagHTML}
      ${seed.remixUrl ? `<a href="${escapeHtml(seed.remixUrl)}" target="_blank" rel="noopener" class="seed-card-cta" onclick="event.stopPropagation()">Plant this seed →</a>` : ''}
    </div>
  `;
}

function renderSeedSections(collections) {
  return collections.map(col => {
    const previewHTML = col.apps.slice(0, 6).map(seedPreviewCard).join('');
    const accentColor = col.color || '#2D7A3A';

    const descHTML = col.description
      ? `<p class="seed-collection-desc">${escapeHtml(col.description)}</p>`
      : '';

    const shareUrl = `${window.location.origin}/collection.html?id=${col.id}`;

    return `
      <div class="seed-collection-section" style="--seed-accent: ${accentColor};">
        <div class="seed-collection-header">
          <div class="seed-collection-header-left">
            <img class="seed-collection-flower" src="${escapeHtml(col.image)}" alt="">
            <div class="seed-collection-meta">
              <h3 class="seed-collection-title">${escapeHtml(col.name)}</h3>
              <span class="seed-collection-count">${col.apps.length} seed${col.apps.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="seed-collection-actions">
            <button class="qr-code-btn" data-url="${escapeHtml(shareUrl)}" data-name="${escapeHtml(col.name)}" title="Generate QR code" aria-label="Generate QR code">
              <i data-lucide="qr-code" style="width:16px;height:16px;"></i>
            </button>
            <button class="share-link-btn" data-url="${escapeHtml(shareUrl)}" title="Copy share link" aria-label="Copy share link">
              <i data-lucide="link" style="width:16px;height:16px;"></i>
            </button>
            <a href="collection.html?id=${escapeHtml(col.id)}" class="seed-show-all-btn">View all →</a>
          </div>
        </div>
        ${descHTML}
        <div class="seed-collection-cards">
          ${previewHTML}
        </div>
      </div>
    `;
  }).join('');
}

// ---- Search ----
function initSeedsSearch() {
  const input = document.getElementById('seeds-search-input');
  const clearBtn = document.getElementById('seeds-search-clear');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    clearBtn.style.display = q ? '' : 'none';
    filterSeeds(q);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    filterSeeds('');
    input.focus();
  });
}

function filterSeeds(query) {
  const grid = document.getElementById('seeds-grid');
  if (!_seedsData) return;

  const allSeeds = _seedsData.seeds || [];
  const collections = _seedsData.collections || [];

  if (!query) {
    // Show collections view
    if (collections.length > 0) {
      grid.innerHTML = renderSeedSections(collections);
    } else {
      grid.innerHTML = allSeeds.map(seedPreviewCard).join('');
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Filter all seeds by query
  const matches = allSeeds.filter(s =>
    s.name.toLowerCase().includes(query) ||
    (s.description || '').toLowerCase().includes(query) ||
    (s.tags || []).some(t => t.toLowerCase().includes(query))
  );

  if (matches.length === 0) {
    grid.innerHTML = `
      <div class="seeds-empty">
        <div class="seeds-empty-icon">🔍</div>
        <h3>No seeds found</h3>
        <p>Try a different search term.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `<div class="seeds-search-results">${matches.map(seedPreviewCard).join('')}</div>`;
}


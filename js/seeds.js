/* ==========================================
   Playlab Gardens — Seeds Page
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSeeds();
});

async function loadSeeds() {
  const grid = document.getElementById('seeds-grid');

  try {
    const data = await fetchJSON('/data/seeds.json');

    const collections = data.collections || [];
    const allSeeds = data.seeds || (Array.isArray(data) ? data : []);

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

    const viewAllHTML = `<a href="collection.html?id=${escapeHtml(col.id)}" class="seed-show-all-btn">View all →</a>`;

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
          ${viewAllHTML}
        </div>
        ${descHTML}
        <div class="seed-collection-cards">
          ${previewHTML}
        </div>
      </div>
    `;
  }).join('');
}

// Toggle show all seeds in a section
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.seed-show-all-btn');
  if (!btn) return;
  const colId = btn.dataset.collectionId;
  const allGrid = document.getElementById(`seed-all-${colId}`);
  if (!allGrid) return;

  if (allGrid.style.display === 'none') {
    allGrid.style.display = '';
    btn.textContent = 'Show fewer ←';
  } else {
    allGrid.style.display = 'none';
    btn.textContent = 'View all →';
  }
});

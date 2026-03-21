/* ==========================================
   Playlab Gardens — Seeds Page
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSeeds();
});

async function loadSeeds() {
  const grid = document.getElementById('seeds-grid');

  try {
    const seeds = await fetchJSON('/data/seeds.json');

    if (!seeds || seeds.length === 0) {
      grid.innerHTML = `
        <div class="seeds-empty">
          <div class="seeds-empty-icon">🌱</div>
          <h3>Seeds are sprouting</h3>
          <p>Starter templates are on the way. Check back soon to find your first seed to plant.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = seeds.map(seedCardHTML).join('');
  } catch (err) {
    console.error('Failed to load seeds:', err);
  }
}

function seedCardHTML(seed) {
  const tagPills = seed.tags && seed.tags.length > 0
    ? `<div class="seed-tags">${seed.tags.map(t => `<span class="seed-tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const creatorHTML = seed.creator
    ? `<div class="seed-creator">by ${escapeHtml(seed.creator)}</div>`
    : '';

  const ctaUrl = seed.remixUrl || 'https://playlab.ai';

  return `
    <div class="seed-card">
      <div class="seed-card-icon">🌱</div>
      <h3 class="seed-card-name">${escapeHtml(seed.name)}</h3>
      <p class="seed-card-desc">${escapeHtml(seed.description)}</p>
      ${tagPills}
      ${creatorHTML}
      <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener" class="seed-card-cta">Plant this seed →</a>
    </div>
  `;
}

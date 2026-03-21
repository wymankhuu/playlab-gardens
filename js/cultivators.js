/* ==========================================
   Playlab Gardens — Cultivators Page
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await loadCultivators();
});

async function loadCultivators() {
  const grid = document.getElementById('cultivators-grid');

  try {
    const cultivators = await fetchJSON('/data/cultivators.json');

    if (!cultivators || cultivators.length === 0) {
      grid.innerHTML = `
        <div class="cultivators-empty">
          <div class="cultivators-empty-icon">🌱</div>
          <h3>Coming soon</h3>
          <p>Cultivator profiles are on the way. Check back to meet the builders behind the apps.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = cultivators.map(cultivatorCardHTML).join('');
  } catch (err) {
    console.error('Failed to load cultivators:', err);
    grid.innerHTML = `
      <div class="cultivators-empty">
        <p>Could not load cultivator profiles. Please try again later.</p>
      </div>
    `;
  }
}

function cultivatorCardHTML(c) {
  const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const headshotHTML = c.headshotUrl
    ? `<img src="${escapeHtml(c.headshotUrl)}" alt="${escapeHtml(c.name)}" class="cultivator-headshot">`
    : `<div class="cultivator-avatar">${escapeHtml(initials)}</div>`;

  const roleOrg = [c.role, c.organization].filter(Boolean).join(' · ');

  const blogHTML = c.blogLink
    ? `<a href="${escapeHtml(c.blogLink)}" target="_blank" rel="noopener" class="cultivator-blog-link">Read their story →</a>`
    : '';

  return `
    <article class="cultivator-card">
      <div class="cultivator-header">
        ${headshotHTML}
        <div class="cultivator-info">
          <h2 class="cultivator-name">${escapeHtml(c.name)}</h2>
          ${roleOrg ? `<p class="cultivator-role">${escapeHtml(roleOrg)}</p>` : ''}
        </div>
      </div>
      ${c.about ? `<div class="cultivator-section"><p class="cultivator-about">${escapeHtml(c.about)}</p></div>` : ''}
      ${c.usage ? `
        <div class="cultivator-section">
          <h3 class="cultivator-section-title">How They're Using Playlab</h3>
          <p class="cultivator-section-text">${escapeHtml(c.usage)}</p>
        </div>
      ` : ''}
      ${c.impact ? `
        <div class="cultivator-section">
          <h3 class="cultivator-section-title">Impact</h3>
          <p class="cultivator-section-text">${escapeHtml(c.impact)}</p>
        </div>
      ` : ''}
      ${blogHTML}
    </article>
  `;
}

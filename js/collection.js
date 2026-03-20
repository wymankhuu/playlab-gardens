/* ==========================================
   Playlab Gardens — Collection Page
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initModal();
  await loadCollection();
});

async function loadCollection() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('No collection specified.');
    return;
  }

  const headerSection = document.getElementById('collection-header');
  const appsGrid = document.getElementById('apps-grid');
  const appsCount = document.getElementById('apps-count');

  // Show loading
  renderSkeletons(appsGrid, 6, 'skeleton-app-card');

  try {
    const data = await fetchJSON(apiUrl(`/collection/${encodeURIComponent(id)}`));

    // Render header
    renderCollectionHeader(data);

    // Render apps
    if (data.apps.length === 0) {
      appsGrid.innerHTML = emptyStateHTML('No apps in this collection yet');
      appsCount.textContent = '0 apps';
    } else {
      appsGrid.innerHTML = data.apps.map(appCardHTML).join('');
      appsCount.textContent = `${data.apps.length} app${data.apps.length !== 1 ? 's' : ''}`;
      attachAppCardListeners(appsGrid, data.apps);
    }
  } catch (err) {
    console.error('Failed to load collection:', err);
    appsGrid.innerHTML = errorStateHTML('Could not load this collection.');
  }
}

function renderCollectionHeader(col) {
  const accentBar = document.getElementById('collection-accent-bar');
  const icon = document.getElementById('collection-icon');
  const title = document.getElementById('collection-title');
  const desc = document.getElementById('collection-desc');
  const orgContext = document.getElementById('collection-org-context');

  const color = col.iconColor || '#00983F';
  accentBar.style.backgroundColor = color;
  icon.style.backgroundColor = color;
  icon.textContent = col.iconEmoji || '📚';
  title.textContent = col.name;
  desc.textContent = col.description || '';

  // Org collection treatment
  if (col.type === 'org') {
    orgContext.classList.remove('hidden');
    document.getElementById('collection-org-name').textContent = col.name.replace(/\s*Showcase\s*/i, '') + ' Organization';
  }
}

function showError(message) {
  const appsGrid = document.getElementById('apps-grid');
  appsGrid.innerHTML = errorStateHTML(message);
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

/* ==========================================
   Playlab Gardens — Shared Layout Components

   Renders nav, footer, drawer, and scroll-top
   so they're defined in one place instead of
   copy-pasted across 5 HTML files.
   ========================================== */

(function () {
  const NAV_LINKS = [
    { href: '/', label: 'Gardens' },
    { href: 'collection.html?id=flowers', label: 'Flowers' },
    { href: 'seeds.html', label: 'Seeds' },
    { href: 'cultivators.html', label: 'Cultivators' },
    { href: 'share.html', label: 'Share your app' },
  ];

  const FOOTER_LINKS = [
    { href: 'seeds.html', label: 'Seeds' },
    { href: 'collection.html?id=flowers', label: 'Flowers' },
    { href: '/', label: 'Gardens' },
    { href: 'cultivators.html', label: 'Cultivators' },
    { href: 'share.html', label: 'Share Your App' },
    { href: 'https://playlab.ai', label: 'Start Building', external: true },
  ];

  // Detect which nav link is active based on current path
  function getActivePath() {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path.endsWith('collection.html') && search.includes('id=flowers')) return 'collection.html?id=flowers';
    if (path.endsWith('seeds.html')) return 'seeds.html';
    if (path.endsWith('cultivators.html')) return 'cultivators.html';
    if (path.endsWith('share.html')) return 'share.html';
    if (path === '/' || path.endsWith('index.html')) return '/';
    return '';
  }

  function renderNav() {
    const target = document.getElementById('layout-nav');
    if (!target) return;

    const activePath = getActivePath();
    const linksHTML = NAV_LINKS.map(function (link) {
      const isActive = link.href === activePath ? ' class="active"' : '';
      return '<li><a href="' + link.href + '"' + isActive + '>' + link.label + '</a></li>';
    }).join('');

    target.outerHTML =
      '<nav class="nav" role="navigation" aria-label="Main navigation">' +
        '<div class="nav-inner">' +
          '<a href="/" class="nav-logo">' +
            '<img src="images/favicon.webp" alt="Playlab" class="nav-logo-img">' +
            'Playlab Gardens' +
          '</a>' +
          '<ul class="nav-links">' + linksHTML + '</ul>' +
          '<a href="https://playlab.ai" class="nav-cta" target="_blank" rel="noopener">Start Building</a>' +
          '<button class="mobile-menu-btn" aria-label="Open menu">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<line x1="3" y1="6" x2="21" y2="6"/>' +
              '<line x1="3" y1="12" x2="21" y2="12"/>' +
              '<line x1="3" y1="18" x2="21" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</nav>';
  }

  function renderFooter() {
    const target = document.getElementById('layout-footer');
    if (!target) return;

    var linksHTML = FOOTER_LINKS.map(function (link) {
      var extra = link.external ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + link.href + '"' + extra + '>' + link.label + '</a>';
    }).join('');

    target.outerHTML =
      '<footer class="footer">' +
        '<div class="footer-inner container">' +
          '<div class="footer-links">' + linksHTML + '</div>' +
          '<p class="footer-tagline">Brought to you by Playlab Education Inc., a 501(c)3 nonprofit.<br>&copy; 2026 Playlab Education Inc.</p>' +
        '</div>' +
      '</footer>';
  }

  function renderDrawer() {
    var target = document.getElementById('layout-drawer');
    if (!target) return;

    target.outerHTML =
      '<div id="drawer-overlay" class="drawer-overlay"></div>' +
      '<aside id="drawer" class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-app-name">' +
        '<div class="drawer-header">' +
          '<span class="drawer-header-title">App Details</span>' +
          '<div class="drawer-header-actions">' +
            '<span id="drawer-star-count" class="drawer-star-count" data-app-id="">★ 0</span>' +
            '<button id="admin-toggle" class="admin-toggle" title="Enter admin mode" aria-label="Toggle admin mode">' +
              '<i data-lucide="lock" style="width:16px;height:16px;"></i>' +
            '</button>' +
            '<button class="drawer-close" aria-label="Close" onclick="closeDrawer()">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="drawer-body">' +
          '<div class="drawer-app-name-row">' +
            '<h2 id="drawer-app-name" class="drawer-app-name"></h2>' +
            '<button id="drawer-star-btn" class="drawer-star-btn" data-app-id="" aria-label="Star this app">' +
              '<span class="star-icon">☆</span>' +
            '</button>' +
          '</div>' +
          '<div id="drawer-creator" class="drawer-creator">' +
            '<span id="drawer-creator-avatar" class="drawer-creator-avatar"></span>' +
            '<div class="drawer-creator-info">' +
              '<span id="drawer-creator-name" class="drawer-creator-name"></span>' +
              '<span id="drawer-creator-role" class="drawer-creator-role">Teacher</span>' +
            '</div>' +
          '</div>' +
          '<div id="drawer-about-section">' +
            '<div class="drawer-section-label">About</div>' +
            '<p id="drawer-desc" class="drawer-desc"></p>' +
          '</div>' +
          '<div id="drawer-usage" class="drawer-info-box">' +
            '<div class="drawer-info-box-header">' +
              '<i data-lucide="book-open" class="drawer-info-box-icon"></i>' +
              '<span class="drawer-info-box-title">How It\'s Being Used</span>' +
            '</div>' +
            '<p class="drawer-info-box-text drawer-info-box-placeholder">Usage details coming soon</p>' +
          '</div>' +
          '<div id="drawer-impact" class="drawer-info-box">' +
            '<div class="drawer-info-box-header">' +
              '<i data-lucide="trending-up" class="drawer-info-box-icon"></i>' +
              '<span class="drawer-info-box-title">Impact</span>' +
            '</div>' +
            '<div class="drawer-impact-stats">' +
              '<div class="drawer-stat">' +
                '<i data-lucide="shuffle" class="drawer-stat-icon"></i>' +
                '<span id="drawer-iterations">0 remixes</span>' +
              '</div>' +
            '</div>' +
            '<p id="drawer-impact-text" class="drawer-info-box-text"></p>' +
          '</div>' +
          '<div id="drawer-labels" class="drawer-labels" style="display:none;"></div>' +
          '<div id="drawer-admin" style="display:none;"></div>' +
          '<div id="drawer-related" style="display:none;"></div>' +
          '<div class="drawer-actions">' +
            '<a id="drawer-cta" href="#" class="drawer-btn-primary" target="_blank" rel="noopener">Open in Playlab →</a>' +
            '<a id="drawer-remix" href="#" class="drawer-btn-secondary" target="_blank" rel="noopener">Remix this App</a>' +
            '<button id="drawer-copy-link" class="drawer-btn-tertiary">Copy Link</button>' +
          '</div>' +
        '</div>' +
      '</aside>';
  }

  function renderScrollTop() {
    var target = document.getElementById('layout-scroll-top');
    if (!target) return;
    target.outerHTML = '<button class="scroll-top-btn" id="scroll-top" aria-label="Scroll to top">↑</button>';
  }

  // Run immediately (script is loaded with defer, so DOM is ready)
  renderNav();
  renderFooter();
  renderDrawer();
  renderScrollTop();
})();

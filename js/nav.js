(function () {
  "use strict";

  // Unregister any stale ServiceWorker to prevent CSS/JS caching issues
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) {
        registration.unregister();
      });
    });
  }

  const NAV_HTML = `
    <div class="nav-search-box">
      <div class="nav-search-input-wrapper">
        <span class="nav-search-icon">🔍</span>
        <input type="text" id="nav-global-search" class="nav-search-input" placeholder="Rechercher un monstre, boss, avis, équipement..." autocomplete="off" aria-label="Recherche rapide">
      </div>
      <div id="nav-global-search-results" class="nav-search-results-dropdown" style="display: none;"></div>
    </div>
    <a href="index.html" class="nav-link" data-nav="home">Accueil</a>
    <a href="equipements.html" class="nav-link" data-nav="equipements">💎 Équipements</a>
    <div class="nav-dropdown">
      <a href="bestiaires.html" class="nav-link nav-dropdown-trigger" data-nav="bestiaires">
        👾 Bestiaires <span class="nav-chevron" aria-hidden="true">▾</span>
      </a>
      <div class="nav-dropdown-menu" role="menu" aria-label="Sous-menu Bestiaires">
        <a href="avis.html" class="nav-dropdown-link" data-nav="avis" role="menuitem">🎯 Avis de Recherche</a>
        <a href="donjons.html" class="nav-dropdown-link" data-nav="donjons" role="menuitem">👑 Boss &amp; Donjons</a>
        <a href="bestiaire.html" class="nav-dropdown-link" data-nav="mobs" role="menuitem">📖 Bestiaire Complet</a>
      </div>
    </div>
    <a href="songes.html" class="nav-link" data-nav="songes">🌌 Songes Infinis</a>
  `;

  function resolveNavContext() {
    let section = document.body.dataset.navSection;
    let child = document.body.dataset.navChild;

    if (!section) {
      const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
      const map = {
        "index.html": { section: "home" },
        "equipements.html": { section: "equipements" },
        "bestiaires.html": { section: "bestiaires" },
        "avis.html": { section: "bestiaires", child: "avis" },
        "donjons.html": { section: "bestiaires", child: "donjons" },
        "bestiaire.html": { section: "bestiaires", child: "mobs" },
        "songes.html": { section: "songes" }
      };

      if (page === "detail.html") {
        const type = new URLSearchParams(window.location.search).get("type");
        if (type === "equipment") {
          section = "equipements";
        } else {
          section = "bestiaires";
          child = type === "donjon" ? "donjons" : type === "mob" ? "mobs" : "avis";
        }
      } else if (map[page]) {
        section = map[page].section;
        child = map[page].child;
      }
    }

    return { section, child };
  }

  function applyActiveStates(section, child) {
    if (section === "home") {
      document.querySelector('[data-nav="home"]')?.classList.add("active");
    }
    if (section === "songes") {
      document.querySelector('[data-nav="songes"]')?.classList.add("active");
    }
    if (section === "bestiaires") {
      document.querySelector('[data-nav="bestiaires"]')?.classList.add("active");
      if (child) {
        document.querySelector(`.nav-dropdown-link[data-nav="${child}"]`)?.classList.add("active");
      }
    }
  }

  function setupDropdowns() {
    document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      if (!trigger) return;

      trigger.addEventListener("click", (e) => {
        if (window.matchMedia("(hover: none)").matches) {
          const open = dropdown.classList.toggle("is-open");
          if (open) e.preventDefault();
        }
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-dropdown")) {
        document.querySelectorAll(".nav-dropdown.is-open").forEach((d) => d.classList.remove("is-open"));
      }
    });
  }

  let navSearchCache = null;

  async function loadNavSearchData() {
    if (navSearchCache) return navSearchCache;
    try {
      const [avisRes, donjonsRes, mobsRes, equipRes] = await Promise.all([
        fetch("data/avis.json").then(r => r.ok ? r.json() : []),
        fetch("data/donjons.json").then(r => r.ok ? r.json() : []),
        fetch("data/mobs.json").then(r => r.ok ? r.json() : []),
        fetch("data/equipements.json").then(r => r.ok ? r.json() : [])
      ]);
      navSearchCache = { avis: avisRes, donjons: donjonsRes, mobs: mobsRes, equip: equipRes };
    } catch (e) {
      navSearchCache = { avis: [], donjons: [], mobs: [], equip: [] };
    }
    return navSearchCache;
  }

  function normalizeText(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setupGlobalNavSearch() {
    const searchInput = document.getElementById("nav-global-search");
    const resultsContainer = document.getElementById("nav-global-search-results");
    if (!searchInput || !resultsContainer) return;

    let debounceTimer = null;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = normalizeText(e.target.value);

      if (query.length < 2) {
        resultsContainer.style.display = "none";
        resultsContainer.innerHTML = "";
        return;
      }

      debounceTimer = setTimeout(async () => {
        const data = await loadNavSearchData();
        const matches = [];

        // 1. Avis
        data.avis.forEach(item => {
          const norm = normalizeText(`${item.name} ${item.title || ''} ${item.filter || ''}`);
          if (norm.includes(query)) {
            matches.push({
              type: "avis",
              name: item.name,
              sub: item.title || item.filter || "Avis de recherche",
              slug: item.slug,
              pic: item.picture,
              badgeCls: "nav-badge-avis",
              badgeLabel: "🎯 Avis"
            });
          }
        });

        // 2. Donjons / Boss
        data.donjons.forEach(item => {
          const norm = normalizeText(`${item.name} ${item.boss_name || ''}`);
          if (norm.includes(query)) {
            matches.push({
              type: "donjon",
              name: item.boss_name || item.name,
              sub: item.name,
              slug: item.slug,
              pic: item.picture,
              badgeCls: "nav-badge-donjon",
              badgeLabel: "👑 Boss"
            });
          }
        });

        // 3. Mobs
        data.mobs.forEach(item => {
          const norm = normalizeText(`${item.name} ${item.subarea || ''}`);
          if (norm.includes(query)) {
            matches.push({
              type: "mob",
              name: item.name,
              sub: item.subarea || `Niveau ${item.level_range}`,
              slug: item.slug,
              pic: item.picture,
              badgeCls: "nav-badge-mob",
              badgeLabel: "👾 Monstre"
            });
          }
        });

        // 4. Equipements
        data.equip.forEach(item => {
          const norm = normalizeText(`${item.name} ${item.type || ''}`);
          if (norm.includes(query)) {
            matches.push({
              type: "equipment",
              id: item.ankama_id,
              name: item.name,
              sub: `${item.type} • Niv. ${item.level}`,
              slug: item.slug,
              pic: item.icon_url || item.hd_url,
              badgeCls: "nav-badge-equipment",
              badgeLabel: "💎 Objet"
            });
          }
        });

        if (matches.length === 0) {
          resultsContainer.style.display = "block";
          resultsContainer.innerHTML = `<div class="nav-search-item" style="color: var(--text-muted); font-size:0.85rem; justify-content:center;">Aucun résultat pour "${escapeHtml(query)}"</div>`;
          return;
        }

        resultsContainer.style.display = "flex";
        resultsContainer.innerHTML = matches.slice(0, 8).map(m => {
          const href = `detail.html?type=${m.type}&${m.type === 'equipment' ? 'id=' + m.id : 'slug=' + m.slug}`;
          const picSrc = m.pic ? encodeURI(m.pic) : 'favicon.svg';
          return `
            <a href="${href}" class="nav-search-item" data-type="${m.type}" data-slug="${m.slug || ''}" data-id="${m.id || ''}">
              <img src="${picSrc}" alt="${escapeHtml(m.name)}" class="nav-search-thumb" onerror="this.src='favicon.svg';">
              <div class="nav-search-info">
                <span class="nav-search-title">${escapeHtml(m.name)}</span>
                <span class="nav-search-sub">${escapeHtml(m.sub)}</span>
              </div>
              <span class="nav-search-badge ${m.badgeCls}">${m.badgeLabel}</span>
            </a>
          `;
        }).join("");
      }, 150);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-search-box")) {
        resultsContainer.style.display = "none";
      }
    });

    // Save click state before navigation for detail recovery
    resultsContainer.addEventListener("click", (e) => {
      const itemEl = e.target.closest(".nav-search-item");
      if (itemEl && itemEl.dataset.type) {
        sessionStorage.setItem("last_detail_type", itemEl.dataset.type);
        if (itemEl.dataset.slug) sessionStorage.setItem("last_detail_slug", itemEl.dataset.slug);
        if (itemEl.dataset.id) sessionStorage.setItem("last_detail_id", itemEl.dataset.id);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("site-nav");
    if (!nav) return;

    nav.innerHTML = NAV_HTML;
    const { section, child } = resolveNavContext();
    applyActiveStates(section, child);
    setupDropdowns();
    setupGlobalNavSearch();
  });
})();

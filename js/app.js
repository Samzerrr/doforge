(function () {
  "use strict";

  // State
  let state = {
    activeTab: "avis", // 'avis', 'donjons', 'songes', 'mobs'
    activeFilterAvis: "all",
    activeFilterDonjons: "all",
    activeFilterSonges: "all",
    activeFilterMobs: "all",
    searchQuery: "",
    avisData: [],
    donjonsData: [],
    mobsData: []
  };

  // DOM Elements
  const elements = {
    loading: document.getElementById("loading"),
    noResults: document.getElementById("no-results"),
    resultsCount: document.getElementById("results-count"),
    searchInput: document.getElementById("search-input"),
    countAvisBadge: document.getElementById("count-avis-badge"),
    countDonjonsBadge: document.getElementById("count-donjons-badge"),
    countMobsBadge: document.getElementById("count-mobs-badge"),
    gridAvis: document.getElementById("grid-avis"),
    gridDonjons: document.getElementById("grid-donjons"),
    gridSonges: document.getElementById("grid-songes"),
    gridMobs: document.getElementById("grid-mobs"),
    filtersAvis: document.getElementById("filters-avis"),
    filtersDonjons: document.getElementById("filters-donjons"),
    filtersSonges: document.getElementById("filters-songes"),
    filtersMobs: document.getElementById("filters-mobs"),
    homeSearchResults: document.getElementById("home-search-results"),
    toast: document.getElementById("toast"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    navLinks: document.querySelectorAll(".nav-link")
  };

  const zoneNames = {
    "astrub": "Astrub",
    "chateau-amakna": "Château d'Amakna",
    "base-justiciers": "Base des Justiciers",
    "saharach": "Saharach",
    "frigost": "Frigost",
    "dimension-divine": "Dimension Divine",
    "profondeurs-sufokia": "Profondeurs de Sufokia",
    "alignement": "Alignement"
  };

  const levelNames = {
    "niveaux-1-50": "Niv. 1-50",
    "niveaux-51-100": "Niv. 51-100",
    "niveaux-101-150": "Niv. 101-150",
    "niveaux-151-190": "Niv. 151-190",
    "niveaux-191-200": "Niv. 191-200"
  };

  const monsterIcons = ["👹", "👾", "🐉", "💀", "👺", "👻", "🔥", "⚡", "🕸️", "🕷️", "🤖", "⚔️"];

  function getRandomIcon(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return monsterIcons[Math.abs(hash) % monsterIcons.length];
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    if (!elements.toast) return;
    elements.toast.textContent = msg;
    elements.toast.classList.add("show");
    setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2000);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 "[${text}]" copié !`);
    }).catch(err => {
      console.error("Copy failed", err);
    });
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", async () => {
    detectPageTab();
    setupEventListeners();
    await loadAllData();
  });

  function detectPageTab() {
    const page = document.body.dataset.page;
    if (page) {
      state.activeTab = page;
    }
  }

  function setupEventListeners() {
    if (elements.filtersAvis) {
      elements.filtersAvis.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          elements.filtersAvis.querySelector(".filter-pill.active")?.classList.remove("active");
          pill.classList.add("active");
          state.activeFilterAvis = pill.dataset.filter;
          render();
        });
      });
    }

    if (elements.filtersDonjons) {
      elements.filtersDonjons.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          elements.filtersDonjons.querySelector(".filter-pill.active")?.classList.remove("active");
          pill.classList.add("active");
          state.activeFilterDonjons = pill.dataset.filter;
          render();
        });
      });
    }

    if (elements.filtersSonges) {
      elements.filtersSonges.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          elements.filtersSonges.querySelector(".filter-pill.active")?.classList.remove("active");
          pill.classList.add("active");
          state.activeFilterSonges = pill.dataset.filter;
          render();
        });
      });
    }

    if (elements.filtersMobs) {
      elements.filtersMobs.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          elements.filtersMobs.querySelector(".filter-pill.active")?.classList.remove("active");
          pill.classList.add("active");
          state.activeFilterMobs = pill.dataset.filter;
          render();
        });
      });
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener("input", (e) => {
        state.searchQuery = normalizeText(e.target.value);
        if (document.body.classList.contains("home-page")) {
          handleHomeSearch(state.searchQuery);
        } else {
          render();
        }
      });
    }
  }

  function handleHomeSearch(query) {
    if (!elements.homeSearchResults) return;

    if (!query || query.length < 2) {
      elements.homeSearchResults.style.display = "none";
      elements.homeSearchResults.innerHTML = "";
      return;
    }

    const matches = [];

    // Search Avis
    state.avisData.forEach(item => {
      const norm = normalizeText(`${item.name} ${item.title} ${zoneNames[item.filter] || ""}`);
      if (norm.includes(query)) {
        matches.push({ type: "avis", name: item.name, sub: zoneNames[item.filter] || "Avis de recherche", slug: item.slug, pic: item.picture, badge: "🎯 Avis" });
      }
    });

    // Search Donjons
    state.donjonsData.forEach(item => {
      const norm = normalizeText(`${item.name} ${item.boss_name} ${levelNames[item.filter] || ""}`);
      if (norm.includes(query)) {
        matches.push({ type: "donjon", name: item.boss_name || item.name, sub: item.name, slug: item.slug, pic: item.picture, badge: "👑 Boss" });
      }
    });

    // Search Mobs
    state.mobsData.forEach(item => {
      const norm = normalizeText(`${item.name} ${item.subarea || ""}`);
      if (norm.includes(query)) {
        matches.push({ type: "mob", name: item.name, sub: item.subarea || `Niv. ${item.level_range}`, slug: item.slug, pic: item.picture, badge: "👾 Monstre" });
      }
    });

    if (matches.length === 0) {
      elements.homeSearchResults.style.display = "block";
      elements.homeSearchResults.innerHTML = `<div class="dropdown-item no-match">Aucun monstre trouvé pour "${escapeHtml(query)}"</div>`;
      return;
    }

    elements.homeSearchResults.style.display = "block";
    elements.homeSearchResults.innerHTML = matches.slice(0, 10).map(m => `
      <a href="detail.html?type=${m.type}&slug=${m.slug}" class="dropdown-item">
        <div class="dropdown-thumb">
          ${m.pic ? `<img src="${encodeURI(m.pic)}" alt="${escapeHtml(m.name)}" />` : `<span>${getRandomIcon(m.name)}</span>`}
        </div>
        <div class="dropdown-info">
          <strong class="dropdown-name">${escapeHtml(m.name)}</strong>
          <span class="dropdown-sub">${escapeHtml(m.sub)}</span>
        </div>
        <span class="dropdown-badge badge-${m.type}">${m.badge}</span>
      </a>
    `).join("");
  }

  async function loadAllData() {
    try {
      if (elements.loading) elements.loading.style.display = "flex";

      const [resAvis, resDonjons, resMobs] = await Promise.all([
        fetch("data/avis.json"),
        fetch("data/donjons.json"),
        fetch("data/mobs.json").catch(() => null)
      ]);

      if (!resAvis.ok || !resDonjons.ok) {
        throw new Error("Erreur de chargement des fichiers de données JSON.");
      }

      state.avisData = await resAvis.json();
      state.donjonsData = await resDonjons.json();
      state.mobsData = resMobs && resMobs.ok ? await resMobs.json() : [];

      if (elements.countAvisBadge) elements.countAvisBadge.textContent = `${state.avisData.length} Avis`;
      if (elements.countDonjonsBadge) elements.countDonjonsBadge.textContent = `${state.donjonsData.length} Donjons`;
      if (elements.countMobsBadge) elements.countMobsBadge.textContent = `${state.mobsData.length} Mobs`;

      if (elements.loading) elements.loading.style.display = "none";

      if (elements.gridAvis) buildGridAvis();
      if (elements.gridDonjons) buildGridDonjons();
      if (elements.gridSonges) buildGridSonges();
      if (elements.gridMobs) buildGridMobs();
      
      render();

    } catch (err) {
      console.error(err);
      if (elements.loading) {
        elements.loading.innerHTML = `
          <div style="color: var(--color-danger); text-align: center;">
            ❌ Erreur lors du chargement des données.
          </div>
        `;
      }
    }
  }

  function normalizeText(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function getImageHtml(picture, name) {
    if (picture) {
      const safePic = encodeURI(picture);
      const safeName = escapeHtml(name);
      return `<img src="${safePic}" alt="${safeName}" class="card-img" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="card-mob-icon" style="display:none;">${getRandomIcon(name)}</div>`;
    }
    return `<div class="card-mob-icon">${getRandomIcon(name)}</div>`;
  }

  function buildGridAvis() {
    if (!elements.gridAvis) return;
    elements.gridAvis.innerHTML = "";

    state.avisData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "mob-card";
      card.dataset.slug = item.slug;
      card.dataset.type = "avis";
      card.dataset.filter = item.filter;
      card.dataset.emeraude = item.useful_for_emeraude ? "true" : "false";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      card.dataset.search = normalizeText(`${item.name} ${item.title} ${zoneNames[item.filter] || ""}`);

      const zoneBadge = zoneNames[item.filter] || item.filter;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, item.name)}
          <span class="badge badge-zone">📍 ${zoneBadge}</span>
          <div class="card-badges">
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
            ${item.legendary_hunt_exist ? `<span class="badge badge-legendary">👑 Légendaire</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item.name}</h3>
            <div class="card-subtitle">
              <span class="icon">🗺️</span> ${item.title || zoneBadge}
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action btn-copy" title="Copier le nom">
              📋 Copier
            </button>
            <a href="detail.html?type=avis&slug=${item.slug}" class="btn-action btn-detail">
              Stratégie →
            </a>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        window.location.href = `detail.html?type=avis&slug=${item.slug}`;
      });

      const btnCopy = card.querySelector(".btn-copy");
      btnCopy.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(item.name);
      });

      elements.gridAvis.appendChild(card);
    });
  }

  function buildGridDonjons() {
    if (!elements.gridDonjons) return;
    elements.gridDonjons.innerHTML = "";

    state.donjonsData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "mob-card";
      card.dataset.slug = item.slug;
      card.dataset.type = "donjon";
      card.dataset.filter = item.filter;
      card.dataset.ocre = item.useful_for_ocre ? "true" : "false";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      card.dataset.search = normalizeText(`${item.name} ${item.boss_name} ${levelNames[item.filter] || ""}`);

      const levelBadge = levelNames[item.filter] || item.filter;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, item.boss_name || item.name)}
          <span class="badge badge-level">⭐ ${levelBadge}</span>
          <div class="card-badges">
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
            ${item.useful_for_ocre ? `<span class="badge badge-ocre">🟡 Ocre</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item.boss_name || item.name}</h3>
            <div class="card-subtitle">
              <span class="icon">🏰</span> ${item.name}
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action btn-copy" title="Copier le nom">
              📋 Copier
            </button>
            <a href="detail.html?type=donjon&slug=${item.slug}" class="btn-action btn-detail">
              Guide Donjon →
            </a>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        window.location.href = `detail.html?type=donjon&slug=${item.slug}`;
      });

      const btnCopy = card.querySelector(".btn-copy");
      btnCopy.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(item.boss_name || item.name);
      });

      elements.gridDonjons.appendChild(card);
    });
  }

  function buildGridSonges() {
    if (!elements.gridSonges) return;
    elements.gridSonges.innerHTML = "";

    const combinedData = [
      ...state.donjonsData.map(d => ({ ...d, _type: "donjon", _displayName: d.boss_name || d.name })),
      ...state.avisData.map(a => ({ ...a, _type: "avis", _displayName: a.name }))
    ];

    combinedData.sort((a, b) => a._displayName.localeCompare(b._displayName));

    combinedData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "mob-card songe-card";
      card.dataset.slug = item.slug;
      card.dataset.type = item._type;
      card.dataset.filter = item.filter || "all";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      card.dataset.search = normalizeText(`${item._displayName} ${item.name || ""} songe`);

      const typeBadge = item._type === "donjon"
        ? `<span class="badge badge-cat-boss">👑 Boss</span>`
        : `<span class="badge badge-cat-avis">📜 Avis</span>`;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, item._displayName)}
          <span class="badge badge-level">🌌 Songe Infini</span>
          <div class="card-badges">
            ${typeBadge}
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item._displayName}</h3>
            <div class="card-subtitle">
              <span class="icon">🌀</span> ${item._type === "donjon" ? `Donjon: ${item.name}` : `Zone: ${zoneNames[item.filter] || item.filter}`}
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action btn-copy" title="Copier le nom">
              📋 Copier
            </button>
            <a href="detail.html?type=${item._type}&slug=${item.slug}" class="btn-action btn-detail">
              Stratégie Songe →
            </a>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        window.location.href = `detail.html?type=${item._type}&slug=${item.slug}`;
      });

      const btnCopy = card.querySelector(".btn-copy");
      btnCopy.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(item._displayName);
      });

      elements.gridSonges.appendChild(card);
    });
  }

  function buildGridMobs() {
    if (!elements.gridMobs) return;
    elements.gridMobs.innerHTML = "";

    state.mobsData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "mob-card";
      card.dataset.slug = item.slug;
      card.dataset.type = "mob";
      card.dataset.filter = item.level_range || "all";
      card.dataset.search = normalizeText(`${item.name} ${item.subarea || ""}`);

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, item.name)}
          <span class="badge badge-level">⭐ Niv. ${item.level_range}</span>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item.name}</h3>
            <div class="card-subtitle">
              <span class="icon">📍</span> ${item.subarea || "Monde des Douze"}
            </div>
            <div class="mob-stats-preview" style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px; display: flex; gap: 10px;">
              <span>❤️ ${item.hp} PV</span>
              <span>⚡ ${item.pa} PA</span>
              <span>👟 ${item.pm} PM</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action btn-copy" title="Copier le nom">
              📋 Copier
            </button>
            <a href="detail.html?type=mob&slug=${item.slug}" class="btn-action btn-detail">
              Fiche Sorts →
            </a>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        window.location.href = `detail.html?type=mob&slug=${item.slug}`;
      });

      const btnCopy = card.querySelector(".btn-copy");
      btnCopy.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(item.name);
      });

      elements.gridMobs.appendChild(card);
    });
  }

  function render() {
    let container;
    let activeFilter;

    if (state.activeTab === "avis") {
      container = elements.gridAvis;
      activeFilter = state.activeFilterAvis;
    } else if (state.activeTab === "donjons") {
      container = elements.gridDonjons;
      activeFilter = state.activeFilterDonjons;
    } else if (state.activeTab === "songes") {
      container = elements.gridSonges;
      activeFilter = state.activeFilterSonges;
    } else if (state.activeTab === "mobs") {
      container = elements.gridMobs;
      activeFilter = state.activeFilterMobs;
    }

    if (!container) return;
    const cards = container.children;
    const query = state.searchQuery;

    let visibleCount = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardFilter = card.dataset.filter || "";
      const cardSearch = card.dataset.search || "";

      let matchesFilter = false;

      if (activeFilter === "all") {
        matchesFilter = true;
      } else {
        matchesFilter = cardFilter.includes(activeFilter);
      }

      const matchesQuery = query === "" || cardSearch.includes(query);

      if (matchesFilter && matchesQuery) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    }

    if (elements.resultsCount) {
      elements.resultsCount.textContent = `Affichage de ${visibleCount} résultat(s)`;
    }

    if (elements.noResults) {
      elements.noResults.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

})();

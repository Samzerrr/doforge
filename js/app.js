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
    countAvis: document.getElementById("count-avis"),
    countDonjons: document.getElementById("count-donjons"),
    countSonges: document.getElementById("count-songes"),
    countMobs: document.getElementById("count-mobs"),
    gridAvis: document.getElementById("grid-avis"),
    gridDonjons: document.getElementById("grid-donjons"),
    gridSonges: document.getElementById("grid-songes"),
    gridMobs: document.getElementById("grid-mobs"),
    panelAvis: document.getElementById("panel-avis"),
    panelDonjons: document.getElementById("panel-donjons"),
    panelSonges: document.getElementById("panel-songes"),
    panelMobs: document.getElementById("panel-mobs"),
    filtersAvis: document.getElementById("filters-avis"),
    filtersDonjons: document.getElementById("filters-donjons"),
    filtersSonges: document.getElementById("filters-songes"),
    filtersMobs: document.getElementById("filters-mobs"),
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
    "niveaux-191-200": "Niv. 191-200",
    "titans": "Titans",
    "expeditions": "Expéditions",
    "anomalies-temporelles": "Anomalies",
    "raids": "Raids"
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
    setupEventListeners();
    handleUrlHash();
    await loadAllData();
  });

  function setupEventListeners() {
    elements.tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
      });
    });

    elements.navLinks.forEach(link => {
      link.addEventListener("click", () => {
        const tabTarget = link.dataset.tabTarget;
        if (tabTarget) switchTab(tabTarget);
      });
    });

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

    elements.searchInput.addEventListener("input", (e) => {
      state.searchQuery = normalizeText(e.target.value);
      render();
    });
  }

  function handleUrlHash() {
    const hash = window.location.hash.replace("#", "");
    if (hash === "donjons" || hash === "avis" || hash === "songes" || hash === "mobs") {
      switchTab(hash);
    }
  }

  function switchTab(tab) {
    state.activeTab = tab;

    elements.tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    elements.navLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.tabTarget === tab);
    });

    // Reset panel displays
    elements.panelAvis.style.display = tab === "avis" ? "block" : "none";
    elements.panelDonjons.style.display = tab === "donjons" ? "block" : "none";
    if (elements.panelSonges) elements.panelSonges.style.display = tab === "songes" ? "block" : "none";
    if (elements.panelMobs) elements.panelMobs.style.display = tab === "mobs" ? "block" : "none";

    // Reset filter displays
    elements.filtersAvis.style.display = tab === "avis" ? "block" : "none";
    elements.filtersDonjons.style.display = tab === "donjons" ? "block" : "none";
    if (elements.filtersSonges) elements.filtersSonges.style.display = tab === "songes" ? "block" : "none";
    if (elements.filtersMobs) elements.filtersMobs.style.display = tab === "mobs" ? "block" : "none";

    render();
  }

  async function loadAllData() {
    try {
      elements.loading.style.display = "flex";

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

      elements.countAvis.textContent = state.avisData.length;
      elements.countDonjons.textContent = state.donjonsData.length;
      if (elements.countSonges) {
        elements.countSonges.textContent = state.avisData.length + state.donjonsData.length;
      }
      if (elements.countMobs) {
        elements.countMobs.textContent = state.mobsData.length;
      }

      elements.loading.style.display = "none";
      buildGridAvis();
      buildGridDonjons();
      buildGridSonges();
      buildGridMobs();
      render();

    } catch (err) {
      console.error(err);
      elements.loading.innerHTML = `
        <div style="color: var(--color-danger); text-align: center;">
          ❌ Erreur lors du chargement des données.
        </div>
      `;
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
            ${item.challenges && item.challenges.length > 0 ? `
              <div class="card-challenges-preview" style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                ${item.challenges.map(c => {
                  const cName = typeof c === 'string' ? c : c.name;
                  return `<span style="font-size: 0.72rem; padding: 2px 7px; background: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; font-weight: 600;">🎯 ${escapeHtml(cName)}</span>`;
                }).join("")}
              </div>
            ` : ""}
          </div>
          <div class="card-actions">
            <button class="btn-action btn-copy" data-name="${escapeHtml(item.name)}">
              📋 Copier nom
            </button>
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
    elements.gridDonjons.innerHTML = "";

    state.donjonsData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "mob-card";
      card.dataset.slug = item.slug;
      card.dataset.type = "donjon";
      card.dataset.filter = item.filter;
      card.dataset.ocre = item.useful_for_ocre ? "true" : "false";
      card.dataset.emeraude = item.useful_for_emeraude ? "true" : "false";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      const mobName = item.boss_name || item.name;
      card.dataset.search = normalizeText(`${mobName} ${item.name} ${levelNames[item.filter] || ""}`);

      const lvlBadge = levelNames[item.filter] || item.filter;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, mobName)}
          <span class="badge badge-level">⭐ ${lvlBadge}</span>
          <div class="card-badges">
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
            ${item.useful_for_ocre ? `<span class="badge badge-ocre">🥚 Ocre</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${mobName}</h3>
            <div class="card-subtitle">
              <span class="icon">🏰</span> ${item.name}
            </div>
            ${item.challenges && item.challenges.length > 0 ? `
              <div class="card-challenges-preview" style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                ${item.challenges.map(c => {
                  const cName = typeof c === 'string' ? c : c.name;
                  return `<span style="font-size: 0.72rem; padding: 2px 7px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; font-weight: 600;">🎯 ${escapeHtml(cName)}</span>`;
                }).join("")}
              </div>
            ` : ""}
          </div>
          <div class="card-actions">
            <button class="btn-action btn-copy" data-name="${escapeHtml(mobName)}">
              📋 Copier nom
            </button>
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
        copyToClipboard(mobName);
      });

      elements.gridDonjons.appendChild(card);
    });
  }

  function buildGridSonges() {
    if (!elements.gridSonges) return;
    elements.gridSonges.innerHTML = "";

    const combined = [
      ...state.donjonsData.map(d => ({ ...d, _type: 'donjon' })),
      ...state.avisData.map(a => ({ ...a, _type: 'avis' }))
    ];

    combined.forEach((item) => {
      const isBoss = item._type === "donjon";
      const mobName = isBoss ? (item.boss_name || item.name) : item.name;
      const subtitle = isBoss ? item.name : (item.title || zoneNames[item.filter] || item.filter);
      const lvlText = isBoss ? (levelNames[item.filter] || item.filter) : (zoneNames[item.filter] || "Avis de recherche");

      const card = document.createElement("article");
      card.className = "mob-card songe-card";
      card.dataset.slug = item.slug;
      card.dataset.type = item._type;
      card.dataset.filter = item.filter || "";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      card.dataset.search = normalizeText(`${mobName} ${subtitle} ${lvlText}`);

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, mobName)}
          <span class="badge ${isBoss ? 'badge-cat-boss' : 'badge-cat-avis'}">
            ${isBoss ? '👑 Boss' : '📜 Avis'}
          </span>
          <div class="card-badges">
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${mobName}</h3>
            <div class="card-subtitle">
              <span class="icon">${isBoss ? '🏰' : '🗺️'}</span> ${subtitle}
            </div>
            ${item.challenges && item.challenges.length > 0 ? `
              <div class="card-challenges-preview" style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                ${item.challenges.slice(0, 3).map(c => {
                  const cName = typeof c === 'string' ? c : c.name;
                  return `<span style="font-size: 0.72rem; padding: 2px 7px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; font-weight: 600;">🌌 ${escapeHtml(cName)}</span>`;
                }).join("")}
              </div>
            ` : ""}
          </div>
          <div class="card-actions">
            <button class="btn-action btn-copy" data-name="${escapeHtml(mobName)}">
              📋 Copier nom
            </button>
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
        copyToClipboard(mobName);
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
      card.dataset.filter = item.filter || "";
      card.dataset.search = normalizeText(`${item.name} ${item.subarea} ${item.level_range}`);

      const lvlBadge = item.level_range;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, item.name)}
          <span class="badge badge-level">⭐ ${lvlBadge}</span>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item.name}</h3>
            <div class="card-subtitle">
              <span class="icon">🗺️</span> ${item.subarea}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px; display: flex; gap: 10px;">
              <span>❤️ ${item.hp}</span>
              <span>⚡ ${item.pa} PA / ${item.pm} PM</span>
            </div>
          </div>
          <div class="card-actions" style="margin-top: 12px;">
            <button class="btn-action btn-copy" data-name="${escapeHtml(item.name)}">
              📋 Copier nom
            </button>
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
    } else {
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
      const cardType = card.dataset.type || "";
      const isOs = card.dataset.os === "true";

      let matchesFilter = false;

      if (state.activeTab === "songes") {
        if (activeFilter === "all") {
          matchesFilter = true;
        } else if (activeFilter === "os") {
          matchesFilter = isOs;
        } else if (activeFilter === "boss_only") {
          matchesFilter = cardType === "donjon";
        } else if (activeFilter === "avis_only") {
          matchesFilter = cardType === "avis";
        } else if (activeFilter === "niveaux-191-200") {
          matchesFilter = cardFilter === "niveaux-191-200";
        } else if (activeFilter === "niveaux-151-190") {
          matchesFilter = cardFilter === "niveaux-151-190";
        } else if (activeFilter === "niveaux-101-150") {
          matchesFilter = cardFilter === "niveaux-101-150";
        } else if (activeFilter === "niveaux-1-100") {
          matchesFilter = cardFilter === "niveaux-1-50" || cardFilter === "niveaux-51-100";
        } else {
          matchesFilter = cardFilter.includes(activeFilter);
        }
      } else {
        if (activeFilter === "all") {
          matchesFilter = true;
        } else if (activeFilter === "os") {
          matchesFilter = isOs;
        } else {
          matchesFilter = cardFilter.includes(activeFilter);
        }
      }

      const matchesQuery = query === "" || cardSearch.includes(query);

      if (matchesFilter && matchesQuery) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    }

    elements.resultsCount.textContent = `Affichage de ${visibleCount} monstre(s)`;

    if (visibleCount === 0) {
      elements.noResults.classList.add("visible");
    } else {
      elements.noResults.classList.remove("visible");
    }
  }

})();

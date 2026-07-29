(function () {
  "use strict";

  // State
  let state = {
    activeTab: "avis", // 'avis' or 'donjons'
    activeFilterAvis: "all",
    activeFilterDonjons: "all",
    searchQuery: "",
    avisData: [],
    donjonsData: []
  };

  // DOM Elements
  const elements = {
    loading: document.getElementById("loading"),
    noResults: document.getElementById("no-results"),
    resultsCount: document.getElementById("results-count"),
    searchInput: document.getElementById("search-input"),
    countAvis: document.getElementById("count-avis"),
    countDonjons: document.getElementById("count-donjons"),
    gridAvis: document.getElementById("grid-avis"),
    gridDonjons: document.getElementById("grid-donjons"),
    panelAvis: document.getElementById("panel-avis"),
    panelDonjons: document.getElementById("panel-donjons"),
    filtersAvis: document.getElementById("filters-avis"),
    filtersDonjons: document.getElementById("filters-donjons"),
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

    elements.filtersAvis.querySelectorAll(".filter-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        elements.filtersAvis.querySelector(".filter-pill.active")?.classList.remove("active");
        pill.classList.add("active");
        state.activeFilterAvis = pill.dataset.filter;
        render();
      });
    });

    elements.filtersDonjons.querySelectorAll(".filter-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        elements.filtersDonjons.querySelector(".filter-pill.active")?.classList.remove("active");
        pill.classList.add("active");
        state.activeFilterDonjons = pill.dataset.filter;
        render();
      });
    });

    elements.searchInput.addEventListener("input", (e) => {
      state.searchQuery = normalizeText(e.target.value);
      render();
    });
  }

  function handleUrlHash() {
    const hash = window.location.hash.replace("#", "");
    if (hash === "donjons" || hash === "avis") {
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

    if (tab === "avis") {
      elements.panelAvis.style.display = "block";
      elements.panelDonjons.style.display = "none";
      elements.filtersAvis.style.display = "block";
      elements.filtersDonjons.style.display = "none";
    } else {
      elements.panelAvis.style.display = "none";
      elements.panelDonjons.style.display = "block";
      elements.filtersAvis.style.display = "none";
      elements.filtersDonjons.style.display = "block";
    }

    render();
  }

  async function loadAllData() {
    try {
      elements.loading.style.display = "flex";

      const [resAvis, resDonjons] = await Promise.all([
        fetch("data/avis.json"),
        fetch("data/donjons.json")
      ]);

      if (!resAvis.ok || !resDonjons.ok) {
        throw new Error("Erreur de chargement des fichiers de données JSON.");
      }

      state.avisData = await resAvis.json();
      state.donjonsData = await resDonjons.json();

      elements.countAvis.textContent = state.avisData.length;
      elements.countDonjons.textContent = state.donjonsData.length;

      elements.loading.style.display = "none";
      buildGridAvis();
      buildGridDonjons();
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
      const mobName = item.boss_name || item.name;
      card.className = "mob-card";
      card.dataset.slug = item.slug;
      card.dataset.type = "donjon";
      card.dataset.filter = item.filter;
      card.dataset.ocre = item.useful_for_ocre ? "true" : "false";
      card.dataset.emeraude = item.useful_for_emeraude ? "true" : "false";
      card.dataset.os = item.has_os_mechanic ? "true" : "false";
      card.dataset.search = normalizeText(`${item.name} ${mobName} ${item.filter}`);

      const levelBadge = levelNames[item.filter.split(" ")[0]] || item.filter;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${getImageHtml(item.picture, mobName)}
          <span class="badge badge-zone">🏰 ${levelBadge}</span>
          <div class="card-badges">
            ${item.has_invulnerable_state ? `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>` : ""}
            ${item.has_os_mechanic ? `<span class="badge badge-os">☠️ One Shot</span>` : ""}
            ${item.has_special_strat ? `<span class="badge badge-legendary">⚡ Stratégie</span>` : ""}
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

  function render() {
    const isAvisTab = state.activeTab === "avis";
    const container = isAvisTab ? elements.gridAvis : elements.gridDonjons;
    const cards = container.children;
    const activeFilter = isAvisTab ? state.activeFilterAvis : state.activeFilterDonjons;
    const query = state.searchQuery;

    let visibleCount = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardFilter = card.dataset.filter || "";
      const cardSearch = card.dataset.search || "";
      const isEmeraude = card.dataset.emeraude === "true";
      const isOcre = card.dataset.ocre === "true";

      let matchesFilter = false;
      if (activeFilter === "all") {
        matchesFilter = true;
      } else if (activeFilter === "os") {
        matchesFilter = card.dataset.os === "true";
      } else if (activeFilter === "ocre") {
        matchesFilter = isOcre;
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

    elements.resultsCount.textContent = `Affichage de ${visibleCount} monstre(s)`;

    if (visibleCount === 0) {
      elements.noResults.classList.add("visible");
    } else {
      elements.noResults.classList.remove("visible");
    }
  }

})();

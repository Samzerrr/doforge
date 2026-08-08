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

  document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("site-nav");
    if (!nav) return;

    nav.innerHTML = NAV_HTML;
    const { section, child } = resolveNavContext();
    applyActiveStates(section, child);
    setupDropdowns();
  });
})();

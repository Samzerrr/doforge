(function () {
  "use strict";

  const elements = {
    loading: document.getElementById("loading"),
    detailContent: document.getElementById("detail-content"),
    mobIcon: document.getElementById("mob-icon"),
    mobTitle: document.getElementById("mob-title"),
    mobLocation: document.getElementById("mob-location"),
    mobBadges: document.getElementById("mob-badges"),
    invulnerableSection: document.getElementById("invulnerable-section"),
    invulnerableText: document.getElementById("invulnerable-text"),
    explanationSection: document.getElementById("explanation-section"),
    explanationContent: document.getElementById("explanation-content"),
    spellsSection: document.getElementById("spells-section"),
    spellsContent: document.getElementById("spells-content"),
    challengesSection: document.getElementById("challenges-section"),
    challengesContent: document.getElementById("challenges-content"),
    questSection: document.getElementById("quest-section"),
    questContent: document.getElementById("quest-content"),
    extraSection: document.getElementById("extra-section"),
    extraContent: document.getElementById("extra-content")
  };

  const monsterIcons = ["👹", "👾", "🐉", "💀", "👺", "👻", "🔥", "⚡", "🕸️", "🕷️", "🤖", "⚔️"];

  function getRandomIcon(str) {
    if (!str) return "👾";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return monsterIcons[Math.abs(hash) % monsterIcons.length];
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type");
    const slug = urlParams.get("slug");

    if (!type || !slug) {
      showError("Paramètres invalides dans l'URL.");
      return;
    }

    await loadDetail(type, slug);
  });

  function normalizeText(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, "").trim();
  }

  async function loadDetail(type, slug) {
    try {
      let dataFile = "data/avis.json";
      if (type === "donjon") dataFile = "data/donjons.json";
      if (type === "mob") dataFile = "data/mobs.json";

      const response = await fetch(dataFile);
      if (!response.ok) throw new Error("Fichier de données introuvable.");

      const dataList = await response.json();
      const reqSlugNorm = normalizeText(slug);

      const item = dataList.find(d => {
        if (!d.slug) return false;
        return d.slug === slug || normalizeText(d.slug) === reqSlugNorm || normalizeText(d.name) === reqSlugNorm;
      });

      if (!item) {
        showError(`Monstre "${slug}" non trouvé dans la base de données.`);
        return;
      }

      renderDetail(type, item);

    } catch (err) {
      console.error(err);
      showError("Erreur lors de la récupération des données du monstre.");
    }
  }

  function renderDetail(type, item) {
    elements.loading.style.display = "none";
    elements.detailContent.style.display = "block";

    const itemName = type === "donjon" ? (item.boss_name || item.name) : item.name;
    document.title = `${itemName} - Fiche Monstre | DOFORGE`;

    // Monster Icon / Image
    if (item.picture) {
      const safePic = encodeURI(item.picture);
      const safeName = escapeHtml(itemName);
      elements.mobIcon.innerHTML = `
        <div class="detail-mob-img-wrapper">
          <img src="${safePic}" alt="${safeName}" class="detail-mob-img"
            onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
          <span style="display:none; font-size: 4rem;">${getRandomIcon(itemName)}</span>
        </div>`;
    } else {
      elements.mobIcon.innerHTML = `<span style="font-size: 4rem;">${getRandomIcon(itemName)}</span>`;
    }

    elements.mobTitle.textContent = itemName;

    const locText = type === "donjon" ? item.name : (item.subarea || item.title || item.filter);
    elements.mobLocation.innerHTML = `<span class="icon">${type === "donjon" ? '🏰' : '🗺️'}</span> ${escapeHtml(locText)}`;

    // Badges
    let badgesHtml = "";
    if (type === "mob") {
      badgesHtml += `<span class="badge badge-level">⭐ ${escapeHtml(item.level_range)}</span>`;
      badgesHtml += `<span class="badge badge-zone">❤️ ${escapeHtml(item.hp)}</span>`;
      badgesHtml += `<span class="badge badge-zone">⚡ ${item.pa} PA / ${item.pm} PM</span>`;
    } else {
      if (item.filter) {
        badgesHtml += `<span class="badge badge-zone">📍 ${escapeHtml(item.filter)}</span>`;
      }
      if (item.has_invulnerable_state) {
        badgesHtml += `<span class="badge badge-invulnerable">🛡️ Invulnérable</span>`;
      }
      if (item.has_os_mechanic) {
        badgesHtml += `<span class="badge badge-os">☠️ One Shot</span>`;
      }
    }
    
    if (item.useful_for_emeraude) {
      badgesHtml += `<span class="badge badge-emeraude">💚 Dofus Émeraude</span>`;
    }
    if (item.useful_for_ocre) {
      badgesHtml += `<span class="badge badge-ocre">🟡 Dofus Ocre</span>`;
    }
    if (item.legendary_hunt_exist) {
      badgesHtml += `<span class="badge badge-legendary">👑 Chasse Légendaire</span>`;
    }
    if (item.capture) {
      badgesHtml += `<span class="badge badge-zone">📦 Capture Niv. ${item.capture}</span>`;
    }

    elements.mobBadges.innerHTML = badgesHtml;

    // 1. Invulnerability Alert
    if (item.has_invulnerable_state) {
      elements.invulnerableSection.style.display = "block";
      if (item.explanation && item.explanation.trim()) {
        elements.invulnerableText.innerHTML = formatRichText(item.explanation);
      } else {
        elements.invulnerableText.textContent = "Ce monstre est invulnérable en début de combat. Suivez les étapes de combat pour lever son immunité.";
      }
    } else {
      elements.invulnerableSection.style.display = "none";
    }

    // 1.5 OS Alert
    const osSection = document.getElementById("os-section");
    if (osSection) {
      osSection.style.display = item.has_os_mechanic ? "block" : "none";
    }

    // 2. Explanation / Strategy Section
    if (type === "mob") {
      elements.explanationSection.style.display = "block";
      const headerTitle = elements.explanationSection.querySelector(".section-title");
      if (headerTitle) headerTitle.textContent = "Fiche & Caractéristiques du Monstre";
      elements.explanationContent.innerHTML = formatRichText(
        `👾 **${escapeHtml(item.name)}** est un monstre ordinaire du bestiaire de Dofus.\n\n` +
        `📍 **Zone d'apparition principales** : ${escapeHtml(item.subarea || "Monde des Douze")}\n` +
        `⭐ **Tranche de Niveau** : ${escapeHtml(item.level_range)}\n\n` +
        `📊 **Statistiques de combat** :\n` +
        `- **Points de Vie (PV)** : ${escapeHtml(item.hp)}\n` +
        `- **Points d'Action (PA)** : ${item.pa}\n` +
        `- **Points de Mouvement (PM)** : ${item.pm}`
      );
    } else if (item.explanation && item.explanation.trim()) {
      elements.explanationSection.style.display = "block";
      elements.explanationContent.innerHTML = formatRichText(item.explanation);
    } else {
      elements.explanationSection.style.display = "none";
    }

    // 3. Spells & Abilities Section
    if (item.spells && item.spells.length > 0) {
      elements.spellsSection.style.display = "block";
      elements.spellsContent.innerHTML = item.spells.map((spell, index) => {
        let title = "";
        let desc = "";
        if (typeof spell === "object" && spell !== null) {
          title = spell.name || spell.title || "";
          desc = spell.description || spell.text || "";
        } else {
          desc = String(spell);
        }
        return `
          <li class="spell-item">
            <div class="spell-number">${index + 1}</div>
            <div class="spell-text">
              ${title ? `<strong style="color: var(--accent-primary); display: block; margin-bottom: 4px;">${escapeHtml(title)}</strong>` : ""}
              ${formatRichText(desc)}
            </div>
          </li>
        `;
      }).join("");
    } else {
      elements.spellsSection.style.display = "none";
    }

    // 3.5 Challenges / Succès Section
    if (item.challenges && item.challenges.length > 0) {
      elements.challengesSection.style.display = "block";
      const headerTitle = elements.challengesSection.querySelector(".section-title");
      if (headerTitle) {
        headerTitle.textContent = type === "donjon" ? "Succès & Challenges du Donjon" : "Objectifs & Défis de Traque";
      }
      elements.challengesContent.innerHTML = item.challenges.map(c => {
        const cName = typeof c === 'string' ? c : c.name;
        const cDesc = typeof c === 'string' ? '' : (c.description || '');
        return `
          <div class="challenge-card">
            <div class="challenge-title">${escapeHtml(cName)}</div>
            ${cDesc ? `<div class="challenge-desc">${formatRichText(cDesc)}</div>` : ''}
          </div>
        `;
      }).join("");
    } else {
      elements.challengesSection.style.display = "none";
    }

    // 4. Quests & Rewards Section
    const questData = item.quest || item.quests;
    if (questData && (Array.isArray(questData) ? questData.length > 0 : questData.trim())) {
      elements.questSection.style.display = "block";
      if (Array.isArray(questData)) {
        elements.questContent.innerHTML = questData.map(q => {
          if (typeof q === "object" && q.text) {
            return `
              <div class="quest-item">
                <span class="quest-icon">📜</span>
                <div class="quest-text">
                  ${q.url ? `<a href="${q.url}" target="_blank" rel="noopener">${q.text}</a>` : q.text}
                </div>
              </div>`;
          }
          return `
            <div class="quest-item">
              <span class="quest-icon">📜</span>
              <div class="quest-text">${formatRichText(q)}</div>
            </div>`;
        }).join("");
      } else {
        elements.questContent.innerHTML = `
          <div class="quest-item">
            <span class="quest-icon">📜</span>
            <div class="quest-text">${formatRichText(questData)}</div>
          </div>`;
      }
    } else {
      elements.questSection.style.display = "none";
    }

    // 5. Extra Information Section
    const extra = item.additional_informations || item.other_idole;
    const emptyEditorJs = `{"time":1773133844889,"blocks":[],"version":"2.31.2"}`;
    if (extra && extra.trim() && extra !== emptyEditorJs) {
      elements.extraSection.style.display = "block";
      elements.extraContent.innerHTML = formatRichText(extra);
    } else {
      elements.extraSection.style.display = "none";
    }
  }

  function formatRichText(text) {
    if (!text) return "";
    if (typeof text !== "string") {
      text = String(text);
    }
    if (text.startsWith("{") && text.includes('"blocks"')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.blocks) {
          return parsed.blocks.map(b => {
            if (b.type === "paragraph") return `<p>${b.data.text}</p>`;
            if (b.type === "header") return `<h4 style="margin: 12px 0 6px; color: var(--text-accent);">${b.data.text}</h4>`;
            if (b.type === "list" && b.data && b.data.items) {
              return `<ul>${b.data.items.map(it => `<li>${typeof it === "string" ? it : it.content}</li>`).join("")}</ul>`;
            }
            return "";
          }).join("");
        }
      } catch (e) { /* fallthrough */ }
    }
    return text.replace(/\n/g, "<br>");
  }

  function showError(msg) {
    elements.loading.innerHTML = `
      <div style="color: var(--color-danger); text-align: center; padding: 40px;">
        <h3>❌ Oups !</h3>
        <p style="margin-top: 10px; color: var(--text-muted);">${msg}</p>
        <a href="index.html" class="back-button" style="margin-top: 20px; display: inline-flex;">← Retour à la liste</a>
      </div>`;
  }

})();

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

  async function loadDetail(type, slug) {
    try {
      const dataFile = type === "donjon" ? "data/donjons.json" : "data/avis.json";
      const response = await fetch(dataFile);
      if (!response.ok) throw new Error("Fichier de données introuvable.");

      const dataList = await response.json();
      const item = dataList.find(d => d.slug === slug);

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
    document.title = `${itemName} - Stratégie Dofus | Dofus Mobs`;

    // Monster Icon / Image
    if (item.picture) {
      const safePic = encodeURI(item.picture);
      const safeName = escapeHtml(itemName);
      elements.mobIcon.innerHTML = `
        <div class="detail-mob-img-wrapper">
          <img src="${safePic}" alt="${safeName}" class="detail-mob-img"
            onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
          <div class="detail-mob-icon" style="display:none;">${getRandomIcon(itemName)}</div>
        </div>
      `;
    } else {
      elements.mobIcon.className = "detail-mob-icon";
      elements.mobIcon.textContent = getRandomIcon(itemName);
    }

    // Title & Location
    elements.mobTitle.textContent = itemName;
    if (type === "donjon") {
      elements.mobLocation.innerHTML = `🏰 Donjon : <strong>${item.name}</strong> (${item.filter || ""})`;
    } else {
      elements.mobLocation.innerHTML = `📍 Zone : <strong>${item.title || item.filter}</strong>`;
    }

    // Badges
    elements.mobBadges.innerHTML = "";
    if (item.has_invulnerable_state) {
      elements.mobBadges.innerHTML += `<span class="badge badge-invulnerable">🛡️ État Invulnérable</span>`;
    }
    if (item.useful_for_emeraude) {
      elements.mobBadges.innerHTML += `<span class="badge badge-emeraude">💚 Dofus Émeraude</span>`;
    }
    if (item.useful_for_ocre) {
      elements.mobBadges.innerHTML += `<span class="badge badge-ocre">🟡 Dofus Ocre</span>`;
    }
    if (item.legendary_hunt_exist) {
      elements.mobBadges.innerHTML += `<span class="badge badge-legendary">👑 Chasse Légendaire</span>`;
    }
    if (item.capture) {
      elements.mobBadges.innerHTML += `<span class="badge badge-zone">📦 Capture Niv. ${item.capture}</span>`;
    }

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

    // 2. Explanation / Strategy Section
    if (item.explanation && item.explanation.trim() && !item.has_invulnerable_state) {
      elements.explanationSection.style.display = "block";
      elements.explanationContent.innerHTML = formatRichText(item.explanation);
    } else {
      elements.explanationSection.style.display = "none";
    }

    // 3. Spells & Abilities Section
    if (item.spells && item.spells.length > 0) {
      elements.spellsSection.style.display = "block";
      elements.spellsContent.innerHTML = item.spells.map((spell, index) => `
        <li class="spell-item">
          <div class="spell-number">${index + 1}</div>
          <div class="spell-text">${formatRichText(spell)}</div>
        </li>
      `).join("");
    } else {
      elements.spellsSection.style.display = "none";
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

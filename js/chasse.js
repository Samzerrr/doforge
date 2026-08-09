(function () {
  "use strict";

  let poisData = [];
  let selectedIndice = null;
  let currentDirection = "sud";
  let currentStage = "1";
  let huntSteps = [];


  let currentCalc = {
    startX: -25, startY: -36,
    destX: -25, destY: -33,
    direction: "sud",
    distLabel: "3 cartes vers le Sud",
    indiceName: "Puits",
    phorreurCoords: []
  };

  // ===== STATE PERSISTENCE =====
  const STORAGE_KEY = "doforge_chasse_session_v1";

  function saveSessionState() {
    try {
      const data = {
        startX: elements.posX ? parseInt(elements.posX.value, 10) || 0 : -25,
        startY: elements.posY ? parseInt(elements.posY.value, 10) || 0 : -36,
        direction: currentDirection,
        indiceSearch: elements.indiceSearch ? elements.indiceSearch.value : "",
        selectedIndice: selectedIndice,
        currentStage: currentStage,
        huntSteps: huntSteps,
        autocopy: elements.chkAutocopy ? elements.chkAutocopy.checked : true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function restoreSessionState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data) return false;

      if (data.startX !== undefined && elements.posX) elements.posX.value = data.startX;
      if (data.startY !== undefined && elements.posY) elements.posY.value = data.startY;

      if (data.direction) {
        currentDirection = data.direction;
        const btns = document.querySelectorAll(".btn-diamond, .btn-compass-dir, .btn-compass");
        btns.forEach(b => {
          if (b.dataset.dir === currentDirection) b.classList.add("active");
          else b.classList.remove("active");
        });
      }

      if (data.indiceSearch !== undefined && elements.indiceSearch) {
        elements.indiceSearch.value = data.indiceSearch;
      }
      if (data.selectedIndice) selectedIndice = data.selectedIndice;

      if (data.currentStage) {
        currentStage = data.currentStage;
        elements.stageTabs.forEach(t => {
          if (t.dataset.stage === currentStage) t.classList.add("active");
          else t.classList.remove("active");
        });
      }

      if (data.huntSteps) huntSteps = data.huntSteps;
      if (data.autocopy !== undefined && elements.chkAutocopy) elements.chkAutocopy.checked = data.autocopy;

      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSessionState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // ===== DOFUS WORLD MAP TILE ENGINE =====

  const WORLD = {
    id: 1,
    origineX: 6480,   // pixel X of Dofus coord [0,0] at scale 1.0
    origineY: 4944,   // pixel Y of Dofus coord [0,0] at scale 1.0
    mapWidth: 69.5,    // pixel width per Dofus map cell at scale 1.0
    mapHeight: 49.7,   // pixel height per Dofus map cell at scale 1.0
    totalWidth: 10000, // full image width at scale 1.0
    totalHeight: 8000  // full image height at scale 1.0
  };

  const TILE_PX = 250;
  // High quality scale: 0.6 (6000x4800px world map)
  const MAP_SCALE_NAME = "0.6";
  const MAP_SCALE = 0.6;
  const TILE_COLS = Math.ceil(WORLD.totalWidth * MAP_SCALE / TILE_PX); // 24
  const TILE_ROWS = Math.ceil(WORLD.totalHeight * MAP_SCALE / TILE_PX); // 20

  // Tile cache to avoid re-fetching
  const tileCache = {};

  function getTileImage(col, row) {
    const tileIdx = row * TILE_COLS + col + 1;
    if (tileCache[tileIdx]) return tileCache[tileIdx];

    const img = new Image();
    img.crossOrigin = "anonymous";
    tileCache[tileIdx] = { loaded: false, img };

    img.onload = () => {
      tileCache[tileIdx].loaded = true;
      drawCanvasMap();
    };
    img.onerror = () => {
      tileCache[tileIdx].failed = true;
    };
    img.src = `https://api.dofusdb.fr/img/worlds/${WORLD.id}/${MAP_SCALE_NAME}/${tileIdx}.jpg`;

    return tileCache[tileIdx];
  }

  // Camera state (stored in Dofus world pixel coordinates at scale 1.0)
  let mapState = {
    zoom: 1.2,
    // Camera center in scale 1.0 world pixels
    camX: WORLD.origineX + WORLD.mapWidth * -25,
    camY: WORLD.origineY + WORLD.mapHeight * -34.5,
    isDragging: false,
    dragLastX: 0,
    dragLastY: 0,
    dragDistance: 0
  };

  const elements = {
    posX: document.getElementById("pos-x"),
    posY: document.getElementById("pos-y"),
    btnDecX: document.getElementById("btn-dec-x"),
    btnIncX: document.getElementById("btn-inc-x"),
    btnDecY: document.getElementById("btn-dec-y"),
    btnIncY: document.getElementById("btn-inc-y"),
    dirBtns: document.querySelectorAll(".btn-diamond, .btn-compass-dir, .btn-compass"),

    presets: document.querySelectorAll(".btn-preset"),
    quickClues: document.querySelectorAll(".chip-clue"),
    indiceSearch: document.getElementById("indice-search"),
    indiceDropdown: document.getElementById("indice-dropdown"),
    chkAutocopy: document.getElementById("chk-autocopy"),
    btnSolve: document.getElementById("btn-solve-hunt"),
    resultBanner: document.getElementById("hunt-result-banner"),
    resultCoords: document.getElementById("result-coords"),
    resultDistance: document.getElementById("result-distance"),
    btnCopyCoords: document.getElementById("btn-copy-coords"),
    btnCopyTravel: document.getElementById("btn-copy-travel"),
    phorreurGrid: document.getElementById("phorreur-grid"),
    phorreurPills: document.getElementById("phorreur-pills"),
    btnAddStep: document.getElementById("btn-add-step"),
    btnResetHunt: document.getElementById("btn-reset-hunt"),
    stageTabs: document.querySelectorAll(".stage-tab"),
    journalStepsList: document.getElementById("journal-steps-list"),
    toast: document.getElementById("toast"),
    canvasMap: document.getElementById("chasse-canvas-map"),
    mapHoverStatus: document.getElementById("map-hover-status"),
    mapTargetStatus: document.getElementById("map-target-status"),
    btnZoomIn: document.getElementById("btn-zoom-in"),
    btnZoomOut: document.getElementById("btn-zoom-out"),
    btnRecenterStart: document.getElementById("btn-recenter-start"),
    btnRecenterDest: document.getElementById("btn-recenter-dest")
  };


  // Direction mapping: string → DofusDB numeric
  const DIR_MAP = { est: 0, sud: 2, ouest: 4, nord: 6 };

  // Cache of fetched clues for current position+direction
  let cachedClues = [];      // deduplicated: [{clueId, clueName, x, y, distance}, ...]
  let cachedCluesAll = [];   // all entries: [{clueId, clueName, x, y, distance}, ...]
  let lastFetchKey = "";

  async function loadPOIs() {
    // Load all 179 POI types from DofusDB for fallback autocomplete
    try {
      const res = await fetch("https://api.dofusdb.fr/point-of-interest?$limit=200");
      if (res.ok) {
        const json = await res.json();
        poisData = (json.data || []).map(p => ({
          id: p.id,
          name: p.name?.fr || "",
          category: "indice",
          is_phorreur: /phorreur|drheller/i.test(p.name?.fr || "")
        }));
      }
    } catch (e) {}
  }

  async function fetchAvailableClues(x, y, dir) {
    const numDir = DIR_MAP[dir];
    if (numDir === undefined) return [];

    const key = x + "," + y + "," + numDir;
    if (key === lastFetchKey && cachedClues.length) return cachedClues;

    try {
      let all = [];
      let skip = 0;
      let total = 999;

      while (skip < total) {
        const url = "https://api.dofusdb.fr/treasure-hunt?x=" + x + "&y=" + y + "&direction=" + numDir + "&$limit=50&$skip=" + skip;
        const res = await fetch(url);
        if (!res.ok) break;
        const json = await res.json();
        total = json.total || 0;
        if (!json.data || !json.data.length) break;

        json.data.forEach(entry => {
          (entry.pois || []).forEach(poi => {
            all.push({
              clueId: poi.id,
              clueName: poi.name?.fr || "",
              x: entry.posX,
              y: entry.posY,
              distance: entry.distance
            });
          });
        });

        skip += json.data.length;
        if (json.data.length < 50) break;
      }

      cachedCluesAll = all;

      // Deduplicate: keep only closest occurrence per clue
      const byClue = {};
      all.forEach(c => {
        if (!byClue[c.clueId] || c.distance < byClue[c.clueId].distance) {
          byClue[c.clueId] = c;
        }
      });
      // Add Phorreur option
      byClue[-1] = { clueId: -1, clueName: "Phorreur ...", x: x, y: y, distance: 0 };

      cachedClues = Object.values(byClue).sort((a, b) => a.clueName.localeCompare(b.clueName));
      lastFetchKey = key;
      return cachedClues;
    } catch (e) {
      return [];
    }
  }


  function showToast(msg) {
    if (!elements.toast) return;
    elements.toast.textContent = msg || "📋 Copié !";
    elements.toast.classList.add("show");
    setTimeout(() => elements.toast.classList.remove("show"), 2500);
  }
  window._showToast = showToast;

  function copyToClipboard(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    showToast("📋 Copié : " + text);
  }


  // ===== CANVAS MAP RENDERER =====
  function drawCanvasMap() {
    const canvas = elements.canvasMap;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.clientWidth || 800;
    const H = canvas.clientHeight || 560;
    canvas.width = W;
    canvas.height = H;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, W, H);

    const z = mapState.zoom;
    const camX = mapState.camX;
    const camY = mapState.camY;

    // Scale 1.0 Dofus world pixels -> Canvas screen pixels
    function world1ToCanvas(wx, wy) {
      return {
        cx: W / 2 + (wx - camX) * z,
        cy: H / 2 + (wy - camY) * z
      };
    }

    // Canvas screen pixels -> Dofus [X, Y] map coordinates
    function canvasToDofus(cx, cy) {
      const wx = (cx - W / 2) / z + camX;
      const wy = (cy - H / 2) / z + camY;
      const dx = Math.round((wx - WORLD.origineX) / WORLD.mapWidth);
      const dy = Math.round((wy - WORLD.origineY) / WORLD.mapHeight);
      return { x: dx, y: dy };
    }

    // 1. Calculate visible tiles in viewport
    // Top-left and bottom-right in scale 0.6 tile pixels
    const screenTL_wx = camX - (W / 2) / z;
    const screenTL_wy = camY - (H / 2) / z;
    const screenBR_wx = camX + (W / 2) / z;
    const screenBR_wy = camY + (H / 2) / z;

    const minCol = Math.max(0, Math.floor((screenTL_wx * MAP_SCALE) / TILE_PX));
    const maxCol = Math.min(TILE_COLS - 1, Math.floor((screenBR_wx * MAP_SCALE) / TILE_PX));
    const minRow = Math.max(0, Math.floor((screenTL_wy * MAP_SCALE) / TILE_PX));
    const maxRow = Math.min(TILE_ROWS - 1, Math.floor((screenBR_wy * MAP_SCALE) / TILE_PX));

    // Render visible tiles
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const tileData = getTileImage(c, r);
        // Tile top-left in scale 1.0 world pixels
        const tileWx = (c * TILE_PX) / MAP_SCALE;
        const tileWy = (r * TILE_PX) / MAP_SCALE;
        const cp = world1ToCanvas(tileWx, tileWy);
        const drawW = (TILE_PX / MAP_SCALE) * z + 0.5; // slight overlap to prevent seam gaps
        const drawH = (TILE_PX / MAP_SCALE) * z + 0.5;

        if (tileData.loaded) {
          ctx.drawImage(tileData.img, cp.cx, cp.cy, drawW, drawH);
        } else {
          ctx.fillStyle = "#0c1124";
          ctx.fillRect(cp.cx, cp.cy, drawW, drawH);
        }
      }
    }

    // 2. Grid overlay when zoomed in
    if (z >= 0.8) {
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1;
      const tlD = canvasToDofus(0, 0);
      const brD = canvasToDofus(W, H);
      for (let mx = tlD.x - 1; mx <= brD.x + 1; mx++) {
        for (let my = tlD.y - 1; my <= brD.y + 1; my++) {
          const wx = WORLD.origineX + WORLD.mapWidth * mx;
          const wy = WORLD.origineY + WORLD.mapHeight * my;
          const cp = world1ToCanvas(wx, wy);
          const cellW = WORLD.mapWidth * z;
          const cellH = WORLD.mapHeight * z;
          ctx.strokeRect(cp.cx - cellW / 2, cp.cy - cellH / 2, cellW, cellH);

          if (z >= 1.6) {
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = "9px Lexend, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(mx + "," + my, cp.cx, cp.cy + 3);
          }
        }
      }
    }

    // 3. Trajectory line start -> dest
    const { startX, startY, destX, destY } = currentCalc;
    const startWx = WORLD.origineX + WORLD.mapWidth * startX;
    const startWy = WORLD.origineY + WORLD.mapHeight * startY;
    const destWx = WORLD.origineX + WORLD.mapWidth * destX;
    const destWy = WORLD.origineY + WORLD.mapHeight * destY;

    const pStart = world1ToCanvas(startWx, startWy);
    const pDest = world1ToCanvas(destWx, destWy);

    ctx.save();
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(pStart.cx, pStart.cy);
    ctx.lineTo(pDest.cx, pDest.cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4. Phorreur candidate markers
    if (currentCalc.phorreurCoords.length > 0) {
      currentCalc.phorreurCoords.forEach(ph => {
        const wx = WORLD.origineX + WORLD.mapWidth * ph.x;
        const wy = WORLD.origineY + WORLD.mapHeight * ph.y;
        const p = world1ToCanvas(wx, wy);
        ctx.fillStyle = "rgba(239,68,68,0.4)";
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fca5a5";
        ctx.font = "bold 10px Lexend, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+" + ph.step, p.cx, p.cy - 12);
      });
    }

    // 5. Start marker
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(pStart.cx, pStart.cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Lexend, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚩 [" + startX + "," + startY + "]", pStart.cx, pStart.cy + 22);

    // 6. Destination marker
    ctx.save();
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(245,158,11,0.35)";
    ctx.beginPath();
    ctx.arc(pDest.cx, pDest.cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(pDest.cx, pDest.cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 12px Lexend, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("📍 [" + destX + "," + destY + "]", pDest.cx, pDest.cy - 22);

    canvas._canvasToDofus = canvasToDofus;
  }

  // ===== MAP INTERACTION (DRAG, ZOOM, CLICK) =====
  function setupNativeMapEvents() {
    const canvas = elements.canvasMap;
    if (!canvas) return;

    canvas.addEventListener("mousedown", e => {
      mapState.isDragging = true;
      mapState.dragLastX = e.clientX;
      mapState.dragLastY = e.clientY;
      mapState.dragDistance = 0;
      canvas.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", e => {
      if (mapState.isDragging) {
        const dx = e.clientX - mapState.dragLastX;
        const dy = e.clientY - mapState.dragLastY;
        mapState.dragDistance += Math.hypot(dx, dy);

        // Move camera in world pixel coordinates
        mapState.camX -= dx / mapState.zoom;
        mapState.camY -= dy / mapState.zoom;

        mapState.dragLastX = e.clientX;
        mapState.dragLastY = e.clientY;
        drawCanvasMap();
      }

      // Hover HUD
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (cx >= 0 && cx <= canvas.width && cy >= 0 && cy <= canvas.height && canvas._canvasToDofus) {
        const d = canvas._canvasToDofus(cx, cy);
        if (elements.mapHoverStatus) {
          elements.mapHoverStatus.textContent = "Survol : [" + d.x + ", " + d.y + "]";
        }
      }
    });

    window.addEventListener("mouseup", () => {
      if (mapState.isDragging) {
        mapState.isDragging = false;
        canvas.style.cursor = "crosshair";
      }
    });

    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      const oldZ = mapState.zoom;
      if (e.deltaY < 0) mapState.zoom = Math.min(4.0, mapState.zoom * 1.15);
      else mapState.zoom = Math.max(0.4, mapState.zoom / 1.15);

      drawCanvasMap();
    });

    // CLICK ONLY IF NOT DRAGGING
    canvas.addEventListener("click", e => {
      if (mapState.dragDistance > 6) {
        // Was a drag movement, ignore click!
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (canvas._canvasToDofus) {
        const d = canvas._canvasToDofus(cx, cy);
        if (elements.posX) elements.posX.value = d.x;
        if (elements.posY) elements.posY.value = d.y;
        showToast("📍 Départ → [" + d.x + ", " + d.y + "]");
        solveHunt();
      }
    });

    if (elements.btnZoomIn) elements.btnZoomIn.addEventListener("click", () => { mapState.zoom = Math.min(4.0, mapState.zoom * 1.3); drawCanvasMap(); });
    if (elements.btnZoomOut) elements.btnZoomOut.addEventListener("click", () => { mapState.zoom = Math.max(0.4, mapState.zoom / 1.3); drawCanvasMap(); });

    if (elements.btnRecenterStart) elements.btnRecenterStart.addEventListener("click", () => {
      mapState.camX = WORLD.origineX + WORLD.mapWidth * currentCalc.startX;
      mapState.camY = WORLD.origineY + WORLD.mapHeight * currentCalc.startY;
      mapState.zoom = 1.2;
      drawCanvasMap();
    });

    if (elements.btnRecenterDest) elements.btnRecenterDest.addEventListener("click", () => {
      mapState.camX = WORLD.origineX + WORLD.mapWidth * currentCalc.destX;
      mapState.camY = WORLD.origineY + WORLD.mapHeight * currentCalc.destY;
      mapState.zoom = 1.2;
      drawCanvasMap();
    });
  }

  // ===== SOLVER LOGIC =====
  function setupPositionButtons() {
    function invalidateAndSolve() { lastFetchKey = ""; solveHunt(); }
    if (elements.btnDecX) elements.btnDecX.addEventListener("click", () => { elements.posX.value = parseInt(elements.posX.value || 0, 10) - 1; invalidateAndSolve(); });
    if (elements.btnIncX) elements.btnIncX.addEventListener("click", () => { elements.posX.value = parseInt(elements.posX.value || 0, 10) + 1; invalidateAndSolve(); });
    if (elements.btnDecY) elements.btnDecY.addEventListener("click", () => { elements.posY.value = parseInt(elements.posY.value || 0, 10) - 1; invalidateAndSolve(); });
    if (elements.btnIncY) elements.btnIncY.addEventListener("click", () => { elements.posY.value = parseInt(elements.posY.value || 0, 10) + 1; invalidateAndSolve(); });

    if (elements.posX) elements.posX.addEventListener("change", invalidateAndSolve);
    if (elements.posY) elements.posY.addEventListener("change", invalidateAndSolve);
  }


  function setupDirections() {
    const btns = document.querySelectorAll(".btn-diamond, .btn-compass-dir, .btn-compass");
    btns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        btns.forEach(b => b.classList.remove("active"));
        target.classList.add("active");
        currentDirection = target.dataset.dir || "sud";
        lastFetchKey = "";
        solveHunt();
      });
    });
  }



  function setupPresets() {
    elements.presets.forEach(btn => {
      btn.addEventListener("click", () => {
        if (elements.posX) elements.posX.value = btn.dataset.x;
        if (elements.posY) elements.posY.value = btn.dataset.y;
        solveHunt();
      });
    });
  }

  function setupQuickClueChips() {
    elements.quickClues.forEach(chip => {
      chip.addEventListener("click", () => {
        if (elements.indiceSearch) {
          elements.indiceSearch.value = chip.dataset.name;
          selectedIndice = { id: chip.dataset.name, name: chip.dataset.name, is_phorreur: chip.dataset.name.includes("Phorreur") };
          solveHunt();
        }
      });
    });
  }

  async function findExactHintCoordinates(startX, startY, dir, name) {
    const numDir = DIR_MAP[dir];

    // 1. Try DofusDB /treasure-hunt API
    try {
      const url = "https://api.dofusdb.fr/treasure-hunt?x=" + startX + "&y=" + startY + "&direction=" + numDir + "&$limit=50";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length) {
          const searchNorm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          for (let entry of json.data) {
            for (let poi of (entry.pois || [])) {
              const poiNorm = (poi.name?.fr || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (poiNorm === searchNorm || poiNorm.includes(searchNorm) || searchNorm.includes(poiNorm)) {
                return { x: entry.posX, y: entry.posY, distance: entry.distance };
              }
            }
          }
        }
      }
    } catch(e) {}

    // 2. Try DofusDB /hints API
    try {
      const url = "https://api.dofusdb.fr/hints?name.fr[$search]=" + encodeURIComponent(name) + "&$limit=50";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length) {
          const candidates = [];
          json.data.forEach(h => {
            if (dir === "nord" && h.x === startX && h.y < startY) candidates.push({ x: h.x, y: h.y, distance: Math.abs(startY - h.y) });
            else if (dir === "sud" && h.x === startX && h.y > startY) candidates.push({ x: h.x, y: h.y, distance: Math.abs(h.y - startY) });
            else if (dir === "ouest" && h.y === startY && h.x < startX) candidates.push({ x: h.x, y: h.y, distance: Math.abs(startX - h.x) });
            else if (dir === "est" && h.y === startY && h.x > startX) candidates.push({ x: h.x, y: h.y, distance: Math.abs(h.x - startX) });
          });
          if (candidates.length) {
            candidates.sort((a, b) => a.distance - b.distance);
            return candidates[0];
          }
        }
      }
    } catch(e) {}

    // 3. Fallback: advance 3 maps
    let destX = startX, destY = startY;
    if (dir === "nord") destY -= 3;
    if (dir === "sud") destY += 3;
    if (dir === "ouest") destX -= 3;
    if (dir === "est") destX += 3;
    return { x: destX, y: destY, distance: 3 };
  }

  function setupIndiceAutocomplete() {
    if (!elements.indiceSearch || !elements.indiceDropdown) return;

    elements.indiceSearch.addEventListener("input", () => renderDropdown(elements.indiceSearch.value.trim()));
    elements.indiceSearch.addEventListener("focus", () => renderDropdown(elements.indiceSearch.value.trim()));
    document.addEventListener("click", e => {
      if (!e.target.closest(".indice-input-wrapper")) elements.indiceDropdown.style.display = "none";
    });
  }

  function renderDropdown(query) {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Use cachedClues if available, merged with poisData so typing ANY clue works!
    let items = [];
    if (cachedClues.length > 1) {
      items = cachedClues.filter(c => {
        if (!q) return true;
        const normalized = c.clueName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized.includes(q);
      });
    }

    if (!items.length && poisData.length) {
      items = poisData.filter(item => {
        if (!q) return true;
        const normalized = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized.includes(q);
      }).map(p => ({ clueId: p.id, clueName: p.name, distance: 0, x: 0, y: 0 }));
    }

    if (!items.length) { elements.indiceDropdown.style.display = "none"; return; }

    elements.indiceDropdown.style.display = "block";
    elements.indiceDropdown.innerHTML = items.slice(0, 25).map(item =>
      '<div class="indice-dropdown-item" data-clue-id="' + item.clueId + '" data-name="' + esc(item.clueName) + '" data-x="' + item.x + '" data-y="' + item.y + '" data-dist="' + item.distance + '">' +
      '<span>' + esc(item.clueName) + '</span>' +
      (item.distance > 0 ? '<span class="indice-cat-badge">' + item.distance + ' carte' + (item.distance > 1 ? 's' : '') + '</span>' : '') +
      '</div>'
    ).join("");

    elements.indiceDropdown.querySelectorAll(".indice-dropdown-item").forEach(el => {
      el.addEventListener("click", async () => {
        const name = el.dataset.name;
        const clueId = parseInt(el.dataset.clueId, 10);
        let targetX = parseInt(el.dataset.x, 10);
        let targetY = parseInt(el.dataset.y, 10);
        let dist = parseInt(el.dataset.dist, 10);

        elements.indiceDropdown.style.display = "none";

        if (clueId === -1) {
          elements.indiceSearch.value = name;
          selectedIndice = { id: -1, name: name, is_phorreur: true };
          solveHunt();
          return;
        }

        const startX = parseInt(elements.posX?.value, 10) || 0;
        const startY = parseInt(elements.posY?.value, 10) || 0;

        // Guarantee accurate coordinates
        if (!dist || (targetX === 0 && targetY === 0 && (startX !== 0 || startY !== 0))) {
          showToast("🔍 Calcul de l'indice en cours...");
          const solved = await findExactHintCoordinates(startX, startY, currentDirection, name);
          targetX = solved.x;
          targetY = solved.y;
          dist = solved.distance;
        }

        const distLabel = dist + " carte" + (dist > 1 ? "s" : "") + " vers le " + getDirName(currentDirection);
        addJournalStep(name, targetX, targetY, distLabel);

        if (elements.chkAutocopy && elements.chkAutocopy.checked) {
          try {
            if (navigator.clipboard) await navigator.clipboard.writeText("/travel " + targetX + " " + targetY);
          } catch(e) {}
        }

        if (elements.posX) elements.posX.value = targetX;
        if (elements.posY) elements.posY.value = targetY;

        if (elements.indiceSearch) elements.indiceSearch.value = "";
        selectedIndice = null;
        lastFetchKey = "";

        showToast("📍 Avancé à [" + targetX + ", " + targetY + "]");
        solveHunt();
      });
    });
  }


  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function getDirName(dir) {
    return { nord: "Nord ⬆️", sud: "Sud ⬇️", ouest: "Ouest ⬅️", est: "Est ➡️" }[dir] || dir;
  }

  async function solveHunt() {
    const startX = parseInt(elements.posX?.value, 10) || 0;
    const startY = parseInt(elements.posY?.value, 10) || 0;
    const indiceText = elements.indiceSearch?.value?.trim() || "";
    const isPhorreur = selectedIndice?.is_phorreur || /phorreur/i.test(indiceText);

    // Fetch available clues for this position+direction from DofusDB
    await fetchAvailableClues(startX, startY, currentDirection);

    let destX = startX, destY = startY, distanceLabel = "";
    let phorreurCoords = [];

    if (isPhorreur) {
      if (elements.phorreurGrid) elements.phorreurGrid.style.display = "block";
      if (elements.phorreurPills) elements.phorreurPills.innerHTML = "";
      for (let step = 1; step <= 10; step++) {
        let px = startX, py = startY;
        if (currentDirection === "nord") py -= step;
        if (currentDirection === "sud") py += step;
        if (currentDirection === "ouest") px -= step;
        if (currentDirection === "est") px += step;
        phorreurCoords.push({ step, x: px, y: py });
        const pill = document.createElement("button");
        pill.type = "button"; pill.className = "phorreur-pill";
        pill.textContent = "+" + step + " : [" + px + ", " + py + "]";
        pill.addEventListener("click", async () => {
          const distLabel = step + " carte" + (step > 1 ? "s" : "") + " vers le " + getDirName(currentDirection) + " (Phorreur)";
          addJournalStep("Phorreur", px, py, distLabel);

          if (elements.chkAutocopy && elements.chkAutocopy.checked) {
            try { if (navigator.clipboard) await navigator.clipboard.writeText("/travel " + px + " " + py); } catch(e) {}
          }
          if (elements.posX) elements.posX.value = px;
          if (elements.posY) elements.posY.value = py;
          if (elements.indiceSearch) elements.indiceSearch.value = "";
          selectedIndice = null;
          lastFetchKey = "";
          showToast("📍 Phorreur validé à [" + px + ", " + py + "]");
          solveHunt();
        });
        if (elements.phorreurPills) elements.phorreurPills.appendChild(pill);
      }
      destX = phorreurCoords[3].x; destY = phorreurCoords[3].y;
      distanceLabel = "Phorreur entre 1 et 10 cartes vers le " + getDirName(currentDirection);
    } else {

      if (elements.phorreurGrid) elements.phorreurGrid.style.display = "none";

      // Find the exact match from cached clues
      let found = null;
      if (indiceText && cachedCluesAll.length) {
        const searchNorm = indiceText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Find the closest matching clue entry
        const matches = cachedCluesAll.filter(c => {
          const norm = c.clueName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return norm === searchNorm || norm.includes(searchNorm);
        });
        if (matches.length) {
          matches.sort((a, b) => a.distance - b.distance);
          found = matches[0];
        }
      }

      if (found) {
        destX = found.x;
        destY = found.y;
        distanceLabel = found.distance + " carte" + (found.distance > 1 ? "s" : "") + " vers le " + getDirName(currentDirection);
      } else if (indiceText) {
        // No match found - show a message
        distanceLabel = "⚠️ Indice non trouvé dans cette direction";
      }
    }

    currentCalc = { startX, startY, destX, destY, direction: currentDirection, distLabel: distanceLabel, indiceName: indiceText, phorreurCoords };
    setResultDestination(destX, destY, distanceLabel);
    drawCanvasMap();
    saveSessionState();

    // Auto-copy /travel command
    if (elements.chkAutocopy && elements.chkAutocopy.checked && destX !== startX || destY !== startY) {
      try {
        if (navigator.clipboard) await navigator.clipboard.writeText("/travel " + destX + " " + destY);
        showToast("💬 Autopilote : /travel " + destX + " " + destY);
      } catch (e) {}
    }
  }

  function setResultDestination(x, y, distLabel) {
    const coords = "[" + x + ", " + y + "]";
    const travel = "/travel " + x + " " + y;
    if (elements.resultCoords) elements.resultCoords.textContent = coords;
    if (elements.resultDistance) elements.resultDistance.textContent = distLabel;
    if (elements.mapTargetStatus) elements.mapTargetStatus.textContent = "🚩 [" + currentCalc.startX + "," + currentCalc.startY + "] ➜ 📍 [" + x + "," + y + "]";

    if (elements.btnCopyCoords) elements.btnCopyCoords.onclick = () => copyToClipboard(coords);
    if (elements.btnCopyTravel) elements.btnCopyTravel.onclick = () => copyToClipboard(travel);
    if (elements.btnAddStep) elements.btnAddStep.onclick = () => {
      addJournalStep(currentStage, currentCalc.indiceName, x, y, distLabel);
      if (elements.posX) elements.posX.value = x;
      if (elements.posY) elements.posY.value = y;
      if (elements.indiceSearch) elements.indiceSearch.value = "";
      selectedIndice = null;
      cachedClues = [];
      cachedCluesAll = [];
      lastFetchKey = "";
      showToast("✅ Jalon [" + x + ", " + y + "] validé !");
      solveHunt();
    };
  }


  // ===== JOURNAL =====
  function setupJournalStageTabs() {
    if (elements.btnResetHunt) elements.btnResetHunt.addEventListener("click", () => {
      if (confirm("Réinitialiser tous les jalons de la chasse ?")) {
        huntSteps = [];
        clearSessionState();
        renderJournal();
        showToast("🧹 Chasse réinitialisée !");
      }
    });
  }

  function addJournalStep(name, x, y, distLabel) {
    if (!Array.isArray(huntSteps)) huntSteps = [];
    huntSteps.push({ name, x, y, distLabel });
    renderJournal();
    saveSessionState();
  }

  window._deleteJalon = function(idx) {
    if (Array.isArray(huntSteps)) {
      huntSteps.splice(idx, 1);
      renderJournal();
      saveSessionState();
      showToast("🗑️ Jalon supprimé !");
    }
  };

  function renderJournal() {
    const steps = Array.isArray(huntSteps) ? huntSteps : [];
    if (!elements.journalStepsList) return;

    if (!steps.length) {
      elements.journalStepsList.innerHTML = '<div class="journal-empty">📜 Aucun jalon enregistré.<br><span style="font-size:0.82rem;color:#94a3b8;margin-top:4px;display:block;">Sélectionnez un indice pour l\'ajouter automatiquement au suivi.</span></div>';
      return;
    }

    elements.journalStepsList.innerHTML = steps.map((s, i) =>
      '<div class="journal-step-card"><div class="journal-step-info">' +
      '<span class="journal-step-title">Jalon #' + (i + 1) + ' : ' + esc(s.name) + '</span>' +
      '<span class="journal-step-sub">📍 [' + s.x + ', ' + s.y + '] • ' + esc(s.distLabel) + '</span></div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '<button type="button" class="btn-preset" onclick="navigator.clipboard.writeText(\'[' + s.x + ', ' + s.y + ']\');window._showToast && window._showToast(\'📋 Coordonnées copiées\')">📋 [' + s.x + ',' + s.y + ']</button>' +
      '<button type="button" class="btn-preset" onclick="navigator.clipboard.writeText(\'/travel ' + s.x + ' ' + s.y + '\');window._showToast && window._showToast(\'💬 /travel copié\')">💬 /travel</button>' +
      '<button type="button" class="btn-preset" style="color:#ef4444;border-color:rgba(239,68,68,0.4);" onclick="window._deleteJalon(' + i + ')" title="Supprimer ce jalon">❌</button>' +
      '</div></div>'
    ).join("");
  }



  // ===== INIT =====
  document.addEventListener("DOMContentLoaded", async () => {
    await loadPOIs();
    setupPositionButtons();
    setupDirections();
    setupPresets();
    setupQuickClueChips();
    setupIndiceAutocomplete();
    setupNativeMapEvents();
    setupJournalStageTabs();
    if (elements.btnSolve) elements.btnSolve.addEventListener("click", solveHunt);

    // Restore saved session state if exists
    const restored = restoreSessionState();
    renderJournal();
    solveHunt();

    if (restored) {
      showToast("💾 Session de chasse restaurée !");
    }
  });
})();



(function () {
  "use strict";

  // ═══════════════════════════════════════════════════
  // EMBER PARTICLE ENGINE — Floating forge sparks
  // ═══════════════════════════════════════════════════
  const canvas = document.getElementById("ember-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animFrameId = null;
  let W, H;

  const PARTICLE_COUNT = 55;
  const COLORS = [
    "rgba(255, 158, 0, 0.9)",
    "rgba(255, 120, 0, 0.85)",
    "rgba(255, 200, 60, 0.8)",
    "rgba(255, 80, 0, 0.7)",
    "rgba(255, 220, 100, 0.6)",
  ];

  function resize() {
    const hero = document.getElementById("hero-v2");
    if (!hero) return;
    W = canvas.width = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: H + Math.random() * 40,
      size: Math.random() * 3 + 1,
      speedY: -(Math.random() * 1.2 + 0.3),
      speedX: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.7 + 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: Math.random() * 200 + 120,
      wobbleSpeed: Math.random() * 0.02 + 0.01,
      wobbleAmp: Math.random() * 30 + 10,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle();
      p.y = Math.random() * H;
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.y += p.speedY;
      p.x += Math.sin(p.life * p.wobbleSpeed + p.wobbleOffset) * 0.5;

      const lifeRatio = p.life / p.maxLife;
      const fadeIn = Math.min(lifeRatio * 5, 1);
      const fadeOut = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;
      const alpha = p.opacity * fadeIn * fadeOut;

      if (p.life >= p.maxLife || p.y < -20) {
        particles[i] = createParticle();
        continue;
      }

      // Glow
      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      glow.addColorStop(0, p.color);
      glow.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.restore();

      // Core
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }

    animFrameId = requestAnimationFrame(drawParticles);
  }

  // Start particle engine
  resize();
  initParticles();
  drawParticles();
  window.addEventListener("resize", () => {
    resize();
    initParticles();
  });

  // ═══════════════════════════════════════════════════
  // COUNTER ANIMATION — Count-up on scroll
  // ═══════════════════════════════════════════════════
  let countersStarted = false;

  function animateCounter(el, target, duration) {
    const start = performance.now();
    const initial = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(initial + (target - initial) * eased);
      el.textContent = current.toLocaleString("fr-FR");
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;

    const statAvis = document.getElementById("stat-avis");
    const statDonjons = document.getElementById("stat-donjons");
    const statEquip = document.getElementById("stat-equip");

    if (statAvis) animateCounter(statAvis, parseInt(statAvis.dataset.target) || 87, 1800);
    if (statDonjons) animateCounter(statDonjons, parseInt(statDonjons.dataset.target) || 56, 1800);
    if (statEquip) animateCounter(statEquip, parseInt(statEquip.dataset.target) || 3400, 2200);
  }

  // IntersectionObserver for stats bar
  const statsBar = document.getElementById("stats-bar");
  if (statsBar) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startCounters();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(statsBar);
  }

  // ═══════════════════════════════════════════════════
  // LOAD REAL STATS — Update counters with JSON data
  // ═══════════════════════════════════════════════════
  async function loadHomeStats() {
    try {
      const [avisRes, donjonsRes, equipRes] = await Promise.all([
        fetch("data/avis.json").then((r) => (r.ok ? r.json() : [])),
        fetch("data/donjons.json").then((r) => (r.ok ? r.json() : [])),
        fetch("data/equipements.json").then((r) => (r.ok ? r.json() : [])),
      ]);

      const statAvis = document.getElementById("stat-avis");
      const statDonjons = document.getElementById("stat-donjons");
      const statEquip = document.getElementById("stat-equip");

      if (statAvis) statAvis.dataset.target = avisRes.length;
      if (statDonjons) statDonjons.dataset.target = donjonsRes.length;
      if (statEquip) statEquip.dataset.target = equipRes.length;

      // Update bento badge
      const badgeEquip = document.getElementById("bento-badge-equip");
      if (badgeEquip) badgeEquip.textContent = `${equipRes.length.toLocaleString("fr-FR")}+ Objets`;

      // If stats bar already visible, fire counters immediately
      if (statsBar) {
        const rect = statsBar.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          startCounters();
        }
      }
    } catch (e) {
      console.warn("Could not load home stats:", e);
    }
  }

  loadHomeStats();

  // ═══════════════════════════════════════════════════
  // BENTO CARD HOVER TILT — Subtle 3D perspective
  // ═══════════════════════════════════════════════════
  document.querySelectorAll(".bento-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;

      // Move the background glow
      const bg = card.querySelector(".bento-card-bg");
      if (bg) {
        bg.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 158, 0, 0.12), transparent 60%)`;
      }
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      const bg = card.querySelector(".bento-card-bg");
      if (bg) bg.style.background = "";
    });
  });

})();

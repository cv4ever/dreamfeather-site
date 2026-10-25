(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = e => e.pointerType === "mouse";
  const root = document.documentElement;

  // Pointer position, -1..1 from the viewport centre. Eased so everything glides.
  const target = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  if (!still) {
    addEventListener("pointermove", e => {
      if (!mouse(e)) return;
      target.x = e.clientX / innerWidth * 2 - 1;
      target.y = e.clientY / innerHeight * 2 - 1;
    }, { passive: true });
  }

  /* Sky: twinkling stars in three depths, plus an occasional shooting star. */
  const canvas = document.querySelector("canvas.stars");
  const ctx = canvas.getContext("2d");
  let stars = [], w = 0, h = 0, dpr = 1, meteor = null, nextMeteor = 0;
  const tints = ["255,255,255", "255,255,255", "255,255,255", "203,195,242", "168,216,196", "240,184,146"];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(260, w * h / 5200)); // ponytail: density by area, capped for 4K screens
    stars = Array.from({ length: count }, () => {
      const depth = Math.random();
      return {
        x: Math.random() * w, y: Math.random() * h, depth,
        r: .4 + depth * 1.1 + (Math.random() < .04 ? .8 : 0),
        base: .25 + Math.random() * .55,
        speed: .4 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        tint: tints[Math.floor(Math.random() * tints.length)],
      };
    });
    if (still) draw(0);
  }
  function spawnMeteor(t) {
    const fromLeft = Math.random() < .5;
    const angle = Math.PI / 7 + Math.random() * Math.PI / 10; // shallow, downward
    meteor = {
      x: fromLeft ? Math.random() * w * .6 : w * .4 + Math.random() * w * .6,
      y: Math.random() * h * .35,
      vx: (fromLeft ? 1 : -1) * Math.cos(angle), vy: Math.sin(angle),
      born: t, life: 900 + Math.random() * 500, len: 120 + Math.random() * 120, dist: 520 + Math.random() * 300,
    };
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const px = eased.x, py = eased.y;
    for (const s of stars) {
      const tw = still ? 1 : .55 + .45 * Math.sin(t / 1000 * s.speed + s.phase);
      // A rare star flares briefly, which reads as a flicker rather than a pulse.
      const flare = !still && Math.sin(t / 1700 * s.speed + s.phase * 3) > .995 ? 1.8 : 1;
      const x = s.x - px * s.depth * 14, y = s.y - py * s.depth * 10;
      ctx.globalAlpha = Math.min(1, s.base * tw * flare);
      ctx.fillStyle = `rgb(${s.tint})`;
      ctx.beginPath(); ctx.arc(x, y, s.r * (flare > 1 ? 1.3 : 1), 0, Math.PI * 2); ctx.fill();
    }
    if (meteor) {
      const k = (t - meteor.born) / meteor.life;
      if (k >= 1) meteor = null;
      else {
        const ease = 1 - Math.pow(1 - k, 2);
        const hx = meteor.x + meteor.vx * meteor.dist * ease, hy = meteor.y + meteor.vy * meteor.dist * ease;
        const tx = hx - meteor.vx * meteor.len, ty = hy - meteor.vy * meteor.len;
        const fade = Math.sin(Math.PI * k);
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0, `rgba(255,250,240,${.95 * fade})`);
        g.addColorStop(.3, `rgba(203,195,242,${.45 * fade})`);
        g.addColorStop(1, "rgba(203,195,242,0)");
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${fade})`;
        ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* Tilt: phones lean toward the cursor and catch a moving sheen. */
  const phones = [...document.querySelectorAll(".phone")];
  if (!still) {
    for (const p of phones) {
      p.addEventListener("pointermove", e => {
        if (!mouse(e)) return;
        const b = p.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        p.style.setProperty("--rx", `${(.5 - y) * 14}deg`);
        p.style.setProperty("--ry", `${(x - .5) * 16}deg`);
        p.style.setProperty("--mx", `${x * 100}%`);
        p.style.setProperty("--my", `${y * 100}%`);
        p.classList.add("tilting");
      });
      p.addEventListener("pointerleave", () => {
        p.style.removeProperty("--rx"); p.style.removeProperty("--ry");
        p.classList.remove("tilting");
      });
    }
  }

  /* Reveal timeline steps as they arrive; play the night video only while it is visible. */
  if ("IntersectionObserver" in window && !still) {
    root.classList.add("reveal");
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px" });
    document.querySelectorAll(".step, .tier").forEach(el => io.observe(el));
  }
  const video = document.querySelector("video");
  if (video) {
    if (still) { video.removeAttribute("autoplay"); video.controls = true; }
    else new IntersectionObserver(([e]) => e.isIntersecting ? video.play().catch(() => {}) : video.pause()).observe(video);
  }

  /* Header gains a frosted backdrop once the page scrolls. */
  const bar = document.querySelector(".bar");
  const onScroll = () => bar.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  addEventListener("resize", resize); resize();
  if (still) return;

  const hero = document.querySelector(".hero");
  function frame(t) {
    eased.x += (target.x - eased.x) * .06;
    eased.y += (target.y - eased.y) * .06;
    hero.style.setProperty("--px", eased.x.toFixed(4));
    hero.style.setProperty("--py", eased.y.toFixed(4));
    if (!meteor && t > nextMeteor) {
      if (nextMeteor) spawnMeteor(t);
      nextMeteor = t + 5000 + Math.random() * 9000;
    }
    draw(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

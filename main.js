/* Yohocat Studio — main.js · todo el movimiento vive aquí (GSAP) */

const SVG_NS = "http://www.w3.org/2000/svg";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICONS = {
  heart: [".##..##.", "########", "########", "########", ".######.", "..####..", "...##...", "........"],
  flag: ["#####...", "######..", "#######.", "######..", "#####...", "#.......", "#.......", "#......."],
  eye: ["........", "..####..", ".######.", "###..###", "###..###", ".######.", "..####..", "........"],
  star: ["...##...", "...##...", "########", ".######.", "..####..", ".##..##.", ".#....#.", "........"],
  mail: ["........", "########", "##....##", "#.#..#.#", "#..##..#", "#......#", "########", "........"]
};
const HERO_SHADOWS = ["sky", "yellow", "green", "orange", "brown", "sky", "yellow"];
/* Capas de cada isla, de fuera hacia dentro: [clase, escala] */
const ISLAND_LAYERS = [["i-lagoon", 1], ["i-foam", .95], ["i-sand", .915], ["i-land", .89]];

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/* El script va al final del <body>, el DOM ya está listo: cache una vez. */
const STOP_BUOYS = document.querySelectorAll(".buoy:not(.buoy--start)");


/* ── Decoración del DOM ─────────────────────────────────────────────────── */

function decorateBuoys() {
  const iconSVG = (name) => {
    const rows = ICONS[name];
    if (!rows) return "";
    const rects = rows.map((row, y) =>
      [...row].map((c, x) => c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "").join("")
    ).join("");
    return `<svg viewBox="0 0 8 8" aria-hidden="true">${rects}</svg>`;
  };
  STOP_BUOYS.forEach((buoy) => {
    const r = document.createElement("span");
    r.className = "ripple";
    r.setAttribute("aria-hidden", "true");
    buoy.appendChild(r);
    const marker = buoy.querySelector(".marker[data-icon]");
    if (marker) marker.innerHTML = iconSVG(marker.dataset.icon);
  });
}

function decorateHeroTitle() {
  let n = 0;
  document.querySelectorAll(".hero-word").forEach((word) => {
    [...word.dataset.text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "hero-letter";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--c", `var(--${HERO_SHADOWS[n++ % HERO_SHADOWS.length]})`);
      s.textContent = ch;
      word.appendChild(s);
    });
    n++;
  });
}

function decorateIslands() {
  document.querySelectorAll(".island[data-blob]").forEach((island) => {
    const shape = svgEl("svg", {
      class: "island-shape", viewBox: "0 0 100 100",
      preserveAspectRatio: "none", "aria-hidden": "true"
    });
    ISLAND_LAYERS.forEach(([cls, scale]) => {
      const use = svgEl("use", { href: `#blob${island.dataset.blob}`, class: cls });
      if (scale !== 1) use.setAttribute("transform", `translate(50 50) scale(${scale}) translate(-50 -50)`);
      shape.appendChild(use);
    });
    const palm = svgEl("svg", { class: "palm", "aria-hidden": "true" });
    palm.appendChild(svgEl("use", { href: "#palm" }));
    island.querySelector(".island-float").prepend(shape, palm);
  });
}

/* ── Viaje del barco ────────────────────────────────────────────────────── */

const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
};

function mountTrail(main, boat) {
  main.querySelector(".trail-clip")?.remove();
  if (getComputedStyle(main).position === "static") main.style.position = "relative";

  const mr = main.getBoundingClientRect();
  const br = boat.getBoundingClientRect();
  const w = main.offsetWidth;
  const h = main.offsetHeight;

  const wrap = document.createElement("div");
  wrap.className = "trail-clip";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;" +
    "overflow:hidden;pointer-events:none;" +
    "will-change:clip-path;clip-path:inset(0px 0px " + h + "px 0px);";

  const svg = svgEl("svg", {
    class: "trail",
    width: w, height: h,
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: "none",
  });
  svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;";

  const dots = svgEl("path", { class: "trail-dots" });
  svg.appendChild(dots);
  wrap.appendChild(svg);
  main.prepend(wrap);

  return {
    wrap,
    dots,
    mainH: h,
    origin: {
      x: br.left + br.width / 2 - mr.left,
      y: br.top + br.height / 2 - mr.top,
    },
  };
}

function initBoatJourney(islandCtl) {
  const main = document.querySelector(".main");
  const boat = document.querySelector(".boat");
  const boatLogo = boat?.querySelector(".logo-boat");
  if (!main || !boat || !boatLogo) return;
  let ctx;

  function build() {
    ctx?.revert();
    ctx = gsap.context(() => {
      const start = centerOf(boat);
      const points = [...STOP_BUOYS].map((b) => {
        const c = centerOf(b.querySelector(".marker") || b);
        return { x: c.x - start.x, y: c.y - start.y };
      });
      if (!points.length) return;

      const total = Math.max(points.at(-1).y, 1);
      const { wrap, dots, origin, mainH } = mountTrail(main, boat);

      const isMobile = innerWidth <= 760;
      const ENTRY_PLAY = isMobile ? 0.55 : 1;
      const ENTRY_REV = isMobile ? 0.85 : 1.4;

      let relD = "M0 0";
      let absD = `M${origin.x} ${origin.y}`;
      let prev = { x: 0, y: 0 };
      for (const p of points) {
        const dy = Math.max(p.y - prev.y, 1);
        const c1x = prev.x, c1y = prev.y + dy * .55;
        const c2x = p.x, c2y = p.y - dy * .55;
        relD += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p.x} ${p.y}`;
        absD +=
          ` C${c1x + origin.x} ${c1y + origin.y}` +
          ` ${c2x + origin.x} ${c2y + origin.y}` +
          ` ${p.x + origin.x} ${p.y + origin.y}`;
        prev = p;
      }
      dots.setAttribute("d", absD);

      const tilt = gsap.quickTo(boatLogo, "rotation", { duration: .5, ease: "power2.out" });
      let lastX = 0;

      const syncClip = (boatY) => {
        const clipTop = origin.y + boatY;
        const clipBottom = Math.max(0, mainH - clipTop);
        wrap.style.clipPath = `inset(0px 0px ${clipBottom}px 0px)`;
      };

      const pad = isMobile ? .08 : 0;
      const windows = points.map((p, i) => {
        const prevY = i > 0 ? points[i - 1].y : 0;
        const nextY = i < points.length - 1 ? points[i + 1].y : Infinity;
        const appearAt = (prevY + p.y) / 2 - pad * (p.y - prevY);
        const disappearAt = (p.y + nextY) / 2 + pad * (nextY - p.y);
        return { appearAt, disappearAt };
      });

      const showIsland = (c) => {
        if (c.state.shown) return;
        c.state.shown = true;
        c.entry.timeScale(ENTRY_PLAY).play();
        c.syncLoops();
      };

      const syncIslands = (boatY) => {
        const n = Math.min(islandCtl.length, windows.length);
        for (let i = 0; i < n; i++) {
          const c = islandCtl[i];
          const w = windows[i];
          const isLast = i === n - 1;
          /* La última isla no se vuelve a ocultar nunca: no tiene "después". */
          const shouldShow = boatY >= w.appearAt && (isLast || boatY < w.disappearAt);
          if (shouldShow && !c.state.shown) {
            showIsland(c);
          } else if (!shouldShow && c.state.shown && !isLast) {
            c.state.shown = false;
            c.entry.timeScale(ENTRY_REV).reverse();
            c.syncLoops();
          }
        }
      };

      gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".buoy--start",
          start: "clamp(center center)",
          end: () => "+=" + total,
          scrub: 1,
          fastScrollEnd: true,
        },
      })
        .to(boat, {
          duration: total,
          motionPath: { path: relD, align: false, autoRotate: false },
          onUpdate: () => {
            const x = gsap.getProperty(boat, "x");
            const y = gsap.getProperty(boat, "y");
            const vx = x - lastX;
            lastX = x;
            tilt(gsap.utils.clamp(-14, 14, vx * 1.6));
            syncClip(y);
            syncIslands(y);
          },
        }, 0);

      const lastCtl = islandCtl[islandCtl.length - 1];
      if (lastCtl?.el) {
        const reveal = () => showIsland(lastCtl);
        ScrollTrigger.create({
          trigger: lastCtl.el,
          start: "top 92%",
          end: "bottom top",
          onEnter: reveal,
          onEnterBack: reveal,
        });

        const r = lastCtl.el.getBoundingClientRect();
        if (r.top < innerHeight * .92) reveal();
      }

      requestAnimationFrame(() => {
        const y = gsap.getProperty(boat, "y") || 0;
        syncClip(y);
        syncIslands(y);
      });
    });
  }

  const loaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((r) => addEventListener("load", r, { once: true }));
  Promise.all([loaded, document.fonts?.ready]).then(build);

  let t, lastW = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(t);
    t = setTimeout(build, 200);
  });
}


/* ── Islas ──────────────────────────────────────────────────────────────── */

function initIslands() {
  const islands = gsap.utils.toArray(".island");
  const controllers = [];

  islands.forEach((island, i) => {
    const float = island.querySelector(".island-float");
    const shape = island.querySelector(".island-shape");
    const palm = island.querySelector(".palm");
    const bodyItems = island.querySelectorAll(".island-body > *");
    if (!float || !shape) return;

    gsap.set(shape, {
      willChange: "transform", force3D: true, backfaceVisibility: "hidden",
    });
    gsap.set(palm, {
      willChange: "transform", force3D: true, backfaceVisibility: "hidden",
    });

    gsap.set(island, { autoAlpha: 0 });
    gsap.set(shape, { scale: .5, y: 70, transformOrigin: "50% 60%" });
    gsap.set(palm, { scale: 0, transformOrigin: "50% 100%" });
    if (bodyItems.length) gsap.set(bodyItems, { autoAlpha: 0, y: 12 });

    const entry = gsap.timeline({ paused: true });
    entry
      .to(island, { autoAlpha: 1, duration: .5, ease: "none" }, 0)
      .to(shape, { scale: 1, y: 0, duration: 1.15, ease: "power3.out" }, 0)
      .to(palm, { scale: 1, duration: .5, ease: "power3.out" }, "-=.6");
    if (bodyItems.length) {
      entry.to(bodyItems, {
        autoAlpha: 1, y: 0,
        stagger: .04, duration: .35, ease: "power2.out",
      }, "-=.5");
    }

    const bobT = gsap.to(float, {
      y: 9, duration: 2.6 + i * .35,
      yoyo: true, repeat: -1, ease: "sine.inOut", paused: true,
    });
    const palmT = gsap.fromTo(palm,
      { rotation: -3 },
      {
        rotation: 3, transformOrigin: "50% 100%",
        duration: 2.2 + i * .2,
        yoyo: true, repeat: -1, ease: "sine.inOut", paused: true,
      });

    const state = { shown: false, onScreen: false };
    const syncLoops = () => {
      const active = state.shown && state.onScreen;
      if (active) { bobT.play(); palmT.play(); }
      else { bobT.pause(); palmT.pause(); }
    };

    ScrollTrigger.create({
      trigger: island, start: "top bottom", end: "bottom top",
      onToggle: (self) => { state.onScreen = self.isActive; syncLoops(); },
    });

    controllers.push({ el: island, entry, state, syncLoops });
  });

  return controllers;
}


/* ── Animaciones ambientales ────────────────────────────────────────────── */

function initHeroIntro() {
  const letters = gsap.utils.toArray(".hero-letter");
  const copy = gsap.utils.toArray(".hero-sub, .hero-lead");

  gsap.set([...letters, ...copy], { opacity: 0 });
  const fontsReady = Promise.race([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500))
  ]);
  fontsReady.then(() => {
    gsap.timeline()
      .fromTo(letters,
        { y: 70, rotation: -8 },
        { y: 0, rotation: 0, opacity: 1, stagger: .06, duration: .7, ease: "back.out(2)" })
      .fromTo(copy,
        { y: 16 },
        { y: 0, opacity: 1, stagger: .12, duration: .6, ease: "power2.out" }, "-=.35");
  });

  gsap.to(".boat-bob",
    { y: 7, duration: 1.7, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 85%" });
  gsap.fromTo(".boat-bob", { rotation: -2.2 },
    { rotation: 2.2, duration: 2.3, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 85%" });
}

function initBuoys() {
  STOP_BUOYS.forEach((buoy) => {
    const marker = buoy.querySelector(".marker");
    const ripple = buoy.querySelector(".ripple");
    const accent = getComputedStyle(buoy).getPropertyValue("--accent").trim();

    const on = gsap.timeline({ paused: true, defaults: { duration: .45, ease: "back.out(2.2)" } })
      .to(buoy, { scale: 1.05 }, 0)
      .to(marker, { backgroundColor: accent, rotation: -6 }, 0);

    const wave = gsap.fromTo(ripple,
      { scale: 1, opacity: .8 },
      { scale: 1.7, opacity: 0, duration: 2, ease: "power1.out", repeat: -1, paused: true });

    ScrollTrigger.create({
      trigger: buoy, start: "center 60%", end: "center 40%",
      onToggle: (self) => {
        if (self.isActive) { on.play(); wave.play(0); }
        else {
          on.reverse(); wave.pause();
          gsap.set(ripple, { opacity: 0 });
        }
      }
    });
  });
}

function initSea() {
  gsap.utils.toArray(".sea .idle").forEach((g, i) => {
    const dir = i % 2 ? 1 : -1;
    const amp = 30 + i * 6;
    gsap.to(g, {
      x: dir * amp,
      y: 18 + i * 3,
      duration: 4.5 + i * .6,
      yoyo: true, repeat: -1,
      ease: "sine.inOut",
    });
  });
}


/* ── Microinteracciones ─────────────────────────────────────────────────── */

function initPressables() {
  const REACTIONS = {
    pointerenter: (e, lift) => e.pointerType === "mouse" && lift(-3),
    pointerleave: (_, lift) => lift(0),
    pointerdown: (_, lift) => lift(-3),
    pointerup: (e, lift) => e.pointerType !== "mouse" && lift(0),
    pointercancel: (_, lift) => lift(0)
  };
  document.querySelectorAll(".links a, .to-top").forEach((el) => {
    const lift = gsap.quickTo(el, "y", { duration: .25, ease: "power3.out" });
    for (const [ev, react] of Object.entries(REACTIONS)) el.addEventListener(ev, (e) => react(e, lift));
  });
}

function initToTop() {
  document.getElementById("toTop")?.addEventListener("click", () => {
    if (window.gsap && window.ScrollToPlugin && !REDUCED) {
      gsap.to(window, {
        scrollTo: 0,
        duration: gsap.utils.clamp(.8, 2.2, scrollY / 3000),
        ease: "power3.inOut", overwrite: true
      });
    } else {
      scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    }
  });
}


/* ── Arranque ───────────────────────────────────────────────────────────── */

decorateBuoys();
decorateHeroTitle();
decorateIslands();
initToTop();

if (window.gsap && window.ScrollTrigger && window.MotionPathPlugin && !REDUCED) {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  if (window.ScrollToPlugin) gsap.registerPlugin(ScrollToPlugin);

  gsap.config({ force3D: true });

  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true,
  });
  if (ScrollTrigger.isTouch === 1) {
    ScrollTrigger.normalizeScroll(true);
  }

  const islandCtl = initIslands();
  initBoatJourney(islandCtl);
  initHeroIntro();
  initBuoys();
  initSea();
  initPressables();
}

const NS = "http://www.w3.org/2000/svg";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const BOAT_OFFSET = 150;
const ROW_GAP = 12;
const ICONS = {
  heart: ".##..##.########################.######...####.....##...........",
  flag: "#####...######..#######.######..#####...#.......#.......#.......",
  eye: "..........####...######.###..######..###.######...####..........",
  star: "...##......##...########.######...####...##..##..#....#.........",
  mail: "........##########....###.#..#.##..##..##......#########........"
};
const HERO_SHADOWS = ["sky", "yellow", "green", "orange", "brown", "sky", "yellow"];
const ISLAND_LAYERS = [["i-lagoon", 1], ["i-foam", .95], ["i-sand", .915], ["i-land", .89]];
const FOOTPRINT = { desktop: { size: 28, gap: 84, side: 13 }, mobile: { size: 18, gap: 62, side: 9 } };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mobile = () => innerWidth <= 760;
const STOP_BUOYS = $$(".buoy:not(.buoy--start)");
let lenis;

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS(NS, name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
};

const pinLine = (buoy) => mobile() ? buoy.offsetHeight / 2 + Math.max(24, innerHeight * .035) : innerHeight / 2;
const textUnit = () => mobile() ? Math.max(230, innerHeight * .34) : Math.max(300, innerHeight * .4);

function decorate() {
  STOP_BUOYS.forEach((buoy) => {
    buoy.insertAdjacentHTML("beforeend", '<span class="ripple" aria-hidden="true"></span>');
    const marker = $(".marker[data-icon]", buoy);
    const icon = ICONS[marker?.dataset.icon];
    if (icon) {
      const rects = [...icon].map((c, i) => c === "#" ? `<rect x="${i % 8}" y="${i >> 3}" width="1" height="1"/>` : "").join("");
      marker.innerHTML = `<svg viewBox="0 0 8 8" aria-hidden="true">${rects}</svg>`;
    }
  });

  let n = 0;
  $$(".hero-word").forEach((word) => {
    [...word.dataset.text].forEach((ch) => {
      const s = Object.assign(document.createElement("span"), { className: "hero-letter", textContent: ch });
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--c", `var(--${HERO_SHADOWS[n++ % HERO_SHADOWS.length]})`);
      word.append(s);
    });
    n++;
  });

  $$(".island[data-blob]").forEach((island) => {
    const shape = svgEl("svg", { class: "island-shape", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
    shape.append(...ISLAND_LAYERS.map(([cls, k]) => svgEl("use", {
      href: `#blob${island.dataset.blob}`, class: cls, transform: `translate(50 50) scale(${k}) translate(-50 -50)`
    })));
    const palm = svgEl("svg", { class: "palm", "aria-hidden": "true" });
    palm.append(svgEl("use", { href: "#palm" }));
    $(".island-float", island).prepend(shape, palm);
  });
}

function mountTrail(main, boat) {
  $(".trail-clip", main)?.remove();
  if (getComputedStyle(main).position === "static") main.style.position = "relative";
  const mr = main.getBoundingClientRect();
  const br = boat.getBoundingClientRect();
  const w = main.offsetWidth;
  const h = main.offsetHeight;

  const wrap = Object.assign(document.createElement("div"), { className: "trail-clip" });
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;will-change:clip-path;clip-path:inset(0 0 ${h}px 0)`;
  const svg = svgEl("svg", { class: "trail", width: w, height: h, viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none" });
  const guide = svgEl("path", { class: "trail-guide" });
  const prints = svgEl("g");
  svg.append(guide, prints);
  wrap.append(svg);
  main.prepend(wrap);

  return { wrap, guide, prints, h, origin: { x: br.left + br.width / 2 - mr.left, y: br.top + br.height / 2 - mr.top } };
}

function placeFootprints(guide, layerFor, { size, gap, side }, avoid) {
  const total = guide.getTotalLength();
  const half = size / 2;
  for (let i = 0, s = gap * .6; s < total; i++, s += gap) {
    const p = guide.getPointAtLength(s);
    if (avoid.some((a) => Math.hypot(p.x - a.x, p.y - a.y) < a.r + half)) continue;
    const a = guide.getPointAtLength(Math.max(s - 4, 0));
    const b = guide.getPointAtLength(Math.min(s + 4, total));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = i % 2 ? side : -side;
    layerFor(p).append(svgEl("use", {
      href: "#footprint", class: "footprint", x: -half, y: -half, width: size, height: size,
      transform: `translate(${(p.x - dy / len * off).toFixed(1)} ${(p.y + dx / len * off).toFixed(1)}) rotate(${(Math.atan2(dy, dx) * 180 / Math.PI + 90).toFixed(1)})`
    }));
  }
}

function prepareIslandText() {
  $$(".island").forEach((island) => {
    const body = $(".island-body", island);
    const title = body && $(":scope > h2", body);
    if (!title) return;
    const kids = [...body.children].filter((el) => el !== title && !el.matches(".tag"));
    const steps = [];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      if (el.matches(".paths")) {
        steps.push(...el.children);
        el.remove();
      } else if (el.matches(".method-title") && kids[i + 1]) {
        const group = document.createElement("div");
        group.append(el, kids[++i]);
        steps.push(group);
      } else steps.push(el);
    }
    const stage = document.createElement("div");
    stage.style.display = "grid";
    steps.forEach((s) => {
      s.style.gridArea = "1 / 1";
      stage.append(s);
    });
    body.append(stage);
    Object.assign(island, { _title: title, _steps: steps });
  });
}

const stepParts = (step) => step.matches("p, h3") ? [[step], []] : [$$("h3, p", step), $$("li", step)];

function initIslandText(island) {
  const { _title: title, _steps: steps } = island;
  const section = island.closest(".stop");
  const buoy = $(".buoy", section);
  const marker = $(".marker", section);
  if (!title || !steps?.length || !marker) return null;

  const enterAt = (k) => .6 + k * 1.2;
  const duration = enterAt(steps.length - 1) + 1.4;
  const master = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: marker,
      start: () => `center ${Math.round(pinLine(buoy))}px`,
      end: () => "+=" + duration * textUnit(),
      pin: section,
      scrub: .6,
      invalidateOnRefresh: true
    }
  });
  master.to({}, { duration }, 0);

  const lines = (el) => $$(".st-line", el);
  SplitText.create([title, ...steps.flatMap((s) => stepParts(s)[0])], {
    type: "lines",
    mask: "lines",
    linesClass: "st-line",
    autoSplit: true,
    onSplit() {
      const tl = gsap.timeline();
      const reveal = (ls, items, at) => {
        if (ls.length) tl.fromTo(ls, { yPercent: 120 }, { yPercent: 0, duration: .7, stagger: .08, ease: "power3.out" }, at);
        if (items.length) tl.fromTo(items, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .06, ease: "power2.out" }, at + .15);
      };
      const hide = (ls, items, at) => {
        if (ls.length) tl.fromTo(ls, { yPercent: 0 }, { yPercent: -120, duration: .5, stagger: .04, ease: "power2.in", immediateRender: false }, at);
        if (items.length) tl.fromTo(items, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -10, duration: .35, stagger: .03, ease: "power2.in", immediateRender: false }, at);
      };
      reveal(lines(title), [], 0);
      steps.forEach((step, k) => {
        const [text, items] = stepParts(step);
        const ls = text.flatMap(lines);
        reveal(ls, items, enterAt(k));
        if (k < steps.length - 1) hide(ls, items, enterAt(k + 1) - .45);
      });
      master.add(tl, 0);
      return tl;
    }
  });
  return master.scrollTrigger;
}

function initBoatJourney(ctls) {
  const main = $(".main");
  const boat = $(".boat");
  const logo = boat && $(".logo-boat", boat);
  if (!main || !logo) return;
  let ctx;

  const build = () => {
    ctx?.revert();
    ScrollTrigger.refresh();
    ctx = gsap.context(() => {
      const m = mobile();
      const vw = innerWidth;
      const start = centerOf(boat);
      const bw = boat.offsetWidth;
      const bh = boat.offsetHeight;
      const startBuoy = $(".buoy--start");
      const S0 = gsap.utils.clamp(0, ScrollTrigger.maxScroll(window), centerOf(startBuoy || boat).y - innerHeight / 2);

      const stops = STOP_BUOYS.map((buoy, i) => {
        const c = centerOf($(".marker", buoy) || buoy);
        const pin = ctls[i]?.pin;
        const line = pinLine(buoy);
        const s0 = pin ? pin.start : c.y - line;
        const side = c.x < vw / 2 ? 1 : -1;
        return {
          buoy, line, s0,
          cx: c.x,
          s1: pin ? Math.max(pin.end, s0) : s0,
          bx: m ? c.x + side * ((buoy.offsetWidth + bw) / 2 + ROW_GAP) : c.x,
          by: m ? line : line - Math.min(BOAT_OFFSET, line - bh / 2 - 12)
        };
      });
      if (!stops.length) return;

      const { wrap, guide, prints, origin, h } = mountTrail(main, boat);
      const segs = [];
      const pts = [];
      let d = `M${origin.x} ${origin.y}`;
      let prev = { x: 0, y: 0 };
      let at = S0;
      stops.forEach((p, i) => {
        const a = { x: p.bx - start.x, y: p.s0 + p.by - start.y };
        const hold = p.s1 - p.s0;
        const dy = Math.max(a.y - prev.y, 1);
        const c1 = prev.y + dy * .55;
        const c2 = a.y - dy * .55;
        segs.push({ dur: Math.max(p.s0 - at, 1), path: `M${prev.x} ${prev.y}C${prev.x} ${c1} ${a.x} ${c2} ${a.x} ${a.y}` });
        d += `C${prev.x + origin.x} ${c1 + origin.y} ${a.x + origin.x} ${c2 + origin.y} ${a.x + origin.x} ${a.y + origin.y}`;
        pts.push({ y: a.y, hold });
        prev = a;
        at = p.s0;
        if (hold > 0) {
          segs.push({ dur: hold, path: `M${a.x} ${a.y}L${a.x} ${a.y + hold}`, layer: i });
          prev = { x: a.x, y: a.y + hold };
          at = p.s1;
          d += `M${prev.x + origin.x} ${prev.y + origin.y}`;
        }
      });
      guide.setAttribute("d", d);

      const avoid = [
        { x: origin.x, y: origin.y, r: (startBuoy?.offsetWidth || 0) / 2 },
        ...stops.flatMap((p) => [p.s0, p.s1].map((s) => ({
          x: p.cx - start.x + origin.x, y: s + p.line - start.y + origin.y, r: p.buoy.offsetWidth / 2
        })))
      ];
      const layers = stops.map(() => prints.appendChild(svgEl("g")));
      const layerFor = (p) => layers[pts.findIndex((t, i) =>
        p.y <= t.y + origin.y + 1 && (!i || p.y >= pts[i - 1].y + pts[i - 1].hold + origin.y))] || layers.at(-1);
      placeFootprints(guide, layerFor, m ? FOOTPRINT.mobile : FOOTPRINT.desktop, avoid);

      const pad = m ? .08 : 0;
      const windows = pts.map((p, i) => {
        const top = i ? pts[i - 1].y + pts[i - 1].hold : 0;
        const bottom = p.y + p.hold;
        const next = pts[i + 1]?.y;
        return {
          on: (top + p.y) / 2 - pad * (p.y - top),
          off: next === undefined ? Infinity : (bottom + next) / 2 + pad * (next - bottom)
        };
      });

      const tilt = gsap.quickTo(logo, "rotation", { duration: .5, ease: "power2.out" });
      const maxTilt = m ? 5 : 12;
      let lastX = 0;
      const sync = () => {
        const x = gsap.getProperty(boat, "x");
        const y = gsap.getProperty(boat, "y");
        tilt(gsap.utils.clamp(-maxTilt, maxTilt, (x - lastX) * 1.2));
        lastX = x;
        wrap.style.clipPath = `inset(0 0 ${Math.max(0, h - origin.y - y)}px 0)`;
        ctls.slice(0, windows.length).forEach((c, i) => {
          const show = y >= windows[i].on && y < windows[i].off;
          if (show === c.state.shown) return;
          c.state.shown = show;
          if (show) c.entry.timeScale(m ? .55 : 1).play();
          else c.entry.timeScale(m ? .85 : 1.4).reverse();
          c.syncLoops();
        });
      };

      const total = Math.max(segs.reduce((t, g) => t + g.dur, 0), 1);
      const journey = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: sync,
        scrollTrigger: { start: S0, end: S0 + total, scrub: true }
      });
      let t = 0;
      segs.forEach((g) => {
        journey.to(boat, { duration: g.dur, motionPath: { path: g.path, align: false, autoRotate: false } }, t);
        if (g.layer !== undefined) journey.to(layers[g.layer], { y: g.dur, duration: g.dur }, t);
        t += g.dur;
      });
      requestAnimationFrame(sync);
    });
  };

  const loaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((r) => addEventListener("load", r, { once: true }));
  Promise.all([loaded, document.fonts.ready]).then(build);

  let timer;
  let lastW = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(timer);
    timer = setTimeout(build, 200);
  });
}

function initIslands() {
  return $$(".island").flatMap((island, i) => {
    const float = $(".island-float", island);
    const shape = $(".island-shape", island);
    const palm = $(".palm", island);
    if (!float || !shape) return [];
    const body = $$(".island-body > *", island);

    gsap.set([shape, palm], { willChange: "transform", force3D: true, backfaceVisibility: "hidden" });
    gsap.set(island, { autoAlpha: 0 });
    gsap.set(shape, { scale: .5, y: 70, transformOrigin: "50% 60%" });
    gsap.set(palm, { scale: 0, transformOrigin: "50% 100%" });
    gsap.set(body, { autoAlpha: 0, y: 12 });

    const entry = gsap.timeline({ paused: true })
      .to(island, { autoAlpha: 1, duration: .5, ease: "none" }, 0)
      .to(shape, { scale: 1, y: 0, duration: 1.15, ease: "power3.out" }, 0)
      .to(palm, { scale: 1, duration: .5, ease: "power3.out" }, "-=.6")
      .to(body, { autoAlpha: 1, y: 0, stagger: .04, duration: .35, ease: "power2.out" }, "-=.5");

    const loop = { yoyo: true, repeat: -1, ease: "sine.inOut", paused: true };
    const loops = [
      gsap.to(float, { y: 5, duration: 2.6 + i * .35, ...loop }),
      gsap.fromTo(palm, { rotation: -2 }, { rotation: 2, transformOrigin: "50% 100%", duration: 2.2 + i * .2, ...loop })
    ];
    const state = { shown: false, onScreen: false };
    const syncLoops = () => loops.forEach((t) => state.shown && state.onScreen ? t.play() : t.pause());

    const pin = window.SplitText ? initIslandText(island) : null;
    ScrollTrigger.create({
      trigger: island,
      start: "top bottom",
      end: () => "+=" + (innerHeight + island.offsetHeight + (pin ? pin.end - pin.start : 0)),
      onToggle: (self) => {
        state.onScreen = self.isActive;
        syncLoops();
      }
    });

    return { entry, state, syncLoops, pin };
  });
}

function initHeroIntro() {
  const letters = $$(".hero-letter");
  const copy = $$(".hero-sub, .hero-lead");
  gsap.set([...letters, ...copy], { opacity: 0 });
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() =>
    gsap.timeline()
      .fromTo(letters, { y: 70, rotation: -8 }, { y: 0, rotation: 0, opacity: 1, stagger: .06, duration: .7, ease: "back.out(2)" })
      .fromTo(copy, { y: 16 }, { y: 0, opacity: 1, stagger: .12, duration: .6, ease: "power2.out" }, "-=.35")
  );
  const bob = { yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 85%" };
  gsap.to(".boat-bob", { y: 4, duration: 1.7, ...bob });
  gsap.fromTo(".boat-bob", { rotation: -1.5 }, { rotation: 1.5, duration: 2.3, ...bob });
}

function initBuoys(ctls) {
  STOP_BUOYS.forEach((buoy, i) => {
    const marker = $(".marker", buoy);
    const ripple = $(".ripple", buoy);
    const accent = getComputedStyle(buoy).getPropertyValue("--accent").trim();
    const on = gsap.timeline({ paused: true, defaults: { duration: .45, ease: "back.out(2.2)" } })
      .to(buoy, { scale: 1.05 }, 0)
      .to(marker, { backgroundColor: accent, rotation: -6 }, 0);
    const wave = gsap.fromTo(ripple, { scale: 1, opacity: .8 },
      { scale: 1.7, opacity: 0, duration: 2, ease: "power1.out", repeat: -1, paused: true });

    const pin = ctls[i]?.pin;
    ScrollTrigger.create({
      ...(pin
        ? { start: () => pin.start, end: () => Math.max(pin.end, pin.start + 1) }
        : { trigger: buoy, start: "center 60%", end: "center 40%" }),
      onToggle: (self) => {
        if (self.isActive) {
          on.play();
          wave.play(0);
        } else {
          on.reverse();
          wave.pause();
          gsap.set(ripple, { opacity: 0 });
        }
      }
    });
  });
}

function initSea() {
  $$(".sea .idle").forEach((g, i) => gsap.to(g, {
    x: (i % 2 ? 1 : -1) * (30 + i * 6), y: 18 + i * 3, duration: 4.5 + i * .6, yoyo: true, repeat: -1, ease: "sine.inOut"
  }));
}

function initPressables() {
  $$(".links a, .to-top").forEach((el) => {
    const lift = gsap.quickTo(el, "y", { duration: .25, ease: "power3.out" });
    el.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && lift(-3));
    el.addEventListener("pointerleave", () => lift(0));
    el.addEventListener("pointerdown", () => lift(-3));
    el.addEventListener("pointerup", (e) => e.pointerType !== "mouse" && lift(0));
    el.addEventListener("pointercancel", () => lift(0));
  });
}

function initToTop() {
  $("#toTop")?.addEventListener("click", () => {
    const duration = gsap.utils.clamp(.8, 2.2, scrollY / 3000);
    if (lenis) lenis.scrollTo(0, { duration });
    else if (window.ScrollToPlugin && !REDUCED) gsap.to(window, { scrollTo: 0, duration, ease: "power3.inOut", overwrite: true });
    else scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  });
}

decorate();
initToTop();

if (window.gsap && window.ScrollTrigger && window.MotionPathPlugin && !REDUCED) {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, ...[window.ScrollToPlugin, window.SplitText].filter(Boolean));
  if (window.SplitText) prepareIslandText();
  gsap.config({ force3D: true });

  if (window.Lenis) {
    lenis = new Lenis({ lerp: .05, wheelMultiplier: .9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });
  if (ScrollTrigger.isTouch === 1) ScrollTrigger.normalizeScroll(true);

  const ctls = initIslands();
  initBoatJourney(ctls);
  initHeroIntro();
  initBuoys(ctls);
  initSea();
  initPressables();
}

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
    /* El ripple es un elemento real (no ::after) para que GSAP pueda animarlo */
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
    n++; // el espacio entre palabras
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

/* Crea el SVG del camino y devuelve las piezas del timeline + el origen en .main */
function mountTrail(main, boat) {
  main.querySelector(".trail")?.remove();
  const svg = svgEl("svg", { class: "trail", "aria-hidden": "true" });
  svg.innerHTML = `<defs><mask id="trailMask" maskUnits="userSpaceOnUse" x="0" y="0"
      width="${main.offsetWidth}" height="${main.offsetHeight}">
      <g class="trail-mask"></g></mask></defs>
    <path class="trail-dots" mask="url(#trailMask)"></path>`;
  main.prepend(svg);
  const mr = main.getBoundingClientRect(), br = boat.getBoundingClientRect();
  return {
    maskG: svg.querySelector(".trail-mask"),
    dots: svg.querySelector(".trail-dots"),
    origin: { x: br.left + br.width / 2 - mr.left, y: br.top + br.height / 2 - mr.top }
  };
}

function initBoatJourney() {
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
      const { maskG, dots, origin } = mountTrail(main, boat);
      let d = `M${origin.x} ${origin.y}`;

      /* Inclinación del barco: se calcula solo al avanzar el scroll y vuelve a 0 al detenerse */
      const tilt = gsap.quickTo(boatLogo, "rotation", { duration: .6, ease: "power3.out" });
      const settle = gsap.delayedCall(.12, () => tilt(0));
      let lastX = 0;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".buoy--start", start: "clamp(center center)",
          end: () => "+=" + total, scrub: 1
        },
        onUpdate: () => {
          const x = gsap.getProperty(boat, "x");
          tilt(gsap.utils.clamp(-14, 14, (x - lastX) * 1.6));
          lastX = x;
          settle.restart(true);
        }
      });

      points.reduce((prev, p) => {
        const dy = Math.max(p.y - prev.y, 1);
        const c1 = { x: prev.x, y: prev.y + dy * .55 };
        const c2 = { x: p.x, y: p.y - dy * .55 };

        /* Barco: una curva por tramo */
        tl.to(boat, { duration: dy, motionPath: { path: [prev, c1, c2, p], type: "cubic" } });

        /* Camino: mismo tramo en coordenadas de .main, revelado con una máscara */
        const seg = `C${c1.x + origin.x} ${c1.y + origin.y} ${c2.x + origin.x} ${c2.y + origin.y} ${p.x + origin.x} ${p.y + origin.y}`;
        d += ` ${seg}`;
        const reveal = svgEl("path", {
          d: `M${prev.x + origin.x} ${prev.y + origin.y} ${seg}`,
          fill: "none", stroke: "#fff", "stroke-width": 20
        });
        maskG.appendChild(reveal);
        const len = reveal.getTotalLength();
        /* "<" = arranca con el tween del barco; misma duración = mismo avance */
        tl.fromTo(reveal,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDasharray: len, strokeDashoffset: 0, duration: dy }, "<");
        return p;
      }, { x: 0, y: 0 });

      dots.setAttribute("d", d);
    });
  }

  /* Se construye cuando cargan página y fuentes (ambas alteran alturas) */
  const loaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((r) => addEventListener("load", r, { once: true }));
  Promise.all([loaded, document.fonts?.ready]).then(build);

  /* Recalcular solo si cambia el ANCHO: la barra del navegador móvil no cuenta */
  let t, lastW = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(t);
    t = setTimeout(build, 200);
  });
}


/* ── Animaciones ambientales ────────────────────────────────────────────── */

function initHeroIntro() {
  const letters = gsap.utils.toArray(".hero-letter");
  const copy = gsap.utils.toArray(".hero-sub, .hero-lead");

  /* Ocultar ya; esperar a la tipografía para que no se vea la fuente de respaldo */
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

  /* Cabeceo: desplazamiento y giro con periodos distintos para que no sea mecánico */
  gsap.to(".boat-bob",
    { y: 7, duration: 1.7, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 85%" });
  gsap.fromTo(".boat-bob", { rotation: -2.2 },
    { rotation: 2.2, duration: 2.3, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 85%" });
}

function initIslands() {
  gsap.utils.toArray(".island").forEach((island, i) => {
    const float = island.querySelector(".island-float");
    const palm = island.querySelector(".palm");

    gsap.timeline({ scrollTrigger: { trigger: island, start: "top 88%", toggleActions: "play none none reverse" } })
      .from(island,
        { scale: .45, opacity: 0, y: 90, transformOrigin: "50% 60%", duration: 1.1, ease: "back.out(1.5)" })
      .from(island.querySelectorAll(".island-body > *"),
        { opacity: 0, y: 14, stagger: .08, duration: .5, ease: "power2.out" }, "-=.5")
      .from(palm,
        { scale: 0, transformOrigin: "50% 100%", duration: .6, ease: "back.out(2.5)" }, "-=.6");

    /* Bucles de oleaje: solo corren mientras la isla está cerca de la pantalla */
    const loops = [
      gsap.to(float, { y: 9, duration: 2.6 + i * .35, yoyo: true, repeat: -1, ease: "sine.inOut", paused: true }),
      gsap.fromTo(palm, { rotation: -3 },
        {
          rotation: 3, transformOrigin: "50% 100%",
          duration: 2.2 + i * .2, yoyo: true, repeat: -1, ease: "sine.inOut", paused: true
        })
    ];
    ScrollTrigger.create({
      trigger: island, start: "top bottom", end: "bottom top",
      onToggle: (self) => loops.forEach((t) => self.isActive ? t.play() : t.pause())
    });
  });
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
          gsap.to(ripple, { opacity: 0, duration: .2, overwrite: true });
        }
      }
    });
  });
}

function initSea() {
  /* Paralaje del scroll: una sola línea de tiempo para todas las capas */
  gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.2 }
  }).to(".sea .parallax", {
    x: (_, g) => -g.dataset.depth * 7,
    y: (_, g) => -g.dataset.depth * 5
  }, 0);

  /* Y una respiración lenta */
  gsap.utils.toArray(".sea .idle").forEach((g, i) => {
    gsap.to(g, {
      x: (i % 2 ? 1 : -1) * 14, y: 10,
      duration: 5 + i * .7, yoyo: true, repeat: -1, ease: "sine.inOut"
    });
  });
}


/* ── Microinteracciones ─────────────────────────────────────────────────── */

/* Hover (mouse) o press (táctil) sobre botones: se elevan 3px */
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

/* Volver arriba: con ScrollToPlugin controla GSAP; sin él, scroll nativo */
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

  /* force3D: los elementos animados no "saltan" al terminar el tween */
  gsap.config({ force3D: true });
  /* ignoreMobileResize: la barra del navegador móvil no debe disparar recálculos */
  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true   // reduce la frecuencia de callbacks en móvil
  });

  initBoatJourney();
  initHeroIntro();
  initIslands();
  initBuoys();
  initSea();
  initPressables();
}

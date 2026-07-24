/* Hero particle field: N particles morph between shapes sampled
   from line segments. Particle i always targets point i of the
   current shape, so switching shapes is just retargeting. */

import { initTerminal, getAccent } from "./terminal.js";

initTerminal();

/* ---------------- clock ---------------- */
const clockEl = document.getElementById("clock");
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const jstH = (d.getUTCHours() + 9) % 24;
  clockEl.textContent =
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC` +
    ` · ${p(jstH)}:${p(d.getUTCMinutes())} JST`;
}
tickClock();
setInterval(tickClock, 1000);

/* ---------------- scroll reveals (staggered per group) ---------------- */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".vending, .stations, .hero-inner").forEach((group) => {
  [...group.children]
    .filter((c) => c.classList.contains("reveal"))
    .forEach((c, i) => c.style.setProperty("--d", `${i * 110}ms`));
});

const revealEls = document.querySelectorAll(".reveal");
if (reduced) {
  revealEls.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));
}

/* ---------------- vending machine (selected work) ---------------- */
const slots = [...document.querySelectorAll(".slot")];
const screenCards = [...document.querySelectorAll(".screen-card")];
const screenIdxEl = document.getElementById("screen-idx");
const machineEl = document.querySelector(".machine");
const trayEl = document.querySelector(".machine-tray");
const SLOT_CODES = ["A1", "A2", "B1", "B2"];

function dropCan(i) {
  const can = slots[i].querySelector(".can");
  const mr = machineEl.getBoundingClientRect();
  const cr = can.getBoundingClientRect();
  const tr = trayEl.getBoundingClientRect();
  const clone = can.cloneNode(true);
  clone.classList.add("drop");
  // carry the slot's hue onto the clone: the machine has no data-hue,
  // so --hue would otherwise fall back to the accent color
  clone.setAttribute("data-hue", slots[i].getAttribute("data-hue"));
  clone.style.left = `${cr.left - mr.left}px`;
  clone.style.top = `${cr.top - mr.top}px`;
  machineEl.appendChild(clone);
  const dx = tr.left + tr.width / 2 - (cr.left + cr.width / 2);
  const dy = tr.bottom - 8 - cr.bottom;
  clone.animate(
    [
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.72}px) rotate(-9deg)`, offset: 0.62 },
      { transform: `translate(${dx}px, ${dy}px) rotate(7deg)` },
    ],
    { duration: 640, easing: "cubic-bezier(.45,0,.6,1)", fill: "forwards" }
  );
  setTimeout(
    () => clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: "forwards" }),
    880
  );
  setTimeout(() => clone.remove(), 1300);
}

function selectProject(i, withDrop) {
  slots.forEach((s, j) => s.setAttribute("aria-pressed", String(i === j)));
  screenCards.forEach((c, j) => c.classList.toggle("active", i === j));
  if (screenIdxEl) screenIdxEl.textContent = SLOT_CODES[i];
  if (withDrop && !reduced && machineEl && trayEl) dropCan(i);
}

slots.forEach((s, i) => s.addEventListener("click", () => selectProject(i, true)));

/* ---------------- nav: highlight the active section ---------------- */
const navLinks = [...document.querySelectorAll(".nav-links a")];
const sectionObs = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`)
        );
      }
    }
  },
  { rootMargin: "-40% 0px -55% 0px" }
);
["work", "approach", "contact"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) sectionObs.observe(el);
});

/* ---------------- scroll-driven: progress bar, parallax, journey ---------------- */
const progressEl = document.getElementById("progress");
const parallaxEls = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
  el,
  s: parseFloat(el.dataset.parallax),
}));

const journeyEl = document.getElementById("journey");
const journeyPath = document.getElementById("journey-path");
const journeyDot = document.getElementById("journey-dot");
let journeyLen = 0;
if (journeyPath) {
  journeyLen = journeyPath.getTotalLength();
  journeyPath.style.strokeDasharray = journeyLen;
  journeyPath.style.strokeDashoffset = reduced ? 0 : journeyLen;
}

let scrollQueued = false;
function onScrollFrame() {
  scrollQueued = false;
  const doc = document.documentElement;

  if (progressEl) {
    const p = doc.scrollTop / Math.max(1, doc.scrollHeight - innerHeight);
    progressEl.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  if (!reduced) {
    // parallax offsets are measured against the parent so the
    // transform we set here never feeds back into the measurement
    for (const { el, s } of parallaxEls) {
      const r = el.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - innerHeight / 2) * s;
      el.style.transform = `translateY(${off.toFixed(1)}px)`;
    }
  }

  if (journeyPath && journeyEl) {
    const r = journeyEl.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / r.height));
    if (!reduced) journeyPath.style.strokeDashoffset = journeyLen * (1 - prog);
    const pt = journeyPath.getPointAtLength(journeyLen * (reduced ? 1 : prog));
    journeyDot.setAttribute("cx", pt.x.toFixed(1));
    journeyDot.setAttribute("cy", pt.y.toFixed(1));
  }
}
function queueScrollFrame() {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(onScrollFrame);
  }
}
addEventListener("scroll", queueScrollFrame, { passive: true });
addEventListener("resize", queueScrollFrame);
queueScrollFrame();

/* ============================================================
   SHAPES — unit space, y up, roughly within [-1, 1]
   Each returns a flat list of segments [x1, y1, x2, y2].
   ============================================================ */

function circleSegs(cx, cy, r, steps = 72) {
  const segs = [];
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2;
    const a1 = ((i + 1) / steps) * Math.PI * 2;
    segs.push([
      cx + r * Math.cos(a0), cy + r * Math.sin(a0),
      cx + r * Math.cos(a1), cy + r * Math.sin(a1),
    ]);
  }
  return segs;
}

function polylineSegs(points, closed = false) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    segs.push([...points[i], ...points[i + 1]]);
  }
  if (closed && points.length > 2) {
    segs.push([...points[points.length - 1], ...points[0]]);
  }
  return segs;
}

/* Solitaire ring: band (two circles) + round-brilliant profile on top. */
function ringShape() {
  const segs = [
    ...circleSegs(0, -0.18, 0.6),
    ...circleSegs(0, -0.18, 0.46),
  ];
  const girdleY = 0.52, tableY = 0.74, culet = [0, 0.24];
  const gL = [-0.3, girdleY], gR = [0.3, girdleY];
  const tL = [-0.17, tableY], tR = [0.17, tableY];
  segs.push(
    ...polylineSegs([gL, tL, tR, gR]),          // crown + table
    ...polylineSegs([gL, gR]),                  // girdle
    ...polylineSegs([gL, culet, gR]),           // pavilion
    ...polylineSegs([[-0.15, girdleY], culet]), // pavilion mains
    ...polylineSegs([[0.15, girdleY], culet]),
    ...polylineSegs([[-0.15, girdleY], [-0.085, tableY]]), // crown facets
    ...polylineSegs([[0.15, girdleY], [0.085, tableY]]),
  );
  return segs;
}

/* Torii gate (the frame). The voice waveform inside it is drawn by the
   live-wave builder so it can animate. */
function toriiGateSegs() {
  const segs = [];
  // two pillars (wide stance, tall)
  segs.push(...polylineSegs([[-0.64, -0.78], [-0.64, 0.58]]));
  segs.push(...polylineSegs([[0.64, -0.78], [0.64, 0.58]]));
  // kasagi (curved top lintel) + shimaki (parallel bar below it)
  segs.push(...polylineSegs([[-0.95, 0.58], [-0.46, 0.68], [0, 0.72], [0.46, 0.68], [0.95, 0.58]]));
  segs.push(...polylineSegs([[-0.9, 0.5], [0, 0.52], [0.9, 0.5]]));
  // nuki (through beam) + gakuzuka (central tablet)
  segs.push(...polylineSegs([[-0.78, 0.36], [0.78, 0.36]]));
  segs.push(...polylineSegs([[-0.08, 0.36], [0.08, 0.36], [0.08, 0.54], [-0.08, 0.54]], true));
  return segs;
}

/* Clean feed-forward network: 3 symmetric layers, fully-connected edges,
   prominent double-ring nodes. */
function netShape() {
  const layers = [
    { x: -0.7, n: 3 },
    { x: 0, n: 4 },
    { x: 0.7, n: 3 },
  ];
  const H = 1.12;
  const nodes = layers.map((l) =>
    Array.from({ length: l.n }, (_, j) => [l.x, ((j + 0.5) / l.n - 0.5) * H])
  );
  const segs = [];
  // fully-connected edges — regular, so the graph reads clean
  for (let li = 0; li < nodes.length - 1; li++) {
    for (const a of nodes[li]) {
      for (const b of nodes[li + 1]) {
        segs.push([a[0], a[1], b[0], b[1]]);
      }
    }
  }
  // double-ring nodes: outer + inner so they read as solid dots, not gaps
  for (const layer of nodes) {
    for (const [x, y] of layer) {
      segs.push(...circleSegs(x, y, 0.08, 16));
      segs.push(...circleSegs(x, y, 0.035, 8));
    }
  }
  return segs;
}

/* Healthcare: a DNA double helix as 3D edges (spun by the 3D pipeline). */
function dnaEdges() {
  const e = [];
  const A = 0.32, turns = 2.4, steps = 56;
  const strand = (phase) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const y = -0.78 + f * 1.56;
      const th = f * Math.PI * 2 * turns + phase;
      pts.push([A * Math.cos(th), y, A * Math.sin(th)]);
    }
    return pts;
  };
  const s1 = strand(0), s2 = strand(Math.PI);
  for (let i = 0; i < steps; i++) {
    e.push([...s1[i], ...s1[i + 1]]);
    e.push([...s2[i], ...s2[i + 1]]);
  }
  const rungs = 12;
  for (let i = 1; i < rungs; i++) {
    const idx = Math.round((i / rungs) * steps);
    e.push([...s1[idx], ...s2[idx]]);
  }
  return e;
}

/* On-chain systems: three interlocking chain links along a tilt. */
function chainShape() {
  const segs = [];
  const rot = -Math.PI / 7;
  const link = (cx, cy) => {
    const ring = (rx, ry) => {
      const pts = [];
      const steps = 34;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = rx * Math.cos(a), y = ry * Math.sin(a);
        pts.push([
          cx + x * Math.cos(rot) - y * Math.sin(rot),
          cy + x * Math.sin(rot) + y * Math.cos(rot),
        ]);
      }
      return pts;
    };
    segs.push(...polylineSegs(ring(0.27, 0.135), true)); // outer wall
    segs.push(...polylineSegs(ring(0.19, 0.065), true)); // inner wall
  };
  const dx = 0.4 * Math.cos(rot), dy = 0.4 * Math.sin(rot);
  link(-dx, -dy);
  link(0, 0);
  link(dx, dy);
  return segs;
}

/* Real-estate automation: a house with a gear at its heart. */
function realEstateShape() {
  const segs = [];
  segs.push(...polylineSegs([[-0.42, -0.5], [-0.42, 0.12], [0.42, 0.12], [0.42, -0.5]]));
  segs.push(...polylineSegs([[-0.54, 0.12], [0, 0.54], [0.54, 0.12]]));
  const gx = 0, gy = -0.16, r = 0.17, teeth = 8;
  segs.push(...circleSegs(gx, gy, r, 22));
  segs.push(...circleSegs(gx, gy, r * 0.42, 10));
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    segs.push([
      gx + r * Math.cos(a), gy + r * Math.sin(a),
      gx + (r + 0.07) * Math.cos(a), gy + (r + 0.07) * Math.sin(a),
    ]);
  }
  return segs;
}

/* Honeycomb: central hexagon + six neighbours. */
function hiveShape() {
  const segs = [];
  const r = 0.24;
  const d = r * Math.sqrt(3) * 1.06;
  const centers = [[0, 0]];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    centers.push([d * Math.cos(a), d * Math.sin(a)]);
  }
  for (const [cx, cy] of centers) {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60 + 30) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    segs.push(...polylineSegs(pts, true));
  }
  return segs;
}

/* Mt. Fuji with a rising sun disc: heroic, hinomaru composition. */
function fujiShape() {
  const segs = [];
  // rising sun behind the peak
  segs.push(...circleSegs(0, 0.5, 0.24, 44));
  // mountain silhouette with a snow-capped summit
  segs.push(...polylineSegs([
    [-0.9, -0.52], [-0.4, 0.16], [-0.2, 0.42],
    [-0.12, 0.38], [-0.05, 0.45], [0.03, 0.39], [0.11, 0.45], [0.2, 0.42],
    [0.4, 0.16], [0.9, -0.52],
  ]));
  // snowline ridge just below the cap
  segs.push(...polylineSegs([
    [-0.26, 0.3], [-0.14, 0.24], [-0.02, 0.3], [0.1, 0.24], [0.24, 0.3],
  ]));
  // horizon
  segs.push(...polylineSegs([[-0.95, -0.52], [0.95, -0.52]]));
  return segs;
}

/* Maps & routing: a winding route with waypoints and a location pin. */
function mapShape() {
  const segs = [];
  segs.push(...polylineSegs([
    [-0.72, -0.42], [-0.48, -0.12], [-0.54, 0.2], [-0.22, 0.34],
    [0.12, 0.24], [0.28, 0.02],
  ]));
  segs.push(...circleSegs(-0.72, -0.42, 0.05, 12)); // start dot
  segs.push(...circleSegs(-0.22, 0.34, 0.045, 12)); // waypoint
  // location pin at the destination: teardrop head + hole + point
  const px = 0.42, py = 0.3;
  segs.push(...circleSegs(px, py, 0.14, 24));
  segs.push(...circleSegs(px, py, 0.055, 12));
  segs.push(...polylineSegs([[px - 0.1, py - 0.09], [px, py - 0.32], [px + 0.1, py - 0.09]]));
  return segs;
}

/* QR code: three finder patterns plus scattered data modules. */
function qrShape() {
  const segs = [];
  const finder = (cx, cy) => {
    segs.push(...polylineSegs(
      [[cx - 0.18, cy - 0.18], [cx + 0.18, cy - 0.18], [cx + 0.18, cy + 0.18], [cx - 0.18, cy + 0.18]], true));
    segs.push(...polylineSegs(
      [[cx - 0.08, cy - 0.08], [cx + 0.08, cy - 0.08], [cx + 0.08, cy + 0.08], [cx - 0.08, cy + 0.08]], true));
  };
  finder(-0.45, 0.45);
  finder(0.45, 0.45);
  finder(-0.45, -0.45);
  const mods = [
    [0.08, 0.5], [0.3, 0.32], [0.5, -0.08], [0.2, -0.2], [0.46, -0.42],
    [0.06, -0.46], [-0.08, 0.12], [0.16, 0.06], [-0.2, -0.12], [0.36, -0.3],
    [0.5, 0.16], [-0.04, -0.3], [0.24, 0.5], [-0.28, 0.12],
  ];
  const m = 0.05;
  for (const [x, y] of mods) {
    segs.push(...polylineSegs(
      [[x - m, y - m], [x + m, y - m], [x + m, y + m], [x - m, y + m]], true));
  }
  return segs;
}

/* Evenly sample `count` points along a segment list, by arc length. */
function samplePoints(segs, count) {
  const lens = segs.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const total = lens.reduce((a, b) => a + b, 0);
  const pts = new Float32Array(count * 2);
  let si = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = ((k + 0.5) / count) * total;
    while (si < segs.length - 1 && acc + lens[si] < target) acc += lens[si++];
    const t = lens[si] ? (target - acc) / lens[si] : 0;
    const [x1, y1, x2, y2] = segs[si];
    pts[k * 2] = x1 + (x2 - x1) * t;
    pts[k * 2 + 1] = y1 + (y2 - y1) * t;
  }
  return pts;
}

/* ============================================================
   3D PIPELINE — edges in 3D, projected + spun every frame
   ============================================================ */

/* Evenly sample points along a list of 3D edges [x1,y1,z1,x2,y2,z2]. */
function sample3D(edges, count) {
  const lens = edges.map((e) =>
    Math.hypot(e[3] - e[0], e[4] - e[1], e[5] - e[2]));
  const total = lens.reduce((a, b) => a + b, 0);
  const pts = new Float32Array(count * 3);
  let si = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = ((k + 0.5) / count) * total;
    while (si < edges.length - 1 && acc + lens[si] < target) acc += lens[si++];
    const f = lens[si] ? (target - acc) / lens[si] : 0;
    const e = edges[si];
    pts[k * 3] = e[0] + (e[3] - e[0]) * f;
    pts[k * 3 + 1] = e[1] + (e[4] - e[1]) * f;
    pts[k * 3 + 2] = e[2] + (e[5] - e[2]) * f;
  }
  return pts;
}

/* Turn a 3D edge generator into a live shape: {mk, anim}. Yaws around Y,
   holds a fixed X tilt, projects with weak perspective. */
function make3D(edgesFn, opts = {}) {
  const spin = opts.spin ?? 0.4, tilt = opts.tilt ?? 0.5,
    sc = opts.scale3 ?? 1, persp = opts.persp ?? 0.32;
  let cache = null, cacheN = 0;
  const base = (n) => {
    if (cacheN !== n) { cache = sample3D(edgesFn(), n); cacheN = n; }
    return cache;
  };
  const project = (out, t, n) => {
    const p3 = base(n);
    const ay = t * spin, cyA = Math.cos(ay), syA = Math.sin(ay);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < n; i++) {
      const x = p3[i * 3], y = p3[i * 3 + 1], z = p3[i * 3 + 2];
      const x1 = x * cyA + z * syA;
      const z1 = -x * syA + z * cyA;
      const y1 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      const f = 1 / (1 + persp * z2);
      out[i * 2] = x1 * sc * f;
      out[i * 2 + 1] = y1 * sc * f;
    }
  };
  return {
    mk: (n) => { const o = new Float32Array(n * 2); project(o, 0, n); return o; },
    anim: (out, t, n) => project(out, t, n),
  };
}

/* Round-brilliant diamond: table + girdle octagons, crown + pavilion facets. */
function diamondEdges() {
  const e = [], N = 8, yT = 0.4, rT = 0.24, yG = 0.06, rG = 0.58, culet = [0, -0.7, 0];
  const table = [], girdle = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    table.push([rT * Math.cos(a), yT, rT * Math.sin(a)]);
    girdle.push([rG * Math.cos(a + Math.PI / N), yG, rG * Math.sin(a + Math.PI / N)]);
  }
  const ring = (arr) => { for (let i = 0; i < N; i++) e.push([...arr[i], ...arr[(i + 1) % N]]); };
  ring(table); ring(girdle);
  for (let i = 0; i < N; i++) {
    e.push([...table[i], ...girdle[i]]);
    e.push([...table[i], ...girdle[(i + N - 1) % N]]);
    e.push([...girdle[i], ...culet]);
  }
  return e;
}

/* (2,3) torus knot. */
function torusKnotEdges() {
  const e = [], STEPS = 180, p = 2, q = 3, R = 0.42, r = 0.17;
  const pt = (u) => {
    const t = u * Math.PI * 2, rr = R + r * Math.cos(q * t);
    return [rr * Math.cos(p * t), r * Math.sin(q * t), rr * Math.sin(p * t)];
  };
  let prev = pt(0);
  for (let i = 1; i <= STEPS; i++) { const c = pt(i / STEPS); e.push([...prev, ...c]); prev = c; }
  return e;
}

/* Wireframe globe: meridians + latitude rings. */
function globeEdges() {
  const e = [], R = 0.62, LON = 8, LAT = 5, SEG = 26;
  const at = (lat, lon) =>
    [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon)];
  for (let j = 0; j < LON; j++) {
    const lon = (j / LON) * Math.PI * 2;
    let prev = at(-Math.PI / 2, lon);
    for (let i = 1; i <= SEG; i++) { const c = at(-Math.PI / 2 + (i / SEG) * Math.PI, lon); e.push([...prev, ...c]); prev = c; }
  }
  for (let i = 1; i < LAT; i++) {
    const lat = -Math.PI / 2 + (i / LAT) * Math.PI;
    let prev = at(lat, 0);
    for (let j = 1; j <= SEG; j++) { const c = at(lat, (j / SEG) * Math.PI * 2); e.push([...prev, ...c]); prev = c; }
  }
  return e;
}

/* ============================================================
   LIVE TORII WAVE — gate points fixed, wave points animate
   ============================================================ */
const WAVE_BARS = 19, WAVE_YC = -0.1;
let toriiGateN = 0;

function waveHeight(bi, t) {
  const x = -0.54 + (bi / (WAVE_BARS - 1)) * 1.08;
  const env = 0.2 + 0.8 * Math.exp(-(x * x) / 0.16);
  const rhythm = 0.45 + 0.55 * Math.abs(Math.sin(bi * 1.6 + 0.5 + t * 2.4));
  return 0.42 * env * rhythm;
}
function toriiFillWave(out, n, t) {
  const waveN = n - toriiGateN;
  const perBar = Math.max(2, Math.ceil(waveN / WAVE_BARS));
  for (let k = 0; k < waveN; k++) {
    const bi = Math.min(WAVE_BARS - 1, Math.floor(k / perBar));
    const x = -0.54 + (bi / (WAVE_BARS - 1)) * 1.08;
    const local = ((k % perBar) / Math.max(1, perBar - 1)) * 2 - 1;
    const o = (toriiGateN + k) * 2;
    out[o] = x;
    out[o + 1] = WAVE_YC + local * waveHeight(bi, t);
  }
}
function toriiMk(n) {
  toriiGateN = Math.round(n * 0.52);
  const out = new Float32Array(n * 2);
  out.set(samplePoints(toriiGateSegs(), toriiGateN), 0);
  toriiFillWave(out, n, 0);
  return out;
}
function toriiAnim(out, t, n) { toriiFillWave(out, n, t); }

/* ============================================================
   TEXT — the f74 monogram as strokes
   ============================================================ */
function f74Segs() {
  const s = [];
  const fx = -0.52;
  s.push(...polylineSegs([[fx - 0.02, -0.42], [fx - 0.02, 0.30], [fx + 0.02, 0.40], [fx + 0.13, 0.44]]));
  s.push(...polylineSegs([[fx - 0.16, 0.12], [fx + 0.14, 0.12]]));
  const sx = 0.02;
  s.push(...polylineSegs([[sx - 0.17, 0.42], [sx + 0.17, 0.42], [sx - 0.06, -0.42]]));
  s.push(...polylineSegs([[sx - 0.13, 0.04], [sx + 0.05, 0.04]]));
  const nx = 0.55;
  s.push(...polylineSegs([[nx + 0.07, 0.44], [nx + 0.07, -0.42]]));
  s.push(...polylineSegs([[nx + 0.07, 0.44], [nx - 0.19, -0.03], [nx + 0.21, -0.03]]));
  return s;
}

/* ============================================================
   L-SYSTEM — a deterministic bonsai with blossom clusters
   ============================================================ */
function bonsaiSegs() {
  const s = [];
  const grow = (x, y, ang, len, depth) => {
    if (depth === 0 || len < 0.045) {
      s.push(...circleSegs(x, y, 0.03, 8)); // blossom
      return;
    }
    const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
    s.push([x, y, nx, ny]);
    const spread = 0.4 + 0.05 * depth;
    grow(nx, ny, ang + spread, len * 0.74, depth - 1);
    grow(nx, ny, ang - spread * 0.82, len * 0.72, depth - 1);
    if (depth % 2 === 0) grow(nx, ny, ang + 0.05, len * 0.58, depth - 1);
  };
  grow(0, -0.74, Math.PI / 2, 0.42, 5);
  return s;
}

/* ============================================================
   PIKACHU — just for fun, built from a silhouette
   ============================================================ */
function pikachuSegs() {
  const s = [];
  // face
  s.push(...circleSegs(0, -0.08, 0.48, 48));
  // ears (closed triangles) + black-tip bands, doubled for density
  s.push(...polylineSegs([[-0.12, 0.34], [-0.34, 0.26], [-0.5, 0.94]], true));
  s.push(...polylineSegs([[0.12, 0.34], [0.34, 0.26], [0.5, 0.94]], true));
  s.push(...polylineSegs([[-0.45, 0.66], [-0.5, 0.94], [-0.37, 0.71]], true));
  s.push(...polylineSegs([[0.45, 0.66], [0.5, 0.94], [0.37, 0.71]], true));
  // eyes (dense: outer + inner ring)
  const eye = (x) => {
    s.push(...circleSegs(x, 0.05, 0.09, 16));
    s.push(...circleSegs(x, 0.05, 0.045, 10));
  };
  eye(-0.19); eye(0.19);
  // nose + open smile
  s.push(...polylineSegs([[-0.03, -0.05], [0.03, -0.05], [0, -0.1]], true));
  s.push(...polylineSegs([[-0.13, -0.16], [-0.05, -0.25], [0.05, -0.25], [0.13, -0.16]]));
  // cheeks (dense electric circles)
  const cheek = (x) => {
    s.push(...circleSegs(x, -0.14, 0.12, 18));
    s.push(...circleSegs(x, -0.14, 0.06, 10));
  };
  cheek(-0.35); cheek(0.35);
  return s;
}

/* ============================================================
   PARTICLE ENGINE
   ============================================================ */

const SHAPES = [
  { ...make3D(diamondEdges, { spin: 0.5, tilt: 0.5, persp: 0.4 }), label: "computational jewelry", sub: "live 3D · NURBS" },
  { mk: toriiMk, anim: toriiAnim, label: "voice interfaces", sub: "wake word · STT · TTS" },
  { gen: netShape, label: "applied AI", sub: "agents · tools · retrieval" },
  { ...make3D(dnaEdges, { spin: 0.55, tilt: 0.12, persp: 0.3 }), label: "healthcare", sub: "clinical logic · data" },
  { gen: chainShape, label: "on-chain systems", sub: "tokens · terminals" },
  { gen: realEstateShape, label: "real-estate automation", sub: "ops · workflows" },
  { gen: mapShape, label: "maps & routing", sub: "geo · logistics" },
  { gen: qrShape, label: "phygital bridges", sub: "QR · scan-to-app" },
  { ...make3D(torusKnotEdges, { spin: 0.7, tilt: 0.7, persp: 0.35 }), label: "generative geometry", sub: "parametric · 3D" },
  { ...make3D(globeEdges, { spin: 0.35, tilt: 0.42, persp: 0.3 }), label: "global systems", sub: "distributed · realtime" },
  { gen: f74Segs, label: "the signature", sub: "one person · whole loop" },
  { gen: bonsaiSegs, label: "patient craft", sub: "grown, not generated" },
  { gen: fujiShape, label: "the long climb", sub: "focus · craft" },
  { gen: pikachuSegs, label: "pika pika", sub: "電気ねずみ · click me", pika: true },
  { gen: hiveShape, label: "product systems", sub: "zero to shipped" },
];

const canvas = document.getElementById("hero-canvas");
const ctx = canvas.getContext("2d");
const captionBtn = document.getElementById("shape-caption");
const idxEl = document.getElementById("shape-idx");
const labelEl = document.getElementById("shape-label");
const subEl = document.getElementById("shape-sub");

let W = 0, H = 0, scale = 1, cx = 0, cy = 0;
let particles = [];
let targets = []; // one Float32Array per shape
let shapeIdx = 0;
let mouse = null;
/* colored particles draw from a small palette: accent + cyan + violet */
const cssVar = (n) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const palette = [getAccent(), cssVar("--cyan"), cssVar("--violet")];

addEventListener("accentchange", () => (palette[0] = getAccent()));

function particleCount() {
  return Math.max(340, Math.min(900, Math.floor((W * H) / 1600)));
}

function layout() {
  const rect = canvas.parentElement.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const narrow = W < 720;
  cx = narrow ? W * 0.5 : W * 0.68;
  cy = narrow ? H * 0.42 : H * 0.52;
  scale = narrow ? Math.min(W, H) * 0.34 : Math.min(W * 0.26, H * 0.36);
}

function buildTargets() {
  const n = particleCount();
  targets = SHAPES.map((s) => (s.mk ? s.mk(n) : samplePoints(s.gen(), n)));
  while (particles.length < n) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.16 ? Math.floor(Math.random() * 3) : -1,
      size: 1.4 + Math.random() * 1.1,
    });
  }
  particles.length = n;
}

function targetOf(i, t) {
  const pts = targets[shapeIdx];
  const wob = reduced ? 0 : 2.2;
  const p = particles[i];
  return [
    cx + pts[i * 2] * scale + Math.sin(t * 0.9 + p.phase) * wob,
    cy - pts[i * 2 + 1] * scale + Math.cos(t * 0.8 + p.phase * 1.3) * wob,
  ];
}

/* Feature toggles — flip to false to roll back a single effect. */
const FX = { links: true, vortex: true };

let shownIdx = -1, morphT = 0;

function drawFrame(t) {
  ctx.clearRect(0, 0, W, H);
  const shape = SHAPES[shapeIdx];
  if (shownIdx !== shapeIdx) { shownIdx = shapeIdx; morphT = t; }
  // dynamic shapes rewrite their targets every frame (3D spin, live wave)
  if (shape.anim && !reduced) shape.anim(targets[shapeIdx], t, particles.length);
  // vortex: a decaying swirl each time a shape assembles
  const swirl = (reduced || !FX.vortex) ? 0 : Math.max(0, 1 - (t - morphT) / 0.9);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const [tx, ty] = targetOf(i, t);
    p.vx = (p.vx + (tx - p.x) * 0.045) * 0.86;
    p.vy = (p.vy + (ty - p.y) * 0.045) * 0.86;
    if (swirl > 0) {
      const dx = p.x - cx, dy = p.y - cy;
      p.vx += (-dy * 0.011 - dx * 0.003) * swirl;
      p.vy += (dx * 0.011 - dy * 0.003) * swirl;
    }
    if (mouse) {
      const dx = p.x - mouse[0], dy = p.y - mouse[1];
      const d = Math.hypot(dx, dy);
      if (d < 110 && d > 0.5) {
        const f = ((110 - d) / 110) * 2.1;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    }
    p.x += p.vx;
    p.y += p.vy;
    const colored = p.hue >= 0;
    ctx.globalAlpha = colored ? 0.95 : 0.65;
    ctx.fillStyle = colored ? palette[p.hue] : "#e6e2d6";
    const s = colored ? p.size + 0.9 : p.size;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!reduced && FX.links) drawLinks();
}

/* Constellation: faint lines between nearby particles, via a spatial grid
   so it stays cheap. Each particle links to at most a couple of neighbours. */
function drawLinks() {
  const R = 30, R2 = R * R, cell = R;
  const key = (gx, gy) => (gx + 600) + (gy + 600) * 5000;
  const grid = new Map();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
    let arr = grid.get(k);
    if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(i);
  }
  ctx.beginPath();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
    let links = 0;
    for (let oy = -1; oy <= 1 && links < 2; oy++) {
      for (let ox = -1; ox <= 1 && links < 2; ox++) {
        const arr = grid.get(key(gx + ox, gy + oy));
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const dx = p.x - particles[j].x, dy = p.y - particles[j].y;
          if (dx * dx + dy * dy < R2) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            if (++links >= 2) break;
          }
        }
      }
    }
  }
  ctx.strokeStyle = "rgba(234, 231, 224, 0.10)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* Static render for reduced-motion users: particles sit on the shape. */
function drawStatic() {
  for (let i = 0; i < particles.length; i++) {
    const pts = targets[shapeIdx];
    particles[i].x = cx + pts[i * 2] * scale;
    particles[i].y = cy - pts[i * 2 + 1] * scale;
  }
  drawFrame(0);
}

function setCaption() {
  captionBtn.classList.add("fading");
  setTimeout(() => {
    idxEl.textContent = `[${shapeIdx + 1}/${SHAPES.length}]`;
    labelEl.textContent = SHAPES[shapeIdx].label;
    subEl.textContent = SHAPES[shapeIdx].sub;
    captionBtn.classList.remove("fading");
  }, 220);
}

let autoTimer = null;
function nextShape(manual = false) {
  shapeIdx = (shapeIdx + 1) % SHAPES.length;
  setCaption();
  if (reduced) drawStatic();
  if (manual && autoTimer) {
    clearInterval(autoTimer);
    autoTimer = setInterval(nextShape, 5200);
  }
}

/* jump straight to a shape (used by the console 'pika' command) */
function gotoShape(idx) {
  shapeIdx = ((idx % SHAPES.length) + SHAPES.length) % SHAPES.length;
  setCaption();
  if (reduced) drawStatic();
  if (autoTimer) { clearInterval(autoTimer); autoTimer = setInterval(nextShape, 5200); }
}

/* a synthesized "pika-pika!" chirp + electric zap — no audio files */
let audioCtx = null;
function pikaSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const A = audioCtx, now = A.currentTime;
    const chirp = (t0, f0, f1) => {
      const o = A.createOscillator(), g = A.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + 0.1);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t0 + 0.16);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g); g.connect(A.destination);
      o.start(t0); o.stop(t0 + 0.2);
    };
    chirp(now, 780, 1500);         // "pika"
    chirp(now + 0.2, 720, 1400);   // "pika"
  } catch {}
}
function pikaZap() {
  if (reduced) return;
  for (const p of particles) {
    p.vx += (Math.random() - 0.5) * 16;
    p.vy += (Math.random() - 0.5) * 16;
  }
}

captionBtn.addEventListener("click", () => nextShape(true));
canvas.addEventListener("click", () => {
  if (SHAPES[shapeIdx].pika) { pikaSound(); pikaZap(); return; }
  nextShape(true);
});

/* console 'pika' command bridges in here */
addEventListener("hero:pika", () => {
  const idx = SHAPES.findIndex((s) => s.pika);
  if (idx < 0) return;
  scrollTo({ top: 0, behavior: "smooth" });
  gotoShape(idx);
  pikaSound();
  pikaZap();
});

canvas.parentElement.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouse = [e.clientX - r.left, e.clientY - r.top];
});
canvas.parentElement.addEventListener("pointerleave", () => (mouse = null));

let rafId = null;
function loop(now) {
  drawFrame(now / 1000);
  rafId = requestAnimationFrame(loop);
}

document.addEventListener("visibilitychange", () => {
  if (reduced) return;
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    rafId = null;
  } else if (!rafId) {
    rafId = requestAnimationFrame(loop);
  }
});

addEventListener("resize", () => {
  layout();
  buildTargets();
  if (reduced) drawStatic();
});

layout();
buildTargets();
if (reduced) {
  drawStatic();
} else {
  rafId = requestAnimationFrame(loop);
  autoTimer = setInterval(nextShape, 5200);
}

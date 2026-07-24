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

/* Torii gate framing a voice waveform: the temple gate is the frame,
   the sound wave lives in the opening. */
function toriiShape() {
  const segs = [];
  // two pillars
  segs.push(...polylineSegs([[-0.5, -0.8], [-0.5, 0.55]]));
  segs.push(...polylineSegs([[0.5, -0.8], [0.5, 0.55]]));
  // kasagi (curved top lintel) + shimaki (parallel bar below it)
  segs.push(...polylineSegs([[-0.84, 0.56], [-0.4, 0.66], [0, 0.69], [0.4, 0.66], [0.84, 0.56]]));
  segs.push(...polylineSegs([[-0.8, 0.49], [0, 0.51], [0.8, 0.49]]));
  // nuki (through beam) + gakuzuka (central tablet)
  segs.push(...polylineSegs([[-0.63, 0.34], [0.63, 0.34]]));
  segs.push(...polylineSegs([[-0.07, 0.34], [0.07, 0.34], [0.07, 0.5], [-0.07, 0.5]], true));
  // voice waveform inside the gate
  const bars = 11, yc = -0.16;
  for (let i = 0; i < bars; i++) {
    const x = -0.4 + (i / (bars - 1)) * 0.8;
    const env = 0.28 + 0.72 * Math.exp(-(x * x) / 0.14);
    const rhythm = 0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + 0.6));
    const h = 0.3 * env * rhythm;
    segs.push([x, yc - h, x, yc + h]);
  }
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

/* Healthcare: heart outline with an ECG pulse across it. */
function heartShape() {
  const segs = [];
  const pts = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([x * 0.04, y * 0.04 + 0.08]);
  }
  segs.push(...polylineSegs(pts, true));
  segs.push(
    ...polylineSegs([
      [-0.5, -0.02], [-0.26, -0.02], [-0.16, 0.02], [-0.07, 0.3],
      [0.01, -0.24], [0.09, 0.05], [0.19, 0.05], [0.28, -0.02], [0.5, -0.02],
    ])
  );
  return segs;
}

/* Blockchain: three linked blocks, each stamped with a diamond glyph. */
function blockchainShape() {
  const segs = [];
  const h = 0.15;
  const centers = [[-0.52, 0.22], [0, 0], [0.52, -0.22]];
  for (const [cx, cy] of centers) {
    segs.push(...polylineSegs(
      [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], true));
    segs.push(...polylineSegs(
      [[cx, cy - h * 0.5], [cx + h * 0.5, cy], [cx, cy + h * 0.5], [cx - h * 0.5, cy]], true));
  }
  for (let i = 0; i < centers.length - 1; i++) {
    const [ax, ay] = centers[i], [bx, by] = centers[i + 1];
    segs.push(...polylineSegs([[ax + h, ay - h * 0.25], [bx - h, by + h * 0.25]]));
    segs.push(...polylineSegs([[ax + h, ay + h * 0.25], [bx - h, by - h * 0.25]]));
  }
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
   PARTICLE ENGINE
   ============================================================ */

const SHAPES = [
  { gen: ringShape, label: "computational jewelry", sub: "parametric CAD · NURBS" },
  { gen: toriiShape, label: "voice interfaces", sub: "wake word · STT · TTS" },
  { gen: netShape, label: "applied AI", sub: "agents · tools · retrieval" },
  { gen: heartShape, label: "healthcare", sub: "clinical logic · rules" },
  { gen: blockchainShape, label: "on-chain systems", sub: "tokens · terminals" },
  { gen: realEstateShape, label: "real-estate automation", sub: "ops · workflows" },
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
  targets = SHAPES.map((s) => samplePoints(s.gen(), n));
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

function drawFrame(t) {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const [tx, ty] = targetOf(i, t);
    p.vx = (p.vx + (tx - p.x) * 0.045) * 0.86;
    p.vy = (p.vy + (ty - p.y) * 0.045) * 0.86;
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
    autoTimer = setInterval(nextShape, 6500);
  }
}

captionBtn.addEventListener("click", () => nextShape(true));
canvas.addEventListener("click", () => nextShape(true));

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
  autoTimer = setInterval(nextShape, 6500);
}

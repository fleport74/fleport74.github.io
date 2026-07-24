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
  clockEl.textContent =
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}
tickClock();
setInterval(tickClock, 1000);

/* ---------------- scroll reveals ---------------- */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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

/* ---------------- card mouse glow ---------------- */
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

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

/* Audio waveform: vertical bars, gaussian envelope, rhythmic heights. */
function waveShape() {
  const segs = [];
  const bars = 24;
  for (let i = 0; i < bars; i++) {
    const x = -0.85 + (i / (bars - 1)) * 1.7;
    const envelope = 0.18 + 0.82 * Math.exp(-(x * x) / 0.3);
    const rhythm = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + 0.6));
    const h = 0.78 * envelope * rhythm;
    segs.push([x, -h, x, h]);
  }
  return segs;
}

/* Small feed-forward network: node rings + a sampled subset of edges. */
function netShape() {
  const layers = [
    { x: -0.72, n: 4 },
    { x: -0.26, n: 6 },
    { x: 0.26, n: 6 },
    { x: 0.72, n: 3 },
  ];
  const nodes = layers.map((l) =>
    Array.from({ length: l.n }, (_, j) => [
      l.x,
      ((j + 0.5) / l.n - 0.5) * 1.3,
    ])
  );
  const segs = [];
  for (let li = 0; li < nodes.length - 1; li++) {
    for (let i = 0; i < nodes[li].length; i++) {
      for (let j = 0; j < nodes[li + 1].length; j++) {
        if ((i * 3 + j * 5 + li * 7) % 10 < 4) {
          segs.push([...nodes[li][i], ...nodes[li + 1][j]]);
        }
      }
    }
  }
  for (const layer of nodes) {
    for (const [x, y] of layer) {
      const ring = circleSegs(x, y, 0.05, 10);
      segs.push(...ring, ...ring); // doubled: nodes read denser than edges
    }
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
  { gen: waveShape, label: "voice interfaces", sub: "wake word · STT · TTS" },
  { gen: netShape, label: "applied AI", sub: "agents · tools · retrieval" },
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
let accentColor = getAccent();

addEventListener("accentchange", () => (accentColor = getAccent()));

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
      accent: Math.random() < 0.11,
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
    ctx.globalAlpha = p.accent ? 0.95 : 0.65;
    ctx.fillStyle = p.accent ? accentColor : "#e6e2d6";
    const s = p.accent ? p.size + 0.9 : p.size;
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

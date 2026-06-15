/* ============================================================
   loom.js — Pattern Loom.
   A pure client-side generator for traditional Chinese lattice
   motifs (冰裂 ice-ray, 回纹 key-fret, 龟背 tortoiseshell).
   Tweak → shuffle → export SVG/PNG. No backend, no cost.
   Loaded on demand by main.js on loom.html.
   ============================================================ */

const W = 1000;            // SVG coordinate space (square)

/* ---- seeded RNG (mulberry32) so a seed reproduces a pattern ---- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- geometry ---- */
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function polyArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}

/* ---- 冰裂 ICE-RAY: recursively cut the square into irregular polygons ---- */
function iceRay(count, rnd) {
  let polys = [[[0, 0], [W, 0], [W, W], [0, W]]];
  let guard = 0;
  while (polys.length < count && guard++ < count * 4) {
    polys.sort((a, b) => polyArea(b) - polyArea(a));
    const poly = polys.shift();
    const n = poly.length;
    let i = Math.floor(rnd() * n), j = Math.floor(rnd() * n), tries = 0;
    while ((j === i || (j + 1) % n === i || (i + 1) % n === j) && tries++ < 12) j = Math.floor(rnd() * n);
    if (j === i) { polys.push(poly); continue; }
    if (i > j) [i, j] = [j, i];
    const pa = lerp(poly[i], poly[(i + 1) % n], 0.25 + rnd() * 0.5);
    const pb = lerp(poly[j], poly[(j + 1) % n], 0.25 + rnd() * 0.5);
    const A = [pa]; for (let k = i + 1; k <= j; k++) A.push(poly[k]); A.push(pb);
    const B = [pb]; for (let k = j + 1; k < i + n + 1; k++) B.push(poly[k % n]); B.push(pa);
    polys.push(A, B);
  }
  return polys.map((p) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z"/>`).join('');
}

/* ---- 回纹 KEY-FRET: a squared-spiral hook tiled on a grid ---- */
const KEY = [[0.12, 0.88], [0.12, 0.12], [0.88, 0.12], [0.88, 0.7], [0.34, 0.7], [0.34, 0.34], [0.66, 0.34], [0.66, 0.52]];
function keyFret(n) {
  const cell = W / n;
  let out = `<rect x="0" y="0" width="${W}" height="${W}" fill="none"/>`;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rot = ((r + c) % 4) * 90;       // alternate orientation → interlocking field
    const pts = KEY.map(([x, y]) => `${(c * cell + x * cell).toFixed(1)} ${(r * cell + y * cell).toFixed(1)}`);
    out += `<polyline points="${pts.join(' ')}" transform="rotate(${rot} ${(c + 0.5) * cell} ${(r + 0.5) * cell})"/>`;
  }
  return out;
}

/* ---- 龟背 TORTOISESHELL: tessellated hexagons ---- */
function tortoise(radius) {
  const r = radius;
  const hw = Math.sqrt(3) * r;            // horizontal spacing (pointy-top)
  const vh = 1.5 * r;
  const hex = (cx, cy) => {
    const pts = [];
    for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90); pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`); }
    return `<path d="M${pts.join('L')}Z"/>`;
  };
  let out = '';
  let row = 0;
  for (let cy = -r; cy < W + r; cy += vh, row++) {
    const offset = (row % 2) ? hw / 2 : 0;
    for (let cx = -r + offset; cx < W + hw; cx += hw) out += hex(cx, cy);
  }
  return out;
}

const PALETTES = {
  ink:       { fg: '#1A1A18', bg: '#EDEAE3' },   // sumi ink on concrete (default)
  accent:    { fg: '#6E6A60', bg: '#EDEAE3' },   // patina/clay on concrete
  invert:    { fg: '#EDEAE3', bg: '#1A1A18' },
  accentink: { fg: '#6E6A60', bg: '#1A1A18' },   // patina on ink
};

function buildSVG(s) {
  const pal = PALETTES[s.palette] || PALETTES.ink;
  let inner;
  if (s.type === 'iceray') inner = iceRay(s.count, rng(s.seed));
  else if (s.type === 'keyfret') inner = keyFret(s.n);
  else inner = tortoise(s.radius);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">` +
    `<rect width="${W}" height="${W}" fill="${pal.bg}"/>` +
    `<g fill="none" stroke="${pal.fg}" stroke-width="${s.weight}" stroke-linejoin="round" stroke-linecap="round">${inner}</g>` +
    `</svg>`;
}

/* density slider (0..100) → per-type parameter */
function applyDensity(s, v) {
  if (s.type === 'iceray') s.count = Math.round(18 + v * 2.4);          // ~18..258 shards
  else if (s.type === 'keyfret') s.n = Math.max(2, Math.round(2 + v / 11)); // 2..11 cells
  else s.radius = Math.round(120 - v * 0.95);                            // big..small hexes
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function initLoom() {
  const root = document.getElementById('loom-app');
  if (!root) return;
  const preview = document.getElementById('loom-preview');

  const state = { type: 'iceray', densityV: 55, weight: 4, palette: 'ink', seed: 7, count: 0, n: 0, radius: 0 };
  applyDensity(state, state.densityV);

  const render = () => { preview.innerHTML = buildSVG(state); };

  // pattern type
  root.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
    state.type = b.dataset.type;
    root.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('is-on', x === b));
    applyDensity(state, state.densityV);
    render();
  }));
  // palette
  root.querySelectorAll('[data-pal]').forEach((b) => b.addEventListener('click', () => {
    state.palette = b.dataset.pal;
    root.querySelectorAll('[data-pal]').forEach((x) => x.classList.toggle('is-on', x === b));
    render();
  }));
  // sliders
  const dens = document.getElementById('loom-density');
  const wt = document.getElementById('loom-weight');
  dens.addEventListener('input', () => { state.densityV = +dens.value; applyDensity(state, state.densityV); render(); });
  wt.addEventListener('input', () => { state.weight = +wt.value; render(); });
  // seed / shuffle
  const seedLabel = document.getElementById('loom-seed');
  const setSeed = (v) => { state.seed = v; if (seedLabel) seedLabel.textContent = String(v).padStart(4, '0'); render(); };
  document.getElementById('loom-shuffle').addEventListener('click', () => setSeed(Math.floor(Math.random() * 9999) + 1));

  // export
  document.getElementById('loom-svg').addEventListener('click', () => {
    download(`pattern-${state.type}-${state.seed}.svg`, new Blob([buildSVG(state)], { type: 'image/svg+xml' }));
  });
  document.getElementById('loom-png').addEventListener('click', () => {
    const size = 2400;
    const svg = buildSVG(state);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
      cv.getContext('2d').drawImage(img, 0, 0, size, size);
      cv.toBlob((b) => download(`pattern-${state.type}-${state.seed}.png`, b), 'image/png');
    };
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
  });

  setSeed(state.seed);
  render();
}

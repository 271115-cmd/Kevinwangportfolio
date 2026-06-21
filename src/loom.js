/* ============================================================
   loom.js — Pattern Loom (v2): a generative window-screen studio.
   Reimagined around one big, seamlessly-tiling lattice screen,
   curated material "moods", a one-of-a-kind weave (shuffle), and
   real-world exports (phone / desktop / social / print / tile)
   plus a shareable permalink. Pure client-side. Loaded on demand
   by main.js on loom.html.
   ============================================================ */

const S = 1000;                         // base tile coordinate unit

/* ---- seeded RNG (mulberry32) so a seed reproduces a screen ---- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const f = (n) => (Math.round(n * 10) / 10);
function polyArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}

/* ---- 冰裂 ICE-RAY — recursively crack a square, then mirror into
        a 2S×2S tile so it tiles seamlessly (reads as a carved screen). ---- */
function iceRayCuts(count, rnd) {
  let polys = [[[0, 0], [S, 0], [S, S], [0, S]]]; const cuts = []; let guard = 0;
  while (polys.length < count && guard++ < count * 5) {
    polys.sort((a, b) => polyArea(b) - polyArea(a));
    const poly = polys.shift(); const n = poly.length;
    let i = Math.floor(rnd() * n), j = Math.floor(rnd() * n), tries = 0;
    while ((j === i || (j + 1) % n === i || (i + 1) % n === j) && tries++ < 12) j = Math.floor(rnd() * n);
    if (j === i) { polys.push(poly); continue; }
    if (i > j) [i, j] = [j, i];
    const pa = lerp(poly[i], poly[(i + 1) % n], 0.25 + rnd() * 0.5);
    const pb = lerp(poly[j], poly[(j + 1) % n], 0.25 + rnd() * 0.5);
    const A = [pa]; for (let k = i + 1; k <= j; k++) A.push(poly[k]); A.push(pb);
    const B = [pb]; for (let k = j + 1; k < i + n + 1; k++) B.push(poly[k % n]); B.push(pa);
    cuts.push([pa, pb]);                                        // the crack itself — not the polygon frame
    polys.push(A, B);
  }
  return cuts;
}
const stampCuts = (cuts, tx, ty, sx, sy) =>
  cuts.map(([a, b]) => `M${f(tx + a[0] * sx)} ${f(ty + a[1] * sy)}L${f(tx + b[0] * sx)} ${f(ty + b[1] * sy)}`).join('');
function genIceray(scale, seed) {
  const count = Math.round(14 + scale * 1.06);                 // 14..120 shards
  const cuts = iceRayCuts(count, rng(seed));
  // mirror the crack network into a 2S×2S tile → seamless, organic, frameless
  const d = stampCuts(cuts, 0, 0, 1, 1) + stampCuts(cuts, 2 * S, 0, -1, 1)
          + stampCuts(cuts, 0, 2 * S, 1, -1) + stampCuts(cuts, 2 * S, 2 * S, -1, -1);
  return { w: 2 * S, h: 2 * S, body: `<path d="${d}"/>`, weight: (2 * S) / (Math.sqrt(count) * 22) };
}

/* ---- 回纹 KEY-FRET — squared-spiral hook on a grid (n a multiple of 4
        so the rotation field wraps; motif stays inside its cell → tiles). ---- */
const KEY = [[0.12, 0.88], [0.12, 0.12], [0.88, 0.12], [0.88, 0.7], [0.34, 0.7], [0.34, 0.34], [0.66, 0.34], [0.66, 0.52]];
function genKeyfret(scale) {
  let n = 4 + Math.round(scale / 100 * 12); n = Math.max(4, Math.round(n / 4) * 4);   // 4..16
  const cell = S / n; let out = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rot = ((r + c) % 4) * 90;
    const pts = KEY.map(([x, y]) => `${f(c * cell + x * cell)} ${f(r * cell + y * cell)}`).join(' ');
    out += `<polyline points="${pts}" transform="rotate(${rot} ${f((c + 0.5) * cell)} ${f((r + 0.5) * cell)})"/>`;
  }
  return { w: S, h: S, body: out, weight: cell * 0.055 };
}

/* ---- 龟背 TORTOISESHELL — pointy-top hexes on their exact period → tiles. ---- */
function genTortoise(scale) {
  const r = Math.round(200 - scale * 1.3);                     // 200..70 (big..fine)
  const hw = Math.sqrt(3) * r, vh = 1.5 * r;
  const W = hw, H = 3 * r;                                      // horizontal / vertical periods
  const hex = (cx, cy) => {
    const pts = [];
    for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90); pts.push(`${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`); }
    return `M${pts.join('L')}Z`;
  };
  let d = '', row = 0;
  for (let cy = -r; cy < H + r; cy += vh, row++) {
    const off = (row % 2) ? hw / 2 : 0;
    for (let cx = -hw + off; cx < W + hw; cx += hw) d += hex(cx, cy);
  }
  return { w: W, h: H, body: `<path d="${d}"/>`, weight: r * 0.05 };
}

/* ---- 斜格 TRELLIS — crossed diagonals → diamond lattice, tiles natively. ---- */
function genTrellis(scale) {
  const n = Math.round(4 + scale * 0.16);                      // 4..20
  const c = S / n;
  return { w: c, h: c, body: `<path d="M0 0L${f(c)} ${f(c)}M${f(c)} 0L0 ${f(c)}"/>`, weight: c * 0.05 };
}

const MOTIFS = {
  iceray:   { cn: '冰裂', en: 'Ice-ray',  gen: (sc, seed) => genIceray(sc, seed), seeded: true,  pv: 1.7, ex: 2 },
  keyfret:  { cn: '回纹', en: 'Key-fret', gen: (sc) => genKeyfret(sc),            seeded: false, pv: 3,   ex: 5 },
  tortoise: { cn: '龟背', en: 'Tortoise', gen: (sc) => genTortoise(sc),           seeded: false, pv: 3,   ex: 6 },
  trellis:  { cn: '斜格', en: 'Trellis',  gen: (sc) => genTrellis(sc),            seeded: false, pv: 4,   ex: 7 },
};

/* ---- curated material moods (duotone — fewer, better than a colour picker) ---- */
const MOODS = [
  { id: 'ink',       name: 'Ink & paper',  fg: '#19160F', bg: '#FFFFFF' },
  { id: 'rice',      name: 'Rice & clay',  fg: '#3A352B', bg: '#EFE9DD' },
  { id: 'celadon',   name: 'Celadon',      fg: '#284A40', bg: '#E7EFE8' },
  { id: 'vermilion', name: 'Vermilion',    fg: '#F4E9DF', bg: '#8C2F22' },
  { id: 'indigo',    name: 'Indigo night', fg: '#CAD3E3', bg: '#1B2334' },
  { id: 'bronze',    name: 'Bronze',       fg: '#C49A4E', bg: '#1A1712' },
];
const moodOf = (id) => MOODS.find((m) => m.id === id) || MOODS[0];

/* ---- export presets (all of the above) ---- */
const PRESETS = [
  { id: 'phone',   name: 'Phone wallpaper',   w: 1290, h: 2796 },
  { id: 'desktop', name: 'Desktop wallpaper', w: 2560, h: 1440 },
  { id: 'square',  name: 'Square · social',   w: 2048, h: 2048 },
  { id: 'a4',      name: 'Print · A4',        w: 2480, h: 3508 },
  { id: 'a3',      name: 'Print · A3',        w: 3508, h: 4961 },
  { id: 'tile',    name: 'Seamless tile',     w: 0,    h: 0 },
];

/* ---- compose a tiling SVG that fills outW×outH ---- */
function patternSVG(tile, mood, outW, outH, tilePx) {
  const ph = tilePx * (tile.h / tile.w);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}" preserveAspectRatio="xMidYMid slice">`
    + `<defs><pattern id="lt" patternUnits="userSpaceOnUse" width="${f(tilePx)}" height="${f(ph)}" viewBox="0 0 ${f(tile.w)} ${f(tile.h)}">`
    + `<g fill="none" stroke="${mood.fg}" stroke-width="${f(tile.weight)}" stroke-linejoin="round" stroke-linecap="round">${tile.body}</g>`
    + `</pattern></defs>`
    + `<rect width="${outW}" height="${outH}" fill="${mood.bg}"/>`
    + `<rect width="${outW}" height="${outH}" fill="url(#lt)"/></svg>`;
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export function initLoom() {
  const root = document.getElementById('loom-app');
  if (!root) return;
  const preview = document.getElementById('loom-preview');
  const seedLabel = document.getElementById('loom-seed');
  const scaleEl = document.getElementById('loom-scale');

  const state = { motif: 'iceray', mood: 'ink', scale: 55, seed: 7 };
  readHash(state);

  /* build mood chips + preset options */
  const moodsWrap = document.getElementById('loom-moods');
  moodsWrap.innerHTML = MOODS.map((m) =>
    `<button class="loom-mood" type="button" data-mood="${m.id}" title="${m.name}" aria-label="${m.name}">
       <span class="loom-sw" style="background:${m.bg};color:${m.fg}"><i style="background:${m.fg}"></i></span>
       <span class="loom-mood-name">${m.name}</span>
     </button>`).join('');
  const presetEl = document.getElementById('loom-preset');
  presetEl.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  let tile = MOTIFS[state.motif].gen(state.scale, state.seed);

  const buildTile = () => { tile = MOTIFS[state.motif].gen(state.scale, state.seed); };
  const render = () => {
    const M = MOTIFS[state.motif], mood = moodOf(state.mood);
    preview.innerHTML = patternSVG(tile, mood, S, S, S / M.pv);
    preview.style.setProperty('--mood-bg', mood.bg);
    syncUI();
    writeHash(state);
  };
  const syncUI = () => {
    root.querySelectorAll('[data-motif]').forEach((b) => b.classList.toggle('is-on', b.dataset.motif === state.motif));
    root.querySelectorAll('[data-mood]').forEach((b) => b.classList.toggle('is-on', b.dataset.mood === state.mood));
    if (seedLabel) seedLabel.textContent = String(state.seed).padStart(4, '0');
    if (scaleEl && +scaleEl.value !== state.scale) scaleEl.value = state.scale;
  };

  /* interactions */
  root.querySelectorAll('[data-motif]').forEach((b) => b.addEventListener('click', () => {
    state.motif = b.dataset.motif; buildTile(); render();
  }));
  root.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => {
    state.mood = b.dataset.mood; render();
  }));
  scaleEl.addEventListener('input', () => { state.scale = +scaleEl.value; buildTile(); render(); });

  document.getElementById('loom-shuffle').addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 9999) + 1;
    if (!MOTIFS[state.motif].seeded) state.scale = 30 + Math.floor(Math.random() * 50);  // give non-seeded motifs variety too
    buildTile(); render();
  });

  /* export + share */
  const sizeFor = (preset) => {
    if (preset.id === 'tile') { const base = 1024; return { w: base, h: Math.round(base * tile.h / tile.w), tilePx: base }; }
    const minDim = Math.min(preset.w, preset.h);
    return { w: preset.w, h: preset.h, tilePx: minDim / MOTIFS[state.motif].ex };
  };
  const currentPreset = () => PRESETS.find((p) => p.id === presetEl.value) || PRESETS[0];
  const fileBase = () => `loom-${state.motif}-${state.mood}-${String(state.seed).padStart(4, '0')}`;

  document.getElementById('loom-svg').addEventListener('click', () => {
    const p = currentPreset(), s = sizeFor(p);
    download(`${fileBase()}-${p.id}.svg`, new Blob([patternSVG(tile, moodOf(state.mood), s.w, s.h, s.tilePx)], { type: 'image/svg+xml' }));
  });
  document.getElementById('loom-png').addEventListener('click', () => {
    const p = currentPreset(), s = sizeFor(p);
    const svg = patternSVG(tile, moodOf(state.mood), s.w, s.h, s.tilePx);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = s.w; cv.height = s.h;
      cv.getContext('2d').drawImage(img, 0, 0, s.w, s.h);
      cv.toBlob((b) => download(`${fileBase()}-${p.id}.png`, b), 'image/png');
    };
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
  });

  const linkBtn = document.getElementById('loom-link');
  linkBtn.addEventListener('click', async () => {
    writeHash(state);
    try { await navigator.clipboard.writeText(location.href); linkBtn.classList.add('is-copied'); linkBtn.textContent = '✓ Link copied'; }
    catch { linkBtn.textContent = location.href; }
    setTimeout(() => { linkBtn.classList.remove('is-copied'); linkBtn.innerHTML = '⧉ Copy share link'; }, 1800);
  });

  render();
}

/* ---- share state in the URL hash (so any screen can be reopened) ---- */
function writeHash(s) {
  const h = `#m=${s.motif}&p=${s.mood}&s=${s.scale}&n=${s.seed}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
function readHash(s) {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('m') && MOTIFS[h.get('m')]) s.motif = h.get('m');
  if (h.get('p') && moodOf(h.get('p')).id === h.get('p')) s.mood = h.get('p');
  const sc = +h.get('s'); if (sc >= 0 && sc <= 100) s.scale = sc;
  const n = +h.get('n'); if (n > 0) s.seed = Math.floor(n);
}

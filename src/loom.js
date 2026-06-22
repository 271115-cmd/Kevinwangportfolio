/* ============================================================
   loom.js — Pattern Loom (v3): a generative window-screen studio.

   A 100% client-side instrument for traditional Chinese lattice
   (窗棂 / 格心). Six motifs, each a SEAMLESSLY-TILING unit cell and
   each genuinely SEEDED (so "Weave a new one" yields a one-of-a-kind
   screen for all of them). Dress it in a material mood, set it in a
   timber 边框/心屉 frame, and carry it away as a wallpaper, a print,
   or a seamless tile. Loaded on demand by main.js on loom.html.

   Tiling discipline (the whole instrument rests on it):
   - Every motif returns { w, h, body, weight } where body draws inside
     a w×h viewBox that tiles by simple translation (a <pattern>).
   - All seeded variation is a PURE FUNCTION of position modulo the
     tile period (a stateless hash of cell coords), never a streaming
     RNG over the field — so opposite edges always match.
   - Ice-ray is the one aperiodic grammar: its cracks never touch the
     tile boundary except as matched spanning fissures, so a single
     S×S tile repeats with no seam and no mirror axis.
   ============================================================ */

const S = 1000;                         // base tile coordinate unit

/* ---- seeded RNG (mulberry32) — a seed reproduces a screen ---- */
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* ---- stateless 2-D hash → [0,1): used for per-cell variation that
        MUST be periodic on the tile (tile-safe, unlike a stream rng) ---- */
function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const f = (n) => (Math.round(n * 10) / 10);

/* ============================================================
   冰裂 ICE-RAY — a seamless, non-mirrored crack network built as a
   TOROIDAL Voronoi tessellation. Scatter seed points in the tile,
   relax them (Lloyd) for even shards, then take each site's Voronoi
   cell using the NEAREST periodic image of every neighbour. Because
   the diagram is computed on the torus, the S×S tile repeats with no
   seam, no grid and no mirror axis — just irregular cracked-ice
   shards meeting at clean three-way junctions, the literati 冰裂纹.
   ============================================================ */
function nearestImage(q, p) {
  let best = q, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const cx = q[0] + dx * S, cy = q[1] + dy * S;
    const d = (cx - p[0]) ** 2 + (cy - p[1]) ** 2;
    if (d < bd) { bd = d; best = [cx, cy]; }
  }
  return best;
}
function clipHalf(poly, p, q) {                                // keep the half-plane nearer p (Sutherland–Hodgman)
  const dx = q[0] - p[0], dy = q[1] - p[1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const side = (pt) => (pt[0] - mx) * dx + (pt[1] - my) * dy;  // <= 0 → keep
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], sa = side(A), sb = side(B);
    if (sa <= 0) out.push(A);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) { const t = sa / (sa - sb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
  }
  return out;
}
function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length], cr = A[0] * B[1] - B[0] * A[1]; a += cr; cx += (A[0] + B[0]) * cr; cy += (A[1] + B[1]) * cr; }
  a *= 0.5; if (Math.abs(a) < 1e-6) return poly[0];
  return [cx / (6 * a), cy / (6 * a)];
}
function genIceray(scale, seed) {
  const rnd = rng(seed);
  const N = Math.max(5, Math.round(5 + scale * 0.78));         // ~5..83 shards
  let pts = []; for (let i = 0; i < N; i++) pts.push([rnd() * S, rnd() * S]);
  const cellFor = (i, set) => {                                // Lloyd helper (toroidal nearest-image)
    let region = [[-S, -S], [2 * S, -S], [2 * S, 2 * S], [-S, 2 * S]];
    const p = set[i];
    for (let j = 0; j < N && region.length >= 3; j++) if (j !== i) region = clipHalf(region, p, nearestImage(set[j], p));
    return region;
  };
  for (let it = 0; it < 2; it++) {                             // Lloyd relaxation → calmer, hand-cut shard sizes
    const np = [];
    for (let i = 0; i < N; i++) { const cc = centroid(cellFor(i, pts)); np.push([((cc[0] % S) + S) % S, ((cc[1] % S) + S) % S]); }
    pts = np;
  }
  // Render from the 3×3 replicated site set so EVERY part of the tile is covered by a
  // real cell — including the cells whose centres live in a neighbouring tile. This is
  // what makes the boundary seamless (drawing only home cells leaves a gap-strip at the edge).
  const all = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const p of pts) all.push([p[0] + dx * S, p[1] + dy * S]);
  const cellAt = (p) => {
    let region = [[-S, -S], [2 * S, -S], [2 * S, 2 * S], [-S, 2 * S]];
    for (const q of all) { if (q !== p) region = clipHalf(region, p, q); if (region.length < 3) break; }
    return region;
  };
  const seen = new Set(), segs = [];
  for (const p of all) {
    if (p[0] < -0.5 * S || p[0] > 1.5 * S || p[1] < -0.5 * S || p[1] > 1.5 * S) continue; // only sites whose cell can touch the tile
    const c = cellAt(p); if (c.length < 3) continue;
    for (let k = 0; k < c.length; k++) {
      const A = c[k], B = c[(k + 1) % c.length];
      if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 4) continue;  // drop degenerate Voronoi slivers
      const k1 = `${Math.round(A[0])},${Math.round(A[1])}|${Math.round(B[0])},${Math.round(B[1])}`;
      const k2 = `${Math.round(B[0])},${Math.round(B[1])}|${Math.round(A[0])},${Math.round(A[1])}`;
      if (seen.has(k1) || seen.has(k2)) continue;
      seen.add(k1); segs.push([A, B]);
    }
  }
  const d = segs.map(([a, b]) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`).join('');
  return { w: S, h: S, body: `<path d="${d}"/>`, weight: S / (Math.sqrt(N) * 16) };
}

/* ============================================================
   步步锦 STEP-BROCADE — "step by step toward brightness".
   The workhorse rectilinear grille: an orthogonal 棂条 lattice whose
   panes carry nested right-angle 拐子 brackets stepping inward. The
   grid lines carry across cells (shared 棂条 → seamless); the nested
   brackets stay strictly inside each pane, so per-pane rotation is
   tile-safe. Seed varies bracket depth, handedness and the rotation
   field.
   ============================================================ */
function genStep(scale, seed) {
  const rnd = rng(seed);
  let n = Math.max(2, 2 + Math.round(scale / 100 * 12));         // 2..14 panes
  const c = S / n;
  const depth = 2 + Math.floor(rnd() * 3);                       // 2..4 nested brackets
  const hand = rnd() < 0.5 ? 1 : 0;                              // global handedness
  const koff = Math.floor(rnd() * 4);
  const g = c / (2 * depth + 2);                                 // step inset
  // the lattice grid (the structural 棂条) — shared edges → seamless
  let grid = '';
  for (let i = 0; i <= n; i++) grid += `M${f(i * c)} 0V${S}M0 ${f(i * c)}H${S}`;
  let body = `<path d="${grid}"/>`;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const ox = col * c, oy = r * c;
    const rot = (((r + col) % 2) * 2 + koff) % 4 * 90;           // interlocking step (adjacent panes mirror)
    // nested ⌐ brackets stepping inward from a corner
    let cell = '';
    for (let k = 1; k <= depth; k++) {
      const t = k * g;
      cell += `M${f(t)} ${f(c - t)}V${f(t)}H${f(c - t)}`;        // vertical arm + horizontal arm (an L)
    }
    const tf = `translate(${f(ox)} ${f(oy)})` +
      (hand ? ` translate(${f(c)} 0) scale(-1 1)` : '') +
      (rot ? ` rotate(${rot} ${f(c / 2)} ${f(c / 2)})` : '');
    body += `<g transform="${tf}"><path d="${cell}"/></g>`;
  }
  return { w: S, h: S, body, weight: c * 0.05 };
}

/* ============================================================
   回纹 KEY-FRET — the endless thunder-scroll meander. A squared
   spiral hook stamped on an n×n grid (n a multiple of 4 so the
   rotation field wraps). Hooks stay inside their cell, so a per-cell
   seeded flip is tile-safe; seed also drives a global rotation
   offset and a global handedness.
   ============================================================ */
const KEY = [[0.12, 0.88], [0.12, 0.12], [0.88, 0.12], [0.88, 0.7], [0.34, 0.7], [0.34, 0.34], [0.66, 0.34], [0.66, 0.52]];
function genKeyfret(scale, seed) {
  const rnd = rng(seed);
  const n = 4 * Math.max(1, Math.round(1 + scale / 100 * 6));    // {4,8,12,…,28} — multiple of 4 keeps the meander tiling
  const cell = S / n;
  const koff = Math.floor(rnd() * 4);
  const hand = rnd() < 0.5;
  let out = '';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const rot = ((r + col + koff) % 4) * 90;
    const flip = hash2(col % n, r % n, seed) < 0.18;            // a few hooks turn the other way (tile-safe)
    const pts = KEY.map(([x, y]) => [(col + (flip ? (1 - x) : x)) * cell, (r + y) * cell]);
    const p = pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' ');
    let tf = `rotate(${rot} ${f((col + 0.5) * cell)} ${f((r + 0.5) * cell)})`;
    if (hand) tf += ` translate(${f((2 * col + 1) * cell)} 0) scale(-1 1)`;
    out += `<polyline points="${p}" transform="${tf}"/>`;
  }
  return { w: S, h: S, body: out, weight: cell * 0.05 };
}

/* ============================================================
   八角锦 OCTAGON BROCADE — octagons knotted by small squares (the
   4·8·8 truncated-square net). Each cell's four corners are cut at
   45°; the cuts of four neighbouring cells meet at a grid vertex to
   form a small square. Seed varies the cut proportion, an optional
   inner cross, and a double line.
   ============================================================ */
function genOctagon(scale, seed) {
  const rnd = rng(seed);
  let n = Math.max(2, 2 + Math.round(scale / 100 * 11));         // 2..13
  const c = S / n;
  const fr = 0.22 + rnd() * 0.16;                                // cut fraction (0.293 = regular)
  const t = fr * c;
  const cross = rnd() < 0.5;
  let body = '';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const x = col * c, y = r * c;
    // four 45° corner cuts
    body += `M${f(x + t)} ${f(y)}L${f(x)} ${f(y + t)}`;
    body += `M${f(x + c - t)} ${f(y)}L${f(x + c)} ${f(y + t)}`;
    body += `M${f(x + c)} ${f(y + c - t)}L${f(x + c - t)} ${f(y + c)}`;
    body += `M${f(x + t)} ${f(y + c)}L${f(x)} ${f(y + c - t)}`;
    // octagon's straight edges = the middle of each cell edge (shared between cells)
    body += `M${f(x + t)} ${f(y)}H${f(x + c - t)}`;
    body += `M${f(x + c)} ${f(y + t)}V${f(y + c - t)}`;
    body += `M${f(x + c - t)} ${f(y + c)}H${f(x + t)}`;
    body += `M${f(x)} ${f(y + c - t)}V${f(y + t)}`;
    if (cross) {                                                 // inner cross between octagon-edge midpoints
      const m = c / 2;
      body += `M${f(x + m)} ${f(y + t)}V${f(y + c - t)}`;
      body += `M${f(x + t)} ${f(y + m)}H${f(x + c - t)}`;
    }
  }
  return { w: S, h: S, body: `<path d="${body}"/>`, weight: c * 0.05 };
}

/* ============================================================
   龟背 TORTOISESHELL — pointy-top hexagons on their exact period.
   Seed picks a global enrichment (plain / concentric inner hex /
   centre node) — each centred in the cell, so tiling is untouched.
   ============================================================ */
function genTortoise(scale, seed) {
  const rnd = rng(seed);
  const nx = Math.max(2, 2 + Math.round(scale / 100 * 11));      // 2..13 columns across the S-tile
  const ny = Math.max(1, Math.round(nx * 0.5774));              // ≈ nx/√3 → near-regular hexes
  const hw = S / nx, r = S / (3 * ny), vh = 1.5 * r;           // integer periods that divide S → tiles a square
  const variant = Math.floor(rnd() * 3);                         // 0 plain · 1 inner hex · 2 centre node
  const inner = 0.5 + rnd() * 0.12;
  const hexPath = (cx, cy, rr) => {
    const pts = [];
    for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90); pts.push(`${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`); }
    return `M${pts.join('L')}Z`;
  };
  let d = '', extra = '', row = 0;
  for (let cy = -r; cy < S + r; cy += vh, row++) {
    const off = (row % 2) ? hw / 2 : 0;
    for (let cx = -hw + off; cx < S + hw; cx += hw) {
      d += hexPath(cx, cy, r);
      if (variant === 1) extra += hexPath(cx, cy, r * inner);
      else if (variant === 2) extra += `M${f(cx)} ${f(cy)}m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`;
    }
  }
  return { w: S, h: S, body: `<path d="${d}"/>${extra ? `<path d="${extra}"/>` : ''}`, weight: r * 0.05 };
}

/* ============================================================
   斜格 TRELLIS — the diagonal weave of a bamboo screen. Crossed
   diagonals form a diamond lattice; seed adds a doubled "woven"
   line or an inscribed diamond at each crossing.
   ============================================================ */
function genTrellis(scale, seed) {
  const rnd = rng(seed);
  const n = Math.max(3, Math.round(3 + scale * 0.22));          // 3..25 cells across the S-tile
  const c = S / n;
  const mode = Math.floor(rnd() * 3);                            // 0 single · 1 doubled weave · 2 inscribed
  const o = c * 0.16, h = c / 2, q = c * 0.22;
  let d = '';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const x = col * c, y = r * c;
    d += `M${f(x)} ${f(y)}L${f(x + c)} ${f(y + c)}M${f(x + c)} ${f(y)}L${f(x)} ${f(y + c)}`;
    if (mode === 1) d += `M${f(x + o)} ${f(y)}L${f(x + c)} ${f(y + c - o)}M${f(x + c - o)} ${f(y)}L${f(x)} ${f(y + c - o)}`;
    else if (mode === 2) d += `M${f(x + h)} ${f(y + h - q)}L${f(x + h + q)} ${f(y + h)}L${f(x + h)} ${f(y + h + q)}L${f(x + h - q)} ${f(y + h)}Z`;
  }
  return { w: S, h: S, body: `<path d="${d}"/>`, weight: c * 0.05 };
}

/* ---- the motif registry (cn / en / generator / cultural note + preview & export tile counts) ---- */
const MOTIFS = {
  iceray:      { cn: '冰裂', en: 'Ice-ray',      gen: genIceray,  pv: 2.1, ex: 2,
                 note: 'cracking river ice — a literati emblem of fortune drawn from hardship; fills the 格心 lattice field of a partition screen.' },
  stepbrocade: { cn: '步步锦', en: 'Step-brocade', gen: genStep,    pv: 1.3, ex: 2,
                 note: 'nested right-angle bars “stepping toward brightness” — the workhorse rectilinear grille of Qing windows.' },
  keyfret:     { cn: '回纹', en: 'Key-fret',     gen: genKeyfret, pv: 1.4, ex: 3,
                 note: 'the endless thunder-scroll meander — the 回 “return” character, continuity without end.' },
  octagon:     { cn: '八角锦', en: 'Octagon',      gen: genOctagon, pv: 1.5, ex: 3,
                 note: 'octagons knotted by small squares — a formal woven net, the 4·8·8 brocade.' },
  tortoise:    { cn: '龟背', en: 'Tortoise',     gen: genTortoise, pv: 1.35, ex: 2,
                 note: 'the tortoiseshell hexagon — longevity and cosmic order, nature’s own tessellation.' },
  trellis:     { cn: '斜格', en: 'Trellis',      gen: genTrellis, pv: 1.4, ex: 2,
                 note: 'the diagonal weave of a bamboo screen — light read through the crossings.' },
};
const MOTIF_KEYS = Object.keys(MOTIFS);

/* ---- curated material moods (duotone — colour lives only in the artifact) ---- */
const MOODS = [
  { id: 'ink',       name: 'Ink & paper',  fg: '#19160F', bg: '#FFFFFF' },
  { id: 'rice',      name: 'Rice & clay',  fg: '#3A352B', bg: '#EFE9DD' },
  { id: 'celadon',   name: 'Celadon',      fg: '#284A40', bg: '#E7EFE8' },
  { id: 'vermilion', name: 'Vermilion',    fg: '#F4E9DF', bg: '#8C2F22' },
  { id: 'indigo',    name: 'Indigo night', fg: '#CAD3E3', bg: '#1B2334' },
  { id: 'bronze',    name: 'Bronze',       fg: '#C49A4E', bg: '#1A1712' },
];
const moodOf = (id) => MOODS.find((m) => m.id === id) || MOODS[0];

/* ---- frame: the timber 边框 around an inset 心屉 field ---- */
const FRAMES = ['none', 'panel', 'bay'];
const frameLabel = { none: 'No frame', panel: 'Single leaf', bay: 'Two-by-two bay' };

/* ---- export presets ---- */
const PRESETS = [
  { id: 'square',  name: 'Square · social',   w: 2048, h: 2048 },
  { id: 'phone',   name: 'Phone wallpaper',   w: 1290, h: 2796 },
  { id: 'desktop', name: 'Desktop wallpaper', w: 2560, h: 1440 },
  { id: 'a4',      name: 'Print · A4',        w: 2480, h: 3508 },
  { id: 'a3',      name: 'Print · A3',        w: 3508, h: 4961 },
  { id: 'tile',    name: 'Seamless tile',     w: 0,    h: 0 },
];

/* ---- line-weight slider (0..100) → stroke multiplier ---- */
const weightMul = (v) => 0.45 + (v / 100) * 1.95;               // ~0.45..2.4×

let CLIP = 0;
const svgWrap = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

/* the tiling <pattern> def + a filled rect reference, optionally clipped */
function patternDefs(tile, mood, tilePx, wmul) {
  const ph = tilePx * (tile.h / tile.w);
  return `<pattern id="lt" patternUnits="userSpaceOnUse" width="${f(tilePx)}" height="${f(ph)}" viewBox="0 0 ${f(tile.w)} ${f(tile.h)}">`
    + `<g fill="none" stroke="${mood.fg}" stroke-width="${f(tile.weight * wmul)}" stroke-linejoin="round" stroke-linecap="round">${tile.body}</g></pattern>`;
}

/* compose the full output: bg + tiled lattice, optionally set in a frame */
function composeSVG(tile, mood, outW, outH, tilePx, frame, wmul) {
  const defs = patternDefs(tile, mood, tilePx, wmul);
  const bg = `<rect width="${outW}" height="${outH}" fill="${mood.bg}"/>`;
  if (!frame || frame === 'none') {
    return svgWrap(outW, outH, `<defs>${defs}</defs>${bg}<rect width="${outW}" height="${outH}" fill="url(#lt)"/>`);
  }
  const grid = frame === 'bay' ? 2 : 1;
  const m = Math.min(outW, outH);
  const outer = m * 0.045;                                       // 边框 outer margin
  const stile = Math.max(1.5, m * (frame === 'bay' ? 0.006 : 0.0075)); // timber weight
  const gap = frame === 'bay' ? m * 0.05 : 0;                    // mullion gap between leaves
  const panW = (outW - outer * 2 - gap * (grid - 1)) / grid;
  const panH = (outH - outer * 2 - gap * (grid - 1)) / grid;
  const inset = Math.min(panW, panH) * 0.05;                     // 边框 → 心屉 reveal
  let body = `<defs>${defs}</defs>${bg}`;
  for (let gy = 0; gy < grid; gy++) for (let gx = 0; gx < grid; gx++) {
    const px = outer + gx * (panW + gap), py = outer + gy * (panH + gap);
    const fx = px + inset, fy = py + inset, fw = panW - inset * 2, fh = panH - inset * 2;
    const id = `f${CLIP++}`;
    body += `<clipPath id="${id}"><rect x="${f(fx)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}"/></clipPath>`;
    body += `<rect x="${f(fx)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" fill="url(#lt)" clip-path="url(#${id})"/>`;
    // double-line 边框: heavy outer leaf rule + hairline 心屉 rule
    body += `<g fill="none" stroke="${mood.fg}" stroke-linejoin="miter">`
      + `<rect x="${f(px)}" y="${f(py)}" width="${f(panW)}" height="${f(panH)}" stroke-width="${f(stile)}"/>`
      + `<rect x="${f(fx)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" stroke-width="${f(stile * 0.45)}"/>`
      + `</g>`;
    // 角花 corner accents — a small right-angle bracket in each 心屉 corner
    const a = Math.min(fw, fh) * 0.12, aw = stile * 0.55;
    body += `<g fill="none" stroke="${mood.fg}" stroke-width="${f(aw)}" stroke-linecap="round">`
      + `M${f(fx)} ${f(fy + a)}V${f(fy)}H${f(fx + a)}`
      + `M${f(fx + fw - a)} ${f(fy)}H${f(fx + fw)}V${f(fy + a)}`
      + `M${f(fx + fw)} ${f(fy + fh - a)}V${f(fy + fh)}H${f(fx + fw - a)}`
      + `M${f(fx + a)} ${f(fy + fh)}H${f(fx)}V${f(fy + fh - a)}`
      + `</g>`;
  }
  return svgWrap(outW, outH, body);
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
  const scaleOut = document.getElementById('loom-scale-out');
  const weightEl = document.getElementById('loom-weight');
  const weightOut = document.getElementById('loom-weight-out');
  const captionEl = document.getElementById('loom-caption');
  const statusEl = document.getElementById('loom-status');

  const state = { motif: 'iceray', mood: 'ink', scale: 55, seed: 7, weight: 32, frame: 'none' };
  readHash(state);

  /* build mood chips + frame chips + preset options */
  const moodsWrap = document.getElementById('loom-moods');
  moodsWrap.innerHTML = MOODS.map((m) =>
    `<button class="loom-mood" type="button" role="radio" aria-checked="false" data-mood="${m.id}" title="${m.name}" aria-label="${m.name}">
       <span class="loom-sw" style="background:${m.bg};color:${m.fg}"><i style="background:${m.fg}"></i></span>
       <span class="loom-mood-name">${m.name}</span>
     </button>`).join('');
  const framesWrap = document.getElementById('loom-frames');
  if (framesWrap) framesWrap.innerHTML = FRAMES.map((fr) =>
    `<button class="loom-frame" type="button" role="radio" aria-checked="false" data-frame="${fr}">${frameLabel[fr]}</button>`).join('');
  const presetEl = document.getElementById('loom-preset');
  presetEl.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  let tile = MOTIFS[state.motif].gen(state.scale, state.seed);
  const buildTile = () => { tile = MOTIFS[state.motif].gen(state.scale, state.seed); };

  const render = () => {
    const M = MOTIFS[state.motif], mood = moodOf(state.mood);
    preview.innerHTML = composeSVG(tile, mood, S, S, S / M.pv, state.frame, weightMul(state.weight));
    preview.style.setProperty('--mood-bg', mood.bg);
    syncUI();
    writeHash(state);
  };
  const syncUI = () => {
    root.querySelectorAll('[data-motif]').forEach((b) => {
      const on = b.dataset.motif === state.motif; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
    });
    root.querySelectorAll('[data-mood]').forEach((b) => {
      const on = b.dataset.mood === state.mood; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
    });
    root.querySelectorAll('[data-frame]').forEach((b) => {
      const on = b.dataset.frame === state.frame; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
    });
    if (seedLabel) seedLabel.textContent = String(state.seed).padStart(4, '0');
    if (scaleEl && +scaleEl.value !== state.scale) scaleEl.value = state.scale;
    if (scaleOut) scaleOut.textContent = String(state.scale).padStart(3, '0');
    if (weightEl && +weightEl.value !== state.weight) weightEl.value = state.weight;
    if (weightOut) weightOut.textContent = weightMul(state.weight).toFixed(2) + '×';
    const M = MOTIFS[state.motif];
    if (captionEl) captionEl.innerHTML = `<b>${M.cn} ${M.en}</b> · ${M.note}`;
    if (statusEl) statusEl.textContent = `${M.cn} ${M.en}, ${moodOf(state.mood).name}, density ${state.scale}, ${frameLabel[state.frame].toLowerCase()}, seed ${String(state.seed).padStart(4, '0')}`;
  };

  /* interactions */
  root.querySelectorAll('[data-motif]').forEach((b) => b.addEventListener('click', () => {
    state.motif = b.dataset.motif; buildTile(); render();
  }));
  root.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => {
    state.mood = b.dataset.mood; render();
  }));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-frame]'); if (!b) return;
    state.frame = b.dataset.frame; render();
  });
  scaleEl.addEventListener('input', () => { state.scale = +scaleEl.value; buildTile(); render(); });
  if (weightEl) weightEl.addEventListener('input', () => { state.weight = +weightEl.value; render(); });

  // arrow-key roving within each radiogroup
  root.querySelectorAll('[role="radiogroup"]').forEach((grp) => grp.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    const items = [...grp.querySelectorAll('[role="radio"]')];
    const cur = items.indexOf(document.activeElement); if (cur < 0) return;
    e.preventDefault();
    const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
    const next = items[(cur + dir + items.length) % items.length];
    next.focus(); next.click();
  }));

  document.getElementById('loom-shuffle').addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 9999) + 1;
    buildTile(); render();
  });

  /* export + share */
  const sizeFor = (preset) => {
    if (preset.id === 'tile') { const base = 1024; return { w: base, h: Math.round(base * tile.h / tile.w), tilePx: base, frame: 'none' }; }
    const minDim = Math.min(preset.w, preset.h);
    return { w: preset.w, h: preset.h, tilePx: minDim / MOTIFS[state.motif].ex, frame: state.frame };
  };
  const currentPreset = () => PRESETS.find((p) => p.id === presetEl.value) || PRESETS[0];
  const fileBase = () => `loom-${state.motif}-${state.mood}${state.frame !== 'none' ? '-' + state.frame : ''}-${String(state.seed).padStart(4, '0')}`;

  document.getElementById('loom-svg').addEventListener('click', () => {
    const p = currentPreset(), s = sizeFor(p);
    download(`${fileBase()}-${p.id}.svg`, new Blob([composeSVG(tile, moodOf(state.mood), s.w, s.h, s.tilePx, s.frame, weightMul(state.weight))], { type: 'image/svg+xml' }));
  });
  document.getElementById('loom-png').addEventListener('click', () => {
    const p = currentPreset(), s = sizeFor(p);
    const svg = composeSVG(tile, moodOf(state.mood), s.w, s.h, s.tilePx, s.frame, weightMul(state.weight));
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
  const h = `#m=${s.motif}&p=${s.mood}&s=${s.scale}&n=${s.seed}&w=${s.weight}&f=${s.frame}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
function readHash(s) {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('m') && MOTIFS[h.get('m')]) s.motif = h.get('m');
  if (h.get('p') && moodOf(h.get('p')).id === h.get('p')) s.mood = h.get('p');
  const sc = +h.get('s'); if (sc >= 0 && sc <= 100) s.scale = sc;
  const n = +h.get('n'); if (n > 0) s.seed = Math.floor(n);
  const w = +h.get('w'); if (w >= 0 && w <= 100) s.weight = w;
  if (FRAMES.includes(h.get('f'))) s.frame = h.get('f');
}

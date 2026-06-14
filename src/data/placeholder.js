/* ============================================================
   placeholder.js — on-brand brutalist SVG cover generator.
   Returns a data-URI an <img> can use, so swapping in a real
   photo later (set `cover` in projects.js) is invisible to the
   layout. Token hex is read once from CSS (var() does not
   resolve inside a data-URI image).
   ============================================================ */

let TOKENS = null;
function tokens() {
  if (TOKENS) return TOKENS;
  const s = getComputedStyle(document.documentElement);
  const get = (k, fb) => (s.getPropertyValue(k).trim() || fb);
  TOKENS = {
    paper: get('--paper', '#F4F1EA'),
    ink: get('--ink', '#111110'),
    accent: get('--accent', '#FF3B00'),
  };
  return TOKENS;
}

// deterministic 0..1 from a string so each project's accent block sits
// in a stable spot (no Math.random — avoids layout jitter on re-render)
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * @param {{index?:string,label?:string,seed?:string}} opts
 * @returns {string} data-URI SVG
 */
export function placeholderCover({ index = '00', label = '', seed = '' } = {}) {
  const { paper, ink, accent } = tokens();
  const W = 1600, H = 1000;
  const r = hash01(seed || label || index);
  // accent block — one of a few brutalist placements driven by the hash
  const blocks = [
    { x: 0, y: 0, w: W * 0.42, h: H },                       // left column
    { x: W * 0.58, y: 0, w: W * 0.42, h: H },                // right column
    { x: 0, y: H * 0.62, w: W, h: H * 0.38 },                // bottom band
    { x: W * 0.5, y: 0, w: W * 0.5, h: H * 0.5 },            // quadrant
  ];
  const b = blocks[Math.floor(r * blocks.length) % blocks.length];
  const lab = String(label).toUpperCase();

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="${paper}"/>` +
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${accent}"/>` +
      `<rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${ink}" stroke-width="6"/>` +
      `<text x="56" y="${H - 70}" font-family="Archivo, Helvetica, Arial, sans-serif" font-weight="800" ` +
        `font-size="640" letter-spacing="-30" fill="${ink}" opacity="0.92">${index}</text>` +
      `<text x="60" y="120" font-family="'Space Mono', ui-monospace, monospace" font-weight="700" ` +
        `font-size="42" letter-spacing="6" fill="${ink}">${lab}</text>` +
      `<text x="${W - 60}" y="120" text-anchor="end" font-family="'Space Mono', ui-monospace, monospace" ` +
        `font-size="42" letter-spacing="6" fill="${ink}">PLACEHOLDER</text>` +
    `</svg>`;

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Returns the real cover if set, else a generated placeholder. */
export function coverFor(project, num, label) {
  if (project.cover) return project.cover;
  return placeholderCover({ index: num, label: label ?? project.discipline, seed: project.id });
}

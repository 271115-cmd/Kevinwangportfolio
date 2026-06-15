/* ============================================================
   placeholder.js — quiet concrete cover generator.
   Returns a data-URI an <img> can use, so swapping in a real
   photo later (set `cover` in projects.js) is invisible to the
   layout. A flat formwork field + a large soft index numeral +
   a hairline frame — no signal colour, no heavy border.
   Token hex is read once from CSS (var() does not resolve inside
   a data-URI image).
   ============================================================ */

let TOKENS = null;
function tokens() {
  if (TOKENS) return TOKENS;
  const s = getComputedStyle(document.documentElement);
  const get = (k, fb) => (s.getPropertyValue(k).trim() || fb);
  TOKENS = {
    mat:     get('--paper-2', '#E3DFD6'),   // the formwork field
    inkSoft: get('--ink-soft', '#7C766B'),  // the quiet numeral + labels
    line:    get('--line', 'rgba(26,26,24,0.12)'),
  };
  return TOKENS;
}

// deterministic 0..1 from a string (no Math.random — stable across re-render)
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
  const { mat, inkSoft, line } = tokens();
  const W = 1600, H = 1000;
  // a faint hash nudges the numeral's horizontal seat so covers aren't identical
  const r = hash01(seed || label || index);
  const numX = 70 + Math.round(r * 360);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="${mat}"/>` +
      `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="${line}" stroke-width="2"/>` +
      `<text x="${numX}" y="${H - 120}" font-family="Fraunces, Georgia, 'Times New Roman', serif" ` +
        `font-weight="340" font-size="560" letter-spacing="-8" fill="${inkSoft}" opacity="0.42">${index}</text>` +
      `<text x="64" y="116" font-family="'Geist Mono', ui-monospace, monospace" font-weight="500" ` +
        `font-size="38" letter-spacing="5" fill="${inkSoft}" opacity="0.75">${String(label).toUpperCase()}</text>` +
      `<text x="${W - 64}" y="116" text-anchor="end" font-family="'Geist Mono', ui-monospace, monospace" ` +
        `font-weight="400" font-size="38" letter-spacing="5" fill="${inkSoft}" opacity="0.55">PLACEHOLDER</text>` +
    `</svg>`;

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Returns the real cover if set, else a generated placeholder. */
export function coverFor(project, num, label) {
  if (project.cover) return project.cover;
  return placeholderCover({ index: num, label: label ?? project.discipline, seed: project.id });
}

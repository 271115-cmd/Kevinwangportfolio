/* ============================================================
   render-html.js — pure, DOM-free HTML builders for the data-driven
   page bodies (discipline list / gallery, journal index).
   Imported by render.js at RUNTIME and by the build-time prerender
   plugin (vite.config.js), so it must touch ONLY data modules —
   never window / document / chrome / motion.
   ============================================================ */

import { byDiscipline, labelFor } from './data/projects.js';
import { coverFor } from './data/placeholder.js';
import { POSTS } from './data/journal.js';
import { IMAGE_DIMS } from './data/imagedims.js';

export const pad2 = (n) => String(n).padStart(2, '0');
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dimAttr = (src) => { const d = IMAGE_DIMS[src]; return d ? ` width="${d[0]}" height="${d[1]}"` : ''; };
const detailHref = (p) => `project.html?slug=${encodeURIComponent(p.id)}`;
const badge = (p) => (p.external ? '<span class="pr-badge">↗ External</span>' : '');
const fmtDate = (d) => String(d).replace(/-/g, '.');

function spanRhythm(n) {
  const PRESET = { 0: [], 1: [12], 2: [6, 6], 3: [12, 6, 6], 4: [8, 4, 4, 8], 5: [8, 4, 4, 8, 12], 6: [6, 6, 8, 4, 4, 8] };
  if (PRESET[n]) return PRESET[n];
  const out = [];
  for (let i = 0; i < n; i++) { const flip = Math.floor(i / 2) % 2; out.push(i % 2 === 0 ? (flip ? 4 : 8) : (flip ? 8 : 4)); }
  if (n % 2 === 1) out[n - 1] = 12;
  return out;
}

/* discipline — editorial index rows */
export function listHTML(slug) {
  const items = byDiscipline(slug);
  const cat = labelFor(slug);
  return items.map((p, i) => {
    const cover = coverFor(p, pad2(i + 1), cat);
    const attrs = p.external
      ? `href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition`
      : `href="${esc(p.app || detailHref(p))}" data-label="${esc(cat)}"`;
    return (
      `<a class="proj-row" data-cover="${esc(cover)}" ${attrs}>` +
        `<span class="pr-index">${pad2(i + 1)}</span>` +
        `<span class="pr-title">${esc(p.title)}</span>` +
        `<span class="pr-summary">${esc(p.summary)}</span>` +
        `<span class="pr-meta">${esc(p.role)} · ${esc(p.year)} ${badge(p)}</span>` +
      `</a>`
    );
  }).join('');
}

/* discipline — image-forward gallery */
export function galleryHTML(slug) {
  const items = byDiscipline(slug);
  const cat = labelFor(slug);
  const spans = spanRhythm(items.length);
  return items.map((p, i) => {
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const attrs = ext
      ? `href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition`
      : `href="${esc(p.app || detailHref(p))}" data-label="${esc(cat)}"`;
    return (
      `<a class="gal-item reveal-plate" data-span="${spans[i]}" data-magnetic ${attrs}>` +
        `<img src="${cover}" alt="${esc(p.title)} — ${esc(cat)}"${dimAttr(cover)} loading="lazy">` +
        `<figcaption class="gi-cap">` +
          `<span class="gi-id">${pad2(i + 1)}</span>` +
          `<span class="gi-title">${esc(p.title)}</span>` +
          `<span class="gi-meta">${ext ? '↗ External' : `${esc(p.role)} · ${esc(p.year)}`}</span>` +
        `</figcaption>` +
      `</a>`
    );
  }).join('');
}

/* journal — list of field notes */
export function journalHTML() {
  return POSTS.map((p) =>
    `<a class="jr-row reveal" href="post.html?slug=${esc(p.slug)}" data-label="Journal">` +
      `<span class="jr-date">${esc(fmtDate(p.date))}</span>` +
      `<span class="jr-mid"><span class="jr-title">${esc(p.title)}</span><span class="jr-excerpt">${esc(p.excerpt)}</span></span>` +
      `<span class="jr-tags">${(p.tags || []).map(esc).join(' · ')}</span>` +
    `</a>`
  ).join('');
}

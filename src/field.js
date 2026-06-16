/* ============================================================
   field.js — the home "field": every work image scattered across
   a plane you walk around (drag to pan), zoom, and shuffle.
   After loicsutter.ch. Plain DOM + CSS transform; no WebGL.
   ============================================================ */

import { PROJECTS } from './data/projects.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* every real image (cover + gallery), each linked to its project */
function collectImages() {
  const out = [];
  PROJECTS.forEach((p) => {
    if (p.app || p.external) {
      const href = p.app || p.external;
      if (p.cover) out.push({ src: p.cover, title: p.title, href, ext: !!p.external });
      return;
    }
    const href = `project.html?slug=${encodeURIComponent(p.id)}`;
    if (p.cover) out.push({ src: p.cover, title: p.title, href });
    (p.gallery || []).forEach((g) => out.push({ src: g, title: p.title, href }));
  });
  return out;
}

export function initField() {
  const wrap = document.getElementById('field-wrap');
  const field = document.getElementById('field');
  if (!wrap || !field) return;
  const items = collectImages();
  if (!items.length) return;

  const WORLD = { w: 2800, h: 1900 };
  const MIN = 0.42, MAX = 2.6;

  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // index Index button → open the (hidden-on-home) dropdown
  const idx = wrap.querySelector('.field-index');
  if (idx) idx.addEventListener('click', () => document.getElementById('menu-toggle')?.click());

  function place() {
    field.style.width = WORLD.w + 'px';
    field.style.height = WORLD.h + 'px';
    field.innerHTML = items.map((it) => {
      const w = 96 + Math.round(rnd() * 150);                 // 96..246px
      const x = Math.round(rnd() * (WORLD.w - w));
      const y = Math.round(rnd() * (WORLD.h - 180));
      const tgt = it.ext ? ' target="_blank" rel="noopener" data-no-transition' : ' data-label=""';
      return `<a class="field-img" href="${esc(it.href)}"${tgt} style="left:${x}px;top:${y}px;width:${w}px">` +
        `<img src="${esc(it.src)}" alt="${esc(it.title)}" loading="lazy" draggable="false">` +
        `<span class="fi-cap">${esc(it.title)}</span></a>`;
    }).join('');
  }

  // view transform
  let tx = 0, ty = 0, scale = 1;
  const apply = () => { field.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  function home() {
    const fit = Math.min(wrap.clientWidth / WORLD.w, wrap.clientHeight / WORLD.h) * 1.5;
    scale = Math.max(MIN, Math.min(MAX, fit));
    tx = (wrap.clientWidth - WORLD.w * scale) / 2;
    ty = (wrap.clientHeight - WORLD.h * scale) / 2;
    apply();
  }
  function zoomAt(cx, cy, f) {
    const ns = Math.max(MIN, Math.min(MAX, scale * f));
    const r = ns / scale;
    tx = cx - (cx - tx) * r; ty = cy - (cy - ty) * r; scale = ns; apply();
  }

  seed = 7; place(); home();

  // drag to pan
  let down = false, ox = 0, oy = 0, moved = 0;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.field-corner')) return;
    down = true; moved = 0; ox = e.clientX - tx; oy = e.clientY - ty;
    wrap.classList.add('grabbing');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!down) return;
    const nx = e.clientX - ox, ny = e.clientY - oy;
    moved += Math.abs(nx - tx) + Math.abs(ny - ty);
    tx = nx; ty = ny; apply();
  });
  const end = () => { down = false; wrap.classList.remove('grabbing'); };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  // a drag must not trigger navigation
  field.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  // wheel / trackpad to zoom toward the cursor
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  // controls
  wrap.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
    const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2;
    const k = b.dataset.z;
    if (k === 'in') zoomAt(cx, cy, 1.25);
    else if (k === 'out') zoomAt(cx, cy, 1 / 1.25);
    else if (k === 'reset') { seed = 7; place(); home(); }
    else if (k === 'shuffle') { seed = (Math.floor(Math.random() * 1e7) + 1) | 0; place(); home(); }
  }));

  window.addEventListener('resize', home);
}

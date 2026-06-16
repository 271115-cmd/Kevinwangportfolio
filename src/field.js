/* ============================================================
   field.js — the home "field": the spatial/built work scattered
   across a plane you walk around. Drag pans with momentum; wheel/
   buttons zoom toward the cursor; Shuffle re-scatters. After
   loicsutter.ch. Plain DOM + a single rAF transform loop.
   Curated to architecture + models (the calm, built work) — the
   loud graphic/object/web pieces live one click away in the Index.
   ============================================================ */

import { PROJECTS } from './data/projects.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FIELD_DISCIPLINES = ['architecture', 'models'];

function collectImages() {
  const out = [];
  PROJECTS.forEach((p) => {
    if (!FIELD_DISCIPLINES.includes(p.discipline)) return;
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

  const WORLD = { w: 2000, h: 1400 };
  const MIN = 0.5, MAX = 3;
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  const idxBtn = wrap.querySelector('.field-index');
  if (idxBtn) idxBtn.addEventListener('click', () => document.getElementById('menu-toggle')?.click());

  /* grid-jitter scatter — one image per cell so nothing overlaps */
  function place() {
    const n = items.length;
    const cols = Math.max(1, Math.round(Math.sqrt(n * (WORLD.w / WORLD.h))));
    const rows = Math.ceil(n / cols);
    const cellW = WORLD.w / cols, cellH = WORLD.h / rows;
    const GAP = Math.min(cellW, cellH) * 0.12;
    const RES = 1.2;                                          // vertical reservation (most tiles are landscape)
    const maxW = Math.min(cellW - GAP, (cellH - GAP) / RES);
    const order = items.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    field.style.width = WORLD.w + 'px';
    field.style.height = WORLD.h + 'px';
    field.innerHTML = order.map((idx, slot) => {
      const it = items[idx];
      const col = slot % cols, row = Math.floor(slot / cols);
      const w = Math.round(maxW * (0.76 + rnd() * 0.22));
      const x = Math.round(col * cellW + GAP / 2 + rnd() * Math.max(0, cellW - w - GAP));
      const y = Math.round(row * cellH + GAP / 2 + rnd() * Math.max(0, cellH - w * RES - GAP));
      return `<a class="field-img" href="${esc(it.href)}" data-label="" style="left:${x}px;top:${y}px;width:${w}px">` +
        `<img src="${esc(it.src)}" alt="${esc(it.title)}" loading="lazy" decoding="async" draggable="false">` +
        `<span class="fi-cap">${esc(it.title)}</span></a>`;
    }).join('');
  }

  /* view: current eased toward a target; drag adds momentum */
  let tx = 0, ty = 0, sc = 1, txT = 0, tyT = 0, scT = 1, vx = 0, vy = 0;
  let down = false, lastX = 0, lastY = 0, moved = 0;

  function homeView() {
    const fit = Math.min(wrap.clientWidth / WORLD.w, wrap.clientHeight / WORLD.h) * 2.1;
    scT = Math.max(MIN, Math.min(MAX, fit));
    txT = (wrap.clientWidth - WORLD.w * scT) / 2;
    tyT = (wrap.clientHeight - WORLD.h * scT) / 2;
    vx = vy = 0;
  }
  function zoomAt(cx, cy, f) {
    const ns = Math.max(MIN, Math.min(MAX, scT * f));
    const r = ns / scT;
    txT = cx - (cx - txT) * r; tyT = cy - (cy - tyT) * r; scT = ns;
  }
  // soft bounds — the work can never be flung entirely off-screen
  function clampTarget() {
    const W = WORLD.w * scT, H = WORLD.h * scT;
    const vw = wrap.clientWidth, vh = wrap.clientHeight;
    txT = Math.max(vw * 0.3 - W, Math.min(vw * 0.7, txT));
    tyT = Math.max(vh * 0.3 - H, Math.min(vh * 0.7, tyT));
  }

  function tick() {
    if (!down && (Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04)) { txT += vx; tyT += vy; vx *= 0.93; vy *= 0.93; }
    clampTarget();
    const e = 0.16;
    tx += (txT - tx) * e; ty += (tyT - ty) * e; sc += (scT - sc) * e;
    field.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    requestAnimationFrame(tick);
  }

  seed = 7; place(); homeView();
  tx = txT; ty = tyT; sc = scT;           // first frame lands settled, then eases live
  requestAnimationFrame(tick);

  /* drag to pan (with velocity for momentum) */
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.field-corner')) return;
    down = true; moved = 0; lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
    wrap.classList.add('grabbing');
  });
  wrap.addEventListener('pointermove', (e) => {
    moveCursor(e);
    if (!down) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    txT += dx; tyT += dy; vx = dx; vy = dy; moved += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
  });
  const end = () => { down = false; wrap.classList.remove('grabbing'); };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  field.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  /* trackpad / wheel: scroll = walk around (pan); pinch or ctrl+wheel = zoom */
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey) zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 1 / 1.08);
    else { txT -= e.deltaX; tyT -= e.deltaY; vx = vy = 0; }
  }, { passive: false });

  /* controls */
  wrap.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
    const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2, k = b.dataset.z;
    if (k === 'in') zoomAt(cx, cy, 1.3);
    else if (k === 'out') zoomAt(cx, cy, 1 / 1.3);
    else if (k === 'reset') { seed = 7; place(); homeView(); }
    else if (k === 'shuffle') { seed = (Math.floor(Math.random() * 1e7) + 1) | 0; place(); homeView(); }
  }));
  window.addEventListener('resize', homeView);

  /* keyboard pan / zoom (a11y) */
  wrap.tabIndex = 0;
  wrap.addEventListener('keydown', (e) => {
    const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2, STEP = 120;
    if (e.key === 'ArrowLeft') { txT += STEP; vx = 0; }
    else if (e.key === 'ArrowRight') { txT -= STEP; vx = 0; }
    else if (e.key === 'ArrowUp') { tyT += STEP; vy = 0; }
    else if (e.key === 'ArrowDown') { tyT -= STEP; vy = 0; }
    else if (e.key === '+' || e.key === '=') zoomAt(cx, cy, 1.3);
    else if (e.key === '-') zoomAt(cx, cy, 1 / 1.3);
    else if (e.key.toLowerCase() === 'r') { seed = 7; place(); homeView(); }
    else return;
    e.preventDefault();
  });

  /* cursor balloon — "Open" appears beside the pointer over an image */
  const cur = wrap.querySelector('.field-cursor');
  function moveCursor(e) { if (cur) cur.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 10}px)`; }
  if (cur) {
    field.addEventListener('pointerover', (e) => { if (e.target.closest('.field-img')) cur.textContent = 'Open'; });
    field.addEventListener('pointerout', (e) => {
      if (e.target.closest('.field-img') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.field-img'))) cur.textContent = '';
    });
  }
}

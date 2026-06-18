/* ============================================================
   field.js — the home "field": the spatial/built work scattered
   across a plane you walk around. Drag/wheel pan with momentum;
   buttons (and pinch) zoom; Re-lay re-scatters; "Walk around" runs a
   guided tour that frames each work in turn. Plain DOM + one rAF loop.
   Curated to architecture + models (the calm, built work) — the
   loud graphic/object/web pieces live one click away in the Index.
   ============================================================ */

import { PROJECTS } from './data/projects.js';
import { IMAGE_DIMS } from './data/imagedims.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FIELD_DISCIPLINES = ['architecture', 'models'];

function collectImages() {
  const out = [];
  PROJECTS.forEach((p) => {
    if (!FIELD_DISCIPLINES.includes(p.discipline)) return;
    const href = `project.html?slug=${encodeURIComponent(p.id)}`;
    if (p.cover) out.push({ src: p.cover, title: p.title, href, alt: `${p.title} — cover` });
    (p.gallery || []).forEach((g, i) => out.push({ src: g, title: p.title, href, alt: `${p.title} — view ${i + 1}` }));
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
  const MIN = 0.5, MAX = 3.5;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  // a tour stop's layout box (world units); fall back to a landscape guess until the image loads
  const stopCenter = (el) => {
    const w = el.offsetWidth, h = el.offsetHeight || w * 0.7;
    return { w, h, cx: el.offsetLeft + w / 2, cy: el.offsetTop + h / 2 };
  };

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
      const d = IMAGE_DIMS[it.src];
      const dim = d ? ` width="${d[0]}" height="${d[1]}"` : '';   // reserve aspect so layout (and the tour) is correct before load
      return `<a class="field-img" href="${esc(it.href)}" data-label="" style="left:${x}px;top:${y}px;width:${w}px">` +
        `<img src="${esc(it.src)}" alt="${esc(it.alt || it.title)}"${dim} loading="lazy" decoding="async" draggable="false">` +
        `<span class="fi-cap">${esc(it.title)}</span></a>`;
    }).join('');
  }

  /* view: current eased toward a target; drag adds momentum */
  let tx = 0, ty = 0, sc = 1, txT = 0, tyT = 0, scT = 1, vx = 0, vy = 0;
  let down = false, lastX = 0, lastY = 0, moved = 0;
  // "Walk around" — a guided tour that steps between the works, one at a time.
  // Each leg is a time-based tween: ease-in-out (no lurch) with duration set by
  // the distance travelled, so every leg pans at the same steady speed.
  let walk = false, stopsEls = [], tourIdx = 0, toured = 0;
  let phase = 'travel', tweenFrom = null, tweenTo = null, tweenStart = 0, tweenDur = 0, dwellUntil = 0;
  const FRAME_W = 0.6, FRAME_H = 0.72;  // fraction of the viewport a framed work fills
  const DWELL_MS = 1500;                // pause on each work
  const PAN_SPEED = 0.75;               // screen-px per ms → constant pan speed across legs
  const MIN_DUR = 900, MAX_DUR = 3200;  // clamp a leg's duration (very short / very long jumps)

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
  function clampXY(x, y, s) {
    const W = WORLD.w * s, H = WORLD.h * s, vw = wrap.clientWidth, vh = wrap.clientHeight;
    return [Math.max(vw * 0.3 - W, Math.min(vw * 0.7, x)), Math.max(vh * 0.3 - H, Math.min(vh * 0.7, y))];
  }
  function clampTarget() { [txT, tyT] = clampXY(txT, tyT, scT); }

  // the framed, clamped view that centers stop i — read live size so it self-corrects as the image loads
  function stopView(i) {
    const el = stopsEls[i];
    if (!el) return null;
    const vw = wrap.clientWidth, vh = wrap.clientHeight;
    const { w, h, cx, cy } = stopCenter(el);
    const s = Math.max(MIN, Math.min(MAX, Math.min(vw * FRAME_W / w, vh * FRAME_H / h)));
    const [x, y] = clampXY(vw / 2 - cx * s, vh / 2 - cy * s, s);
    return { x, y, s };
  }
  // begin a tween from the current view to stop tourIdx; duration ∝ distance → equal speed
  function startLeg() {
    tweenFrom = { x: tx, y: ty, s: sc };
    tweenTo = stopView(tourIdx) || tweenFrom;
    const d = Math.hypot(tweenTo.x - tx, tweenTo.y - ty);
    tweenDur = reduced.matches ? 0 : Math.max(MIN_DUR, Math.min(MAX_DUR, d / PAN_SPEED));
    tweenStart = performance.now();
    phase = 'travel';
  }
  // reveal the framed work's name — the same caption a hover shows — until the tour reaches the next
  function markCurrent() {
    stopsEls.forEach((el, i) => el.classList.toggle('is-current', i === tourIdx));
  }
  function clearCurrent() {
    stopsEls.forEach((el) => el.classList.remove('is-current'));
  }

  function tick(now) {
    if (walk && !down && stopsEls.length && tweenTo) {
      if (phase === 'travel') {
        const p = tweenDur > 0 ? Math.min(1, (now - tweenStart) / tweenDur) : 1;
        const e = p * p * (3 - 2 * p);                 // smoothstep — eases in and out, zero velocity at both ends
        tx = tweenFrom.x + (tweenTo.x - tweenFrom.x) * e;
        ty = tweenFrom.y + (tweenTo.y - tweenFrom.y) * e;
        sc = tweenFrom.s + (tweenTo.s - tweenFrom.s) * e;
        if (p >= 1) { phase = 'dwell'; dwellUntil = now + DWELL_MS; markCurrent(); }   // arrived — show this work's name
      } else {                                         // dwell — hold on the work, then move to the next
        tx = tweenTo.x; ty = tweenTo.y; sc = tweenTo.s;
        if (now >= dwellUntil) {
          toured += 1;
          // reduced motion: no perpetual loop — show each work once, then stop (WCAG 2.3.3 / 2.2.2)
          if (reduced.matches && toured >= stopsEls.length) setWalk(false);
          else { tourIdx = (tourIdx + 1) % stopsEls.length; startLeg(); }
        }
      }
      txT = tx; tyT = ty; scT = sc;                    // keep targets synced for a seamless handoff to manual control
    } else {
      if (!down && (Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04)) { txT += vx; tyT += vy; vx *= 0.93; vy *= 0.93; }
      clampTarget();
      tx += (txT - tx) * 0.16; ty += (tyT - ty) * 0.16; sc += (scT - sc) * 0.16;
    }
    field.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    requestAnimationFrame(tick);
  }

  seed = 7; place(); homeView();
  tx = txT; ty = tyT; sc = scT;           // first frame lands settled, then eases live
  requestAnimationFrame(tick);

  const walkBtn = wrap.querySelector('.field-walk');
  const walkLabel = walkBtn?.querySelector('.fw-label');
  function setWalk(on) {
    walk = on; vx = vy = 0; toured = 0;
    if (on) {
      stopsEls = Array.from(field.querySelectorAll('.field-img'));   // tour in reading order
      // begin at the work nearest what you're already looking at, then sweep through the rest
      const wx = (wrap.clientWidth / 2 - tx) / sc, wy = (wrap.clientHeight / 2 - ty) / sc;
      let best = 0, bestD = Infinity;
      stopsEls.forEach((el, i) => {
        const { cx, cy } = stopCenter(el);
        const dx = cx - wx, dy = cy - wy;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      });
      tourIdx = best;
      startLeg();
    } else { tweenTo = null; clearCurrent(); }
    if (walkBtn) walkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (walkLabel) walkLabel.textContent = on ? 'Stop walking' : 'Walk around';
  }
  const stopWalk = () => { if (walk) setWalk(false); };
  if (walkBtn) walkBtn.addEventListener('click', () => setWalk(!walk));

  /* drag to pan (with velocity for momentum) */
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.field-corner')) return;
    stopWalk();
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
    stopWalk();
    if (e.ctrlKey) zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 1 / 1.08);
    else { txT -= e.deltaX; tyT -= e.deltaY; vx = vy = 0; }
  }, { passive: false });

  /* controls */
  wrap.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
    stopWalk();
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
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','r','R'].includes(e.key)) stopWalk();
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

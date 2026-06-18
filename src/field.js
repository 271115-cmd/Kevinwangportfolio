/* ============================================================
   field.js — the home "field": an INFINITE plane of the work that
   you walk around. Drag/wheel pan with momentum; pinch / buttons
   zoom; "Walk around" wanders the plane, framing works in turn.

   The plane is a virtual cell grid (no fixed world): each cell maps
   deterministically to a work image. Only cells in (or just past)
   the viewport are mounted in the DOM — tiles that scroll off are
   removed, so memory + work stay bounded however far you roam.
   Images are chosen to avoid repeating on a single visible screen.
   ============================================================ */

import { PROJECTS } from './data/projects.js';
import { IMAGE_DIMS } from './data/imagedims.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* all the work — covers + galleries across every discipline, round-robined by
   project so each project's images are spread far apart across the plane (a
   project rarely shows twice in one viewport, even though images differ). */
function collectImages() {
  const byProject = PROJECTS.map((p) => {
    const href = `project.html?slug=${encodeURIComponent(p.id)}`;
    const imgs = [];
    if (p.cover) imgs.push({ src: p.cover, title: p.title, href, alt: `${p.title} — cover` });
    (p.gallery || []).forEach((g, i) => imgs.push({ src: g, title: p.title, href, alt: `${p.title} — view ${i + 1}` }));
    return imgs;
  }).filter((a) => a.length);
  const out = [];
  const rounds = Math.max(0, ...byProject.map((a) => a.length));
  for (let r = 0; r < rounds; r++) for (const imgs of byProject) if (imgs[r]) out.push(imgs[r]);
  return out;   // [proj0 cover, proj1 cover, …, proj0 view1, proj1 view1, …]
}

export function initField() {
  const wrap = document.getElementById('field-wrap');
  const field = document.getElementById('field');
  if (!wrap || !field) return;
  const items = collectImages();
  const M = items.length;
  if (!M) return;

  const CELL = 480;                       // world px per virtual cell (controls density)
  const MIN = 0.4, MAX = 3.2;
  const FRAME_W = 0.6, FRAME_H = 0.72;    // fraction of viewport a framed work fills
  const OPEN_TILES = 7;                   // ~works framed on first paint
  const DWELL_MS = 1500, PAN_SPEED = 0.75, MIN_DUR = 900, MAX_DUR = 3200;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let seedOff = 0;                        // bumped by Re-lay to re-scatter the whole plane
  // deterministic pseudo-random in [0,1) for a cell + salt (stable while seedOff holds)
  function h(cx, cy, salt) {
    let n = Math.imul((cx | 0) + 0x9e37, 374761393) + Math.imul((cy | 0) + 0x85eb, 668265263) + Math.imul(salt + seedOff * 131, 2246822519);
    n = Math.imul(n ^ (n >>> 15), 2654435761);
    n ^= n >>> 13;
    return ((n >>> 0) % 1000000) / 1000000;
  }
  const imgBase = (cx, cy) => Math.floor(h(cx, cy, 1) * M) % M;

  /* ---- view: current eased toward target; drag adds momentum ---- */
  let tx = 0, ty = 0, sc = 1, txT = 0, tyT = 0, scT = 1, vx = 0, vy = 0;
  let down = false, lastX = 0, lastY = 0, moved = 0;

  const OPEN_TILES_AREA = OPEN_TILES * CELL * CELL;
  function homeView() {
    const vw = wrap.clientWidth, vh = wrap.clientHeight;
    scT = Math.max(MIN, Math.min(MAX, Math.sqrt((vw * vh) / OPEN_TILES_AREA)));
    txT = vw / 2; tyT = vh / 2;           // world origin (0,0) at the viewport centre
    vx = vy = 0;
  }
  function zoomAt(cx, cy, f) {
    const ns = Math.max(MIN, Math.min(MAX, scT * f));
    const r = ns / scT;
    txT = cx - (cx - txT) * r; tyT = cy - (cy - tyT) * r; scT = ns;
  }

  /* ---- virtualization: mount only the cells in (or just past) view ---- */
  const mounted = new Map();              // "cx,cy" -> { el, img, href }
  const projCount = new Map();            // project href -> count on screen
  const imgCount = new Map();             // image index  -> count on screen
  let rangeKey = '';
  const bumpProj = (h, d) => projCount.set(h, Math.max(0, (projCount.get(h) || 0) + d));
  const bumpImg = (i, d) => imgCount.set(i, Math.max(0, (imgCount.get(i) || 0) + d));

  const aspectOf = (it) => { const d = IMAGE_DIMS[it.src]; return d ? d[0] / d[1] : 1.4; };
  // deterministic tile box for a cell + aspect — width capped so height stays within the cell band
  function geom(cx, cy, aspect) {
    let w = Math.round(CELL * (0.46 + h(cx, cy, 2) * 0.26));
    w = Math.min(w, Math.floor(CELL * aspect * 0.92));
    const ih = w / aspect;
    const x = Math.round(cx * CELL + h(cx, cy, 3) * Math.max(0, CELL - w));
    const y = Math.round(cy * CELL + h(cx, cy, 4) * Math.max(0, CELL - ih));
    return { w, ih, cx: x + w / 2, cy: y + ih / 2, x, y };
  }
  function chooseImg(cx, cy) {
    const base = imgBase(cx, cy);
    // prefer a project not already on screen → no work repeats in view; then a distinct image;
    for (let t = 0; t < M; t++) { const c = (base + t) % M; if (!(projCount.get(items[c].href) > 0)) return c; }
    for (let t = 0; t < M; t++) { const c = (base + t) % M; if (!(imgCount.get(c) > 0)) return c; }
    let img = base, lo = Infinity;        // saturated (more tiles than works) — spread the repeat onto the least-used image
    for (let c = 0; c < M; c++) { const u = imgCount.get(c) || 0; if (u < lo) { lo = u; img = c; } }
    return img;
  }
  function makeTile(cx, cy) {
    const img = chooseImg(cx, cy);
    const it = items[img];
    const d = IMAGE_DIMS[it.src];
    const { w, ih, x, y } = geom(cx, cy, aspectOf(it));
    const el = document.createElement('a');
    el.className = 'field-img';
    el.href = it.href;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
    el.innerHTML =
      `<img src="${esc(it.src)}" alt="${esc(it.alt || it.title)}"${d ? ` width="${d[0]}" height="${d[1]}"` : ''} loading="lazy" decoding="async" draggable="false">` +
      `<span class="fi-cap">${esc(it.title)}</span>`;
    return { el, img, href: it.href };
  }

  function virtualize() {
    const vw = wrap.clientWidth, vh = wrap.clientHeight;   // mount only cells that overlap the viewport
    const c0 = Math.floor((-tx / sc) / CELL), c1 = Math.floor(((vw - tx) / sc) / CELL);
    const r0 = Math.floor((-ty / sc) / CELL), r1 = Math.floor(((vh - ty) / sc) / CELL);
    const rk = `${c0}.${c1}.${r0}.${r1}`;
    if (rk === rangeKey) return;          // cell range unchanged — nothing to mount/unmount
    rangeKey = rk;
    for (const [key, t] of mounted) {     // unmount what scrolled out (frees its DOM + image)
      const k = key.indexOf(','), cx = +key.slice(0, k), cy = +key.slice(k + 1);
      if (cx < c0 || cx > c1 || cy < r0 || cy > r1) { t.el.remove(); bumpProj(t.href, -1); bumpImg(t.img, -1); mounted.delete(key); }
    }
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const key = cx + ',' + cy;
      if (mounted.has(key)) continue;
      const t = makeTile(cx, cy);
      field.appendChild(t.el); bumpProj(t.href, 1); bumpImg(t.img, 1); mounted.set(key, t);
    }
  }
  function clearField() {
    mounted.forEach((t) => t.el.remove());
    mounted.clear(); projCount.clear(); imgCount.clear(); rangeKey = '';
  }

  /* ---- "Walk around" — wander the plane, framing one work per leg.
     Targets are picked from the DETERMINISTIC virtual grid (a cell always
     exists ahead), never from the tiny mounted set — so it can't stall. ---- */
  let walk = false, toured = 0, heading = 0, tourCell = null;
  let phase = 'travel', tweenFrom = null, tweenTo = null, tweenStart = 0, tweenDur = 0, dwellUntil = 0;
  const worldCenter = () => ({ x: (wrap.clientWidth / 2 - tx) / sc, y: (wrap.clientHeight / 2 - ty) / sc });
  const cellAt = (wx, wy) => ({ cx: Math.floor(wx / CELL), cy: Math.floor(wy / CELL) });

  // the view that frames cell (cx,cy)'s tile — uses the live mounted box if present, else the deterministic box
  function viewForCell(cx, cy) {
    const vw = wrap.clientWidth, vh = wrap.clientHeight;
    const m = mounted.get(cx + ',' + cy);
    let w, ht, ccx, ccy;
    if (m) { const el = m.el; w = el.offsetWidth; ht = el.offsetHeight || w * 0.7; ccx = el.offsetLeft + w / 2; ccy = el.offsetTop + ht / 2; }
    else { const g = geom(cx, cy, aspectOf(items[imgBase(cx, cy)])); w = g.w; ht = g.ih; ccx = g.cx; ccy = g.cy; }
    const s = Math.max(MIN, Math.min(MAX, Math.min(vw * FRAME_W / w, vh * FRAME_H / ht)));
    return { x: vw / 2 - ccx * s, y: vh / 2 - ccy * s, s };   // no clamp — the plane is infinite
  }
  // the next cell to walk to: ahead in `heading`, always a fresh, distinct grid cell
  function nextCell() {
    const c = worldCenter();
    for (let reach = CELL * 1.7; reach < CELL * 5; reach += CELL) {
      const n = cellAt(c.x + Math.cos(heading) * reach, c.y + Math.sin(heading) * reach);
      if (!tourCell || n.cx !== tourCell.cx || n.cy !== tourCell.cy) return n;
    }
    return cellAt(c.x + CELL * 2, c.y);
  }
  function startLeg() {
    tweenFrom = { x: tx, y: ty, s: sc };
    tweenTo = viewForCell(tourCell.cx, tourCell.cy);
    const d = Math.hypot(tweenTo.x - tx, tweenTo.y - ty);
    tweenDur = reduced.matches ? 0 : Math.max(MIN_DUR, Math.min(MAX_DUR, d / PAN_SPEED));
    tweenStart = performance.now();
    phase = 'travel';
  }
  function markCurrent() {
    const cur = tourCell && mounted.get(tourCell.cx + ',' + tourCell.cy);
    mounted.forEach((t) => t.el.classList.toggle('is-current', t === cur));
  }
  function clearCurrent() { mounted.forEach((t) => t.el.classList.remove('is-current')); }

  function tick(now) {
    if (walk && !down && tourCell && tweenTo) {
      if (phase === 'travel') {
        const p = tweenDur > 0 ? Math.min(1, (now - tweenStart) / tweenDur) : 1;
        const e = p * p * (3 - 2 * p);                  // smoothstep — eases in and out
        tx = tweenFrom.x + (tweenTo.x - tweenFrom.x) * e;
        ty = tweenFrom.y + (tweenTo.y - tweenFrom.y) * e;
        sc = tweenFrom.s + (tweenTo.s - tweenFrom.s) * e;
        if (p >= 1) { phase = 'dwell'; dwellUntil = now + DWELL_MS; markCurrent(); }
      } else {
        tx = tweenTo.x; ty = tweenTo.y; sc = tweenTo.s;
        if (now >= dwellUntil) {
          toured += 1;
          if (reduced.matches && toured >= 6) setWalk(false);   // finite under reduced motion (WCAG 2.3.3/2.2.2)
          else { heading += (h(toured, 7, 9) - 0.5) * 1.1; tourCell = nextCell(); startLeg(); }
        }
      }
      txT = tx; tyT = ty; scT = sc;                     // keep targets synced for a seamless manual handoff
    } else {
      if (!down && (Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04)) { txT += vx; tyT += vy; vx *= 0.93; vy *= 0.93; }
      tx += (txT - tx) * 0.16; ty += (tyT - ty) * 0.16; sc += (scT - sc) * 0.16;
    }
    virtualize();                                       // range-gated — only touches the DOM at cell crossings
    field.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    requestAnimationFrame(tick);
  }

  homeView();
  tx = txT; ty = tyT; sc = scT;                         // first frame lands settled
  virtualize();
  requestAnimationFrame(tick);

  /* ---- Walk button + interaction ---- */
  const walkBtn = wrap.querySelector('.field-walk');
  const walkLabel = walkBtn?.querySelector('.fw-label');
  function setWalk(on) {
    walk = on; vx = vy = 0; toured = 0;
    if (on) {
      const c = worldCenter();
      heading = h(Math.round(c.x), Math.round(c.y), 5) * Math.PI * 2;   // a fresh wander direction
      tourCell = cellAt(c.x, c.y);                       // open on the work nearest the centre
      startLeg();
    } else { tweenTo = null; tourCell = null; clearCurrent(); }
    if (walkBtn) walkBtn.setAttribute('aria-pressed', walk ? 'true' : 'false');
    if (walkLabel) walkLabel.textContent = walk ? 'Stop walking' : 'Walk around';
  }
  let userActed = false;
  const stopWalk = () => { userActed = true; if (walk) setWalk(false); };
  if (walkBtn) walkBtn.addEventListener('click', () => setWalk(!walk));

  const idxBtn = wrap.querySelector('.field-index');
  if (idxBtn) idxBtn.addEventListener('click', () => document.getElementById('menu-toggle')?.click());

  /* drag to pan (momentum); two-finger pinch to zoom on touch */
  const pointers = new Map();
  let pinchDist = 0;
  const pts = () => [...pointers.values()];
  const pinchSpan = () => { const a = pts(); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
  const pinchMid = () => { const a = pts(); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; };

  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.field-corner')) return;
    stopWalk();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { down = true; moved = 0; lastX = e.clientX; lastY = e.clientY; vx = vy = 0; wrap.classList.add('grabbing'); }
    else if (pointers.size === 2) { down = false; moved = 99; pinchDist = pinchSpan(); }
  });
  wrap.addEventListener('pointermove', (e) => {
    moveCursor(e);
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const d = pinchSpan();
      if (pinchDist > 0) { const mid = pinchMid(); zoomAt(mid.x, mid.y, d / pinchDist); }
      pinchDist = d; vx = vy = 0;
      return;
    }
    if (!down) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    txT += dx; tyT += dy; vx = dx; vy = dy; moved += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
  });
  function liftPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 1) { const p = pts()[0]; down = true; lastX = p.x; lastY = p.y; vx = vy = 0; }
    else if (pointers.size === 0) { down = false; wrap.classList.remove('grabbing'); }
  }
  wrap.addEventListener('pointerup', liftPointer);
  wrap.addEventListener('pointercancel', liftPointer);
  field.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  /* touch: auto-start the wander so the work reveals itself (unless the user grabs first) */
  if (matchMedia('(pointer: coarse)').matches && !reduced.matches) {
    setTimeout(() => { if (!userActed && !walk && !down && pointers.size === 0) setWalk(true); }, 1200);
  }

  /* trackpad / wheel: scroll = pan; pinch / ctrl+wheel = zoom */
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
    else if (k === 'reset') homeView();
    else if (k === 'shuffle') { seedOff += 1; clearField(); homeView(); }   // Re-lay → re-scatter the plane
  }));
  window.addEventListener('resize', homeView);

  /* keyboard pan / zoom (a11y) */
  wrap.tabIndex = 0;
  wrap.addEventListener('keydown', (e) => {
    const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2, STEP = 140;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'].includes(e.key)) stopWalk();
    if (e.key === 'ArrowLeft') { txT += STEP; vx = 0; }
    else if (e.key === 'ArrowRight') { txT -= STEP; vx = 0; }
    else if (e.key === 'ArrowUp') { tyT += STEP; vy = 0; }
    else if (e.key === 'ArrowDown') { tyT -= STEP; vy = 0; }
    else if (e.key === '+' || e.key === '=') zoomAt(cx, cy, 1.3);
    else if (e.key === '-') zoomAt(cx, cy, 1 / 1.3);
    else if (e.key.toLowerCase() === 'r') homeView();
    else return;
    e.preventDefault();
  });

  /* cursor balloon — "Open" beside the pointer over a work */
  const cur = wrap.querySelector('.field-cursor');
  function moveCursor(e) { if (cur) cur.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 10}px)`; }
  if (cur) {
    field.addEventListener('pointerover', (e) => { if (e.target.closest('.field-img')) cur.textContent = 'Open'; });
    field.addEventListener('pointerout', (e) => {
      if (e.target.closest('.field-img') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.field-img'))) cur.textContent = '';
    });
  }
}

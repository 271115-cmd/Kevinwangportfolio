/* ============================================================
   lightbox.js — a quiet full-screen drawing viewer. Click any
   image marked data-zoom (project hero + plates) to read it
   closely: drag to pan, wheel / pinch / double-click to zoom,
   ←/→ to step through the set, Esc / click-away to close.
   Light (paper) overlay to match the site — not a black box.
   ============================================================ */

export function initLightbox() {
  let set = [], idx = 0;                 // current gallery + position
  let s = 1, tx = 0, ty = 0;             // view: scale + translate
  let down = false, lastX = 0, lastY = 0, moved = 0, lastFocus = null;
  const pointers = new Map();
  let pinchDist = 0;

  const ov = document.createElement('div');
  ov.id = 'lightbox';
  ov.hidden = true;
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Drawing viewer');
  ov.innerHTML =
    '<button class="lb-close mono" type="button" aria-label="Close">Close ✕</button>' +
    '<button class="lb-nav lb-prev" type="button" aria-label="Previous">←</button>' +
    '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
    '<button class="lb-nav lb-next" type="button" aria-label="Next">→</button>' +
    '<figcaption class="lb-cap mono"></figcaption>';
  document.body.appendChild(ov);

  const img = ov.querySelector('.lb-img');
  const cap = ov.querySelector('.lb-cap');
  const stage = ov.querySelector('.lb-stage');
  const MAX = 6, MIN = 1;

  const apply = () => { img.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(3)})`; ov.classList.toggle('is-zoomed', s > 1.01); };
  function reset() { s = 1; tx = 0; ty = 0; apply(); }
  function load(i) {
    idx = (i + set.length) % set.length;
    const it = set[idx];
    img.src = it.src; img.alt = it.cap || '';
    cap.textContent = it.cap || '';
    cap.style.display = it.cap ? '' : 'none';
    ov.querySelectorAll('.lb-nav').forEach((b) => { b.hidden = set.length < 2; });
    reset();
  }
  function zoomAt(cx, cy, f) {
    const ns = Math.max(MIN, Math.min(MAX, s * f));
    const r = ns / s;
    const rect = stage.getBoundingClientRect();
    const ox = cx - rect.left - rect.width / 2, oy = cy - rect.top - rect.height / 2;
    tx = ox - (ox - tx) * r; ty = oy - (oy - ty) * r; s = ns;
    if (s <= MIN + 0.001) { tx = 0; ty = 0; }
    apply();
  }

  function open(list, i) {
    set = list; lastFocus = document.activeElement;
    ov.hidden = false; document.body.classList.add('lb-open');
    load(i);
    ov.querySelector('.lb-close').focus();
  }
  function close() {
    ov.hidden = true; document.body.classList.remove('lb-open');
    img.src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // open from any data-zoom image; the set = all data-zoom imgs in its render mount
  document.addEventListener('click', (e) => {
    const t = e.target.closest('img[data-zoom]');
    if (!t) return;
    e.preventDefault();
    const scope = t.closest('[data-render], main') || document;
    const imgs = [...scope.querySelectorAll('img[data-zoom]')];
    const list = imgs.map((im) => ({ src: im.currentSrc || im.src, cap: im.dataset.cap || '' }));
    open(list, imgs.indexOf(t));
  });

  ov.querySelector('.lb-close').addEventListener('click', close);
  ov.querySelector('.lb-prev').addEventListener('click', () => load(idx - 1));
  ov.querySelector('.lb-next').addEventListener('click', () => load(idx + 1));
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target === stage) close(); });   // click the backdrop
  img.addEventListener('dblclick', (e) => zoomAt(e.clientX, e.clientY, s > 1.01 ? 1 / s : 2.4));

  ov.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

  // drag to pan (only meaningful when zoomed); pinch to zoom
  stage.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const a = [...pointers.values()]; pinchDist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); down = false; return; }
    down = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const a = [...pointers.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if (pinchDist > 0) zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / pinchDist);
      pinchDist = d; return;
    }
    if (!down || s <= MIN + 0.001) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY; moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY; apply();
  });
  const lift = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0; if (pointers.size === 0) down = false; };
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);

  document.addEventListener('keydown', (e) => {
    if (ov.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') load(idx - 1);
    else if (e.key === 'ArrowRight') load(idx + 1);
    else if (e.key === '+' || e.key === '=') zoomAt(innerWidth / 2, innerHeight / 2, 1.3);
    else if (e.key === '-') zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.3);
    else return;
    e.preventDefault();
  });
}

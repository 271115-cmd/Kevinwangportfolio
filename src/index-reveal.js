/* ============================================================
   index-reveal.js — the quiet index's deferred image reveal.
   Hovering/focusing a discipline row (home) or project row (list
   pages) lifts its title from shadow into light and wipes that
   work's cover into the shared fixed plate, like light filling a
   wall. Lazy-loaded only where a [data-cover] index exists.
   Pure progressive enhancement: with no JS the rows still navigate
   and (per CSS/reduced-motion) render legibly.
   ============================================================ */

export function initIndexReveal() {
  const plate = document.getElementById('index-plate');
  const rows = document.querySelectorAll('.index-row[data-cover], .proj-row[data-cover]');
  if (!plate || !rows.length) return;
  const img = plate.querySelector('img');
  if (!img) return;

  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (coarse) return;   // touch: no fixed plate; rows just navigate (see CSS)

  let active = null;

  const show = (row) => {
    active = row;
    const src = row.getAttribute('data-cover');
    if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
    row.classList.add('is-lit');
    plate.classList.add('is-on');
  };
  const hide = (row) => {
    row.classList.remove('is-lit');
    if (active === row) { active = null; plate.classList.remove('is-on'); }
  };

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => show(row));
    row.addEventListener('mouseleave', () => hide(row));
    row.addEventListener('focus', () => show(row));
    row.addEventListener('blur', () => hide(row));
  });
}

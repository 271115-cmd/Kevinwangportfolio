/* ============================================================
   transition.js — hard-panel page wipe.
   A solid ink panel that prints the destination label:
     • REVEAL  — on arrival, the covering panel slides up & away.
     • LEAVE   — on an internal link click, a panel rises to cover
                 (label printed), then navigates.
   Click-intercept guards ported from the Duyichu build.
   Needs:  #page-transition > .pt-panel > .pt-label
   ============================================================ */

import gsap from 'gsap';
import { DISCIPLINES } from './data/projects.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function labelForPath(pathname) {
  const file = pathname.split('/').pop() || 'index.html';
  if (file === '' || file === 'index.html') return 'Portfolio';
  const slug = file.replace('.html', '');
  return DISCIPLINES.find((d) => d.slug === slug)?.label || slug;
}

function currentLabel() {
  const page = document.body.dataset.page;
  if (!page || page === 'home') return 'Portfolio';
  return DISCIPLINES.find((d) => d.slug === page)?.label || page;
}

export function initTransition() {
  const ov = document.getElementById('page-transition');
  if (!ov) return;
  const panel = ov.querySelector('.pt-panel');
  const label = ov.querySelector('.pt-label');
  if (reduced) { ov.style.display = 'none'; return; }

  /* ---- REVEAL on arrival (panel starts covering) ---- */
  let revealed = false;
  const reveal = () => {
    if (revealed || ov.dataset.leaving) return;
    revealed = true;
    if (label) label.textContent = currentLabel();
    gsap.set(panel, { yPercent: 0 });
    gsap.to(panel, {
      yPercent: -100, duration: 0.85, ease: 'expo.inOut', delay: 0.05,
      onComplete: () => { ov.style.display = 'none'; },
    });
  };
  if (document.readyState === 'complete') setTimeout(reveal, 120);
  else window.addEventListener('load', () => setTimeout(reveal, 120));
  setTimeout(reveal, 2400);                                   // safety
  setTimeout(() => { if (!ov.dataset.leaving) ov.style.display = 'none'; }, 4200);

  /* ---- LEAVE on internal link click (panel rises to cover) ---- */
  let leaving = false;
  const go = (href) => { if (leaving !== 'done') { leaving = 'done'; window.location.href = href; } };

  document.addEventListener('click', (e) => {
    if (leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || a.target === '_blank' || a.hasAttribute('data-no-transition')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;

    let url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;  // same page

    e.preventDefault();
    leaving = true;
    ov.dataset.leaving = '1';
    ov.style.display = 'block';
    if (label) label.textContent = a.dataset.label || labelForPath(url.pathname);

    gsap.killTweensOf(panel);
    gsap.fromTo(panel,
      { yPercent: 100 },
      { yPercent: 0, duration: 0.6, ease: 'expo.inOut', onComplete: () => go(a.href) });
    setTimeout(() => go(a.href), 1100);                       // fallback
  });
}

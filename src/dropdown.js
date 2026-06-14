/* ============================================================
   dropdown.js — the full-width index dropdown.
   Open/close · Lenis scroll-lock · focus-trap · Esc/keyboard ·
   GSAP masked big-type stagger · reduced-motion safe.
   ============================================================ */

import gsap from 'gsap';
import { getLenis } from './motion.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let isOpen = false;
let toggle, panel, scrim;
let lastFocus = null;

function focusables() {
  return panel ? [...panel.querySelectorAll('a[href], button:not([disabled])')] : [];
}

function open() {
  if (isOpen || !panel) return;
  isOpen = true;
  lastFocus = document.activeElement;

  panel.hidden = false;
  document.body.classList.add('dd-open');
  toggle?.setAttribute('aria-expanded', 'true');

  // scroll-lock
  const lenis = getLenis();
  if (lenis) lenis.stop();
  document.documentElement.style.overflow = 'hidden';

  const labels = panel.querySelectorAll('.dd-label');
  const meta = panel.querySelectorAll('.dd-index, .dd-count, .dd-foot');

  if (reduced()) {
    gsap.set(panel, { yPercent: 0 });
    gsap.set(scrim, { opacity: 0.35 });
    gsap.set([labels, meta], { clearProps: 'all' });
  } else {
    gsap.killTweensOf([panel, scrim, labels, meta]);
    gsap.set(panel, { yPercent: -100 });
    gsap.set(labels, { yPercent: 110 });
    gsap.set(meta, { opacity: 0 });
    const tl = gsap.timeline();
    tl.to(scrim, { opacity: 0.35, duration: 0.5, ease: 'power2.out' }, 0)
      .to(panel, { yPercent: 0, duration: 0.72, ease: 'expo.out' }, 0)
      .to(labels, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, '-=0.4')
      .to(meta, { opacity: 1, duration: 0.4, stagger: 0.04 }, '<0.1');
  }

  // focus first row
  const first = focusables()[0];
  first?.focus({ preventScroll: true });
}

function close({ restoreFocus = true } = {}) {
  if (!isOpen || !panel) return;
  isOpen = false;
  document.body.classList.remove('dd-open');
  toggle?.setAttribute('aria-expanded', 'false');

  const finish = () => {
    panel.hidden = true;
    const lenis = getLenis();
    if (lenis) lenis.start();
    document.documentElement.style.overflow = '';
    if (restoreFocus && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    else if (restoreFocus) toggle?.focus({ preventScroll: true });
  };

  if (reduced()) {
    gsap.set(scrim, { opacity: 0 });
    finish();
  } else {
    gsap.killTweensOf([panel, scrim]);
    gsap.to(scrim, { opacity: 0, duration: 0.4, ease: 'power2.in' });
    gsap.to(panel, { yPercent: -100, duration: 0.5, ease: 'expo.in', onComplete: finish });
  }
}

function onKeydown(e) {
  if (!isOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return;
  // focus trap
  const items = focusables();
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

export function initDropdown() {
  toggle = document.getElementById('menu-toggle');
  panel = document.getElementById('site-dropdown');
  scrim = document.getElementById('dd-scrim');
  if (!toggle || !panel) return;

  panel.hidden = true;            // closed by default once JS is in control
  gsap.set(scrim, { opacity: 0 });

  toggle.addEventListener('click', () => (isOpen ? close() : open()));
  scrim?.addEventListener('click', () => close());
  document.addEventListener('keydown', onKeydown);

  // clicking a row navigates (the page transition takes over) — close cosmetically
  panel.querySelectorAll('.dd-row').forEach((row) => {
    row.addEventListener('click', () => close({ restoreFocus: false }));
  });
}

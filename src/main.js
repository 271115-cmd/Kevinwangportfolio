/* ============================================================
   main.js — entry point. Orchestrates init order so the chrome
   is injected, the page is hydrated from data, then motion binds
   to the final DOM.
   ============================================================ */

import './style.css';
import { initTransition } from './transition.js';
import { mountChrome } from './chrome.js';
import { hydratePage, resolveActivePage } from './render.js';
import { initLenis, initReveals, playHeroIntro } from './motion.js';

resolveActivePage();  // detail route: derive active discipline from ?slug= first
initTransition();     // reveal cover already up — wire reveal + click-intercept
mountChrome();        // inject header + dropdown + footer; init dropdown
hydratePage();        // render featured/list/gallery from projects.js
initLenis();          // smooth scroll
playHeroIntro();      // char-mask hero (home only)
initReveals();        // scroll reveals (IntersectionObserver + CSS)

// "Read This Building" tool — only loaded on read.html (keeps it off every other page)
if (document.getElementById('read-app')) {
  import('./read.js').then((m) => m.initRead());
}

// Pattern Loom — only on loom.html
if (document.getElementById('loom-app')) {
  import('./loom.js').then((m) => m.initLoom());
}

// The Living Central Axis (WebGL) — only on axis.html
if (document.getElementById('axis-canvas')) {
  import('./axis.js').then((m) => m.initAxis());
}

// The field — home only (walk around the scattered work)
if (document.getElementById('field-wrap')) {
  import('./field.js').then((m) => m.initField());
}

// Drawing viewer — wherever a zoomable image is rendered (project detail pages)
if (document.querySelector('img[data-zoom], [data-render="detail"]')) {
  import('./lightbox.js').then((m) => m.initLightbox());
}

// "Save as PDF" — build + print a clean portfolio document on demand (lazy)
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-print]')) return;
  e.preventDefault();
  import('./print.js').then((m) => m.printPortfolio());
});

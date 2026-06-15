/* ============================================================
   main.js — entry point. Orchestrates init order so the chrome
   is injected, the page is hydrated from data, then motion +
   cursor bind to the final DOM.
   ============================================================ */

import './style.css';
import { initTransition } from './transition.js';
import { mountChrome } from './chrome.js';
import { hydratePage, resolveActivePage } from './render.js';
import { initCursor } from './cursor.js';
import { initLenis, initReveals, playHeroIntro, refreshSoon } from './motion.js';

resolveActivePage();  // detail route: derive active discipline from ?slug= first
initTransition();     // reveal cover already up — wire reveal + click-intercept
mountChrome();        // inject header + dropdown + footer; init dropdown
hydratePage();        // render featured/list/gallery from projects.js
initCursor();         // cursor + magnetic on the now-final DOM
initLenis();          // smooth scroll
playHeroIntro();      // char-mask hero (home only)
initReveals();        // scroll reveals
refreshSoon();        // ScrollTrigger refresh after fonts/layout settle

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

// Quiet index reveal — home index + discipline list pages (deferred plate)
if (document.querySelector('[data-render="index"], [data-render="list"]')) {
  import('./index-reveal.js').then((m) => m.initIndexReveal());
}

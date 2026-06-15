/* ============================================================
   controller.js — the bridge.
   Wires scroll (ScrollTrigger/Lenis) and UI events INTO the
   canonical state, and subscribes the scene + UI to state. No
   subsystem talks to another directly; everything flows through
   state, so camera, narration, highlight and UI never desync.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createAxisState } from './state.js';
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { getLenis } from '../motion.js';

gsap.registerPlugin(ScrollTrigger);

export function initAxis() {
  const canvas = document.getElementById('axis-canvas');
  if (!canvas) return;

  const state = createAxisState();
  const scene = createScene(canvas);
  const ui = createUI({
    onGoto: scrollToIndex,
    onToggleGround: () => state.toggleGround(),
  });
  ui.mount();

  // the ONE wiring: state → every subsystem
  state.subscribe((s) => scene.applyState(s));
  state.subscribe((s) => ui.update(s));

  // scroll → state (the only scroll coupling in the whole system)
  ScrollTrigger.create({
    trigger: '#axis-journey', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => state.setScroll(self.progress),
    onToggle: (self) => document.body.classList.toggle('axis-active', self.isActive),
  });

  // presentation: fade the canvas out as the content sections take over
  ScrollTrigger.create({
    trigger: '.axis-section', start: 'top 75%',
    onEnter: () => { canvas.style.opacity = '0'; },
    onLeaveBack: () => { canvas.style.opacity = '1'; },
  });

  // reveal the (lazily injected) content sections — IntersectionObserver is
  // independent of Lenis/ScrollTrigger, so injected content never stays hidden
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.axis-section .reveal');
  if (reduced) {
    reveals.forEach((e) => e.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((e) => io.observe(e));
  }

  // clicking a component scrolls the page to that monument → ScrollTrigger → state
  function scrollToIndex(index) {
    const jr = document.getElementById('axis-journey');
    if (!jr) return;
    const top = jr.getBoundingClientRect().top + window.scrollY;
    const frac = index / (state.segmentCount - 1);
    const y = top + frac * (jr.offsetHeight - window.innerHeight);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  state.setScroll(0);
  setTimeout(() => ScrollTrigger.refresh(), 250);
}

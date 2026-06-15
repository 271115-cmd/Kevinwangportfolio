/* ============================================================
   motion.js — Lenis smooth scroll + GSAP ScrollTrigger reveals
   + the char-mask hero intro. Mirrors the proven Duyichu wiring.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
export const getLenis = () => lenis;

export function initLenis() {
  if (reduced) return;            // honour reduced-motion: native scroll
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* split a heading's text into per-character spans, preserving inner
   elements (e.g. <em class="accent">) so accent colour is kept. */
function splitChars(root) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach((ch) => {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'hero-char';
          s.textContent = ch;
          frag.appendChild(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(root);
}

export function playHeroIntro() {
  const title = document.querySelector('.hero-title');
  if (!title) return;
  if (reduced) return;            // CSS neutralises the start transform
  splitChars(title);
  const chars = title.querySelectorAll('.hero-char');
  // from-hidden so the resting (post-anim / no-JS) state is VISIBLE — never stuck
  gsap.from(chars, {
    yPercent: 110, duration: 0.8, ease: 'expo.out', stagger: 0.025, delay: 0.1,
    // release the per-char GPU layers once the one-shot intro is done
    onComplete: () => chars.forEach((c) => { c.style.willChange = 'auto'; }),
  });

  // eyebrow + sub follow the title
  const after = document.querySelectorAll('.hero-eyebrow, .hero-sub');
  gsap.from(after, { opacity: 0, y: 16, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
}

export function initReveals() {
  const els = gsap.utils.toArray('.reveal');
  if (!els.length) return;
  if (reduced) { els.forEach((e) => e.classList.add('is-in')); return; }
  ScrollTrigger.batch('.reveal', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: true,
    }),
  });
}

export function refreshSoon() {
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 1600);
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

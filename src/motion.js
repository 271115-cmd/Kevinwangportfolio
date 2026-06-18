/* ============================================================
   motion.js — Lenis smooth scroll + the char-mask hero intro.
   Reveals use IntersectionObserver + CSS (no ScrollTrigger), so the
   heavy ScrollTrigger plugin stays OUT of the universal bundle — only
   the axis page lazy-loads it. GSAP core (hero intro, page transitions,
   dropdown) + Lenis (smooth scroll) remain.
   ============================================================ */

import gsap from 'gsap';
import Lenis from 'lenis';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
export const getLenis = () => lenis;

export function initLenis() {
  if (reduced) return;            // honour reduced-motion: native scroll
  // longer cubic glide — the tactile signature of the promenade
  lenis = new Lenis({ duration: 1.35, smoothWheel: true, easing: (t) => 1 - Math.pow(1 - t, 3) });
  gsap.ticker.add((t) => lenis.raf(t * 1000));   // drive Lenis off gsap core's ticker
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
  if (reduced) return;            // CSS neutralises the start transform

  // the quiet index — a calm per-row fade-up (no char-split; too loud for a serif)
  const rows = document.querySelectorAll('.index-row');
  if (rows.length) {
    gsap.from(rows, { opacity: 0, y: 18, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
    gsap.from('.index-sub', { opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 + rows.length * 0.12 });
    return;
  }

  const title = document.querySelector('.hero-title');
  if (!title) return;
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
  const els = [...document.querySelectorAll('.reveal, .reveal-plate')];
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-in'));
    return;
  }
  // settle each element into light as it scrolls in — CSS handles the transition
  const io = new IntersectionObserver((entries) => {
    entries.filter((en) => en.isIntersecting).forEach((en, i) => {
      io.unobserve(en.target);
      en.target.style.transitionDelay = (i * 70) + 'ms';   // gentle per-batch stagger
      en.target.classList.add('is-in');
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}

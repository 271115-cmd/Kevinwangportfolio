/* ============================================================
   cursor.js — custom cursor + magnetic elements.
   Ported/condensed from the Duyichu build. Call AFTER the page
   is hydrated so injected cards get magnetic binding.
   ============================================================ */

import gsap from 'gsap';

const MAG_RADIUS = 90;
const MAG_STRENGTH = 0.22;   // calmer pull — restraint over spring

export function initCursor() {
  const cursor = document.getElementById('cursor');
  const cursorText = document.getElementById('cursor-text');
  if (!cursor || window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (cursorText) { cursorText.style.left = `${mx}px`; cursorText.style.top = `${my}px`; }
  }, { passive: true });

  // dot eases toward the pointer
  const loop = () => {
    cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
    cursor.style.left = `${cx}px`; cursor.style.top = `${cy}px`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // click pulse
  window.addEventListener('mousedown', () => gsap.to(cursor, { scale: 0.6, duration: 0.12, ease: 'power2.out' }));
  window.addEventListener('mouseup', () => gsap.to(cursor, { scale: 1, duration: 0.3, ease: 'power2.out' }));

  bindInteractive(cursor, cursorText);
}

function labelFor(el) {
  if (el.matches('a[href^="mailto:"]')) return 'Email ↗';
  if (el.matches('a[href^="tel:"]')) return 'Call ↗';
  if (el.matches('[data-no-transition][target="_blank"], a[target="_blank"]')) return 'Open ↗';
  if (el.matches('.dd-row, .proj-row, .jr-row, .feat-card, .gal-item')) return 'Open';
  if (el.matches('a[href]')) return 'View';
  return 'View';
}

function bindInteractive(cursor, cursorText) {
  const targets = document.querySelectorAll('[data-magnetic], a[href], button');

  targets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovering');
      if (cursorText) { cursorText.textContent = labelFor(el); cursorText.classList.add('visible'); }
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovering');
      cursorText?.classList.remove('visible');
      if (el.hasAttribute('data-magnetic')) gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'power3.out' });
    });

    if (el.hasAttribute('data-magnetic')) {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < MAG_RADIUS) {
          const s = MAG_STRENGTH * (1 - dist / MAG_RADIUS);
          gsap.to(el, { x: dx * s, y: dy * s, duration: 0.3, ease: 'power2.out' });
        }
      });
    }
  });
}

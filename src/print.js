/* ============================================================
   print.js — "Save as PDF": builds a clean, linear portfolio
   document from the project data and prints it. The document is
   display:none on screen and only revealed by @media print, so a
   reviewer who hits ⌘P (or the Save-as-PDF link) gets a tidy
   ink-on-white portfolio, not the interactive field.
   Triggered explicitly so images are decoded before printing.
   ============================================================ */

import { PROJECTS, DISCIPLINES, byDiscipline } from './data/projects.js';
import { SITE } from './chrome.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const srcOf = (g) => (typeof g === 'string' ? g : g.src);
const capOf = (g) => (typeof g === 'string' ? '' : (g.caption || ''));

let doc = null;

function projHTML(p, cat) {
  const imgs = [];
  if (p.cover) imgs.push({ src: p.cover, cap: '' });
  (p.gallery || []).forEach((g) => imgs.push({ src: srcOf(g), cap: capOf(g) }));
  const meta = [cat, p.role, p.studio, p.year, p.location].filter((x) => x && x !== '—').map(esc).join(' · ');
  return (
    `<article class="pd-proj">` +
      `<h3 class="pd-title">${esc(p.title)}</h3>` +
      `<p class="pd-meta">${meta}</p>` +
      `<p class="pd-sum">${esc(p.summary)}</p>` +
      (p.body ? `<div class="pd-body">${p.body}</div>` : '') +
      imgs.map((im) =>
        `<figure class="pd-fig"><img src="${esc(im.src)}" alt="${esc(p.title)}" loading="eager">` +
        (im.cap ? `<figcaption>${esc(im.cap)}</figcaption>` : '') + `</figure>`).join('') +
    `</article>`
  );
}

function build() {
  if (doc) return doc;
  doc = document.createElement('section');
  doc.className = 'print-doc';
  doc.setAttribute('aria-hidden', 'true');
  const work = DISCIPLINES.filter((d) => !d.isMeta && byDiscipline(d.slug).length);
  doc.innerHTML =
    `<header class="pd-cover">` +
      `<h1>${esc(SITE.name)}</h1>` +
      `<p class="pd-role">${esc(SITE.role)}</p>` +
      `<p class="pd-tag">${esc(SITE.tagline || SITE.description)}</p>` +
      `<p class="pd-contact">${esc(SITE.email)} · ${esc(location.host)}</p>` +
    `</header>` +
    work.map((d) =>
      `<section class="pd-sec"><h2 class="pd-sec-h">${esc(d.label)}</h2>` +
      byDiscipline(d.slug).map((p) => projHTML(p, d.label)).join('') + `</section>`).join('');
  document.body.appendChild(doc);
  return doc;
}

export async function printPortfolio() {
  const d = build();
  // decode images first so the PDF never prints blank/half-loaded
  await Promise.all([...d.querySelectorAll('img')].map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  window.print();
}

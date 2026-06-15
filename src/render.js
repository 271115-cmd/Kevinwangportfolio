/* ============================================================
   render.js — turns projects.js data into DOM.
   hydratePage() fills any [data-render] mount it finds:
     <div data-render="featured"></div>
     <section data-render="list"    data-slug="architecture"></section>
     <section data-render="gallery" data-slug="models"></section>
     <article data-render="detail"></article>      (project.html?slug=…)
   ============================================================ */

import { PROJECTS, byDiscipline, featured, labelFor, countFor } from './data/projects.js';
import { coverFor, placeholderCover } from './data/placeholder.js';
import { POSTS, postBySlug } from './data/journal.js';

const pad2 = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const slugParam = () => new URLSearchParams(location.search).get('slug');

// internal projects open their detail page; external ones open in a new tab.
const detailHref = (p) => `project.html?slug=${encodeURIComponent(p.id)}`;

function badge(p) {
  return p.external ? '<span class="pr-badge">↗ External</span>' : '';
}

/* ---- HOME: featured grid ---- */
function renderFeatured(mount) {
  const items = featured();
  mount.classList.add('feat-grid');
  mount.innerHTML = items.map((p, i) => {
    const cat = labelFor(p.discipline);
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const href = ext ? p.external : (p.app || detailHref(p));
    const tgt = ext ? ' target="_blank" rel="noopener" data-no-transition' : ` data-label="${esc(cat)}"`;
    return (
      `<a class="feat-card reveal" data-magnetic href="${esc(href)}"${tgt}>` +
        `<div class="fc-top"><span class="fc-cat">${esc(cat)}</span><span class="fc-num">F/${pad2(i + 1)}</span></div>` +
        `<img class="fc-cover" src="${cover}" alt="${esc(p.title)} — ${esc(cat)}" loading="lazy">` +
        `<h3 class="fc-title">${esc(p.title)}</h3>` +
        `<p class="fc-summary">${esc(p.summary)}</p>` +
        `<div class="fc-foot"><span>${esc(p.role)}</span><span>${ext ? '↗ External' : esc(p.year)}</span></div>` +
      `</a>`
    );
  }).join('');
}

/* ---- DISCIPLINE: editorial index rows (links to detail) ---- */
function renderList(mount, slug) {
  const items = byDiscipline(slug);
  const cat = labelFor(slug);
  mount.classList.add('proj-list');
  mount.innerHTML = items.map((p, i) => {
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const attrs = ext
      ? `href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition`
      : `href="${esc(p.app || detailHref(p))}" data-label="${esc(cat)}"`;
    return (
      `<a class="proj-row reveal" ${attrs}>` +
        `<span class="pr-index">${pad2(i + 1)}</span>` +
        `<span class="pr-title">${esc(p.title)}</span>` +
        `<span class="pr-summary">${esc(p.summary)}</span>` +
        `<span class="pr-meta">${esc(p.role)} · ${esc(p.year)} ${badge(p)}</span>` +
        `<img class="pr-thumb" src="${cover}" alt="" aria-hidden="true" loading="lazy">` +
      `</a>`
    );
  }).join('');
}

/* ---- DISCIPLINE: image-forward gallery (links to detail) ---- */
function renderGallery(mount, slug) {
  const items = byDiscipline(slug);
  const cat = labelFor(slug);
  mount.classList.add('gallery');
  mount.innerHTML = items.map((p, i) => {
    const wide = i % 3 === 0 ? ' wide' : '';
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const attrs = ext
      ? `href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition`
      : `href="${esc(p.app || detailHref(p))}" data-label="${esc(cat)}"`;
    return (
      `<a class="gal-item${wide} reveal" data-magnetic ${attrs}>` +
        `<img src="${cover}" alt="${esc(p.title)} — ${esc(cat)}" loading="lazy">` +
        `<figcaption class="gi-cap"><span>${pad2(i + 1)} · ${esc(p.title)}</span>` +
          `<span>${ext ? '↗' : esc(p.year)}</span></figcaption>` +
      `</a>`
    );
  }).join('');
}

/* ---- PROJECT DETAIL (case study) ---- */
function renderDetail(mount) {
  const p = PROJECTS.find((x) => x.id === slugParam());
  if (!p) {
    mount.innerHTML = '<p class="detail-missing mono">Project not found — <a href="/">return home ↗</a></p>';
    return;
  }
  document.title = `${p.title} — Kevin Wang`;
  const cat = labelFor(p.discipline);

  // prev / next within the same discipline (wraps)
  const sibs = byDiscipline(p.discipline);
  const i = sibs.findIndex((x) => x.id === p.id);
  const prev = sibs[(i - 1 + sibs.length) % sibs.length];
  const next = sibs[(i + 1) % sibs.length];

  // plates: real gallery if present, else generated placeholders
  const plates = (p.gallery && p.gallery.length)
    ? p.gallery.map((src, n) => ({ src, n }))
    : [0, 1, 2].map((n) => ({ src: placeholderCover({ index: pad2(n + 1), label: cat, seed: `${p.id}-${n}` }), n }));

  const metaRow = (k, v) => (v && v !== '—') ? `<span><span class="dm-k">${k}</span>${esc(v)}</span>` : '';
  const tags = p.tags?.length ? `<span><span class="dm-k">Tags</span>${p.tags.map(esc).join(', ')}</span>` : '';
  const visit = p.external
    ? `<a class="detail-visit" data-magnetic href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition>Visit live site ↗</a>`
    : '';

  const platesHtml = plates.map((pl) =>
    `<figure class="detail-plate reveal">` +
      `<img src="${pl.src}" alt="${esc(p.title)} — plate ${pad2(pl.n + 1)}" loading="lazy">` +
      `<figcaption class="dp-cap">Plate ${pad2(pl.n + 1)}${p.cover || (p.gallery && p.gallery.length) ? '' : ' · placeholder'}</figcaption>` +
    `</figure>`
  ).join('');

  const navLink = (q, dir) =>
    `<a href="${esc(detailHref(q))}" data-label="${esc(cat)}"><span class="dn-dir">${dir}</span><span class="dn-title">${esc(q.title)}</span></a>`;

  mount.innerHTML =
    `<a class="detail-back" href="/${esc(p.discipline)}.html" data-label="${esc(cat)}">← ${esc(cat)} index</a>` +
    `<header class="detail-head">` +
      `<div class="detail-eyebrow mono">${esc(cat)} <span class="accent">/</span> ${esc(p.year)}</div>` +
      `<h1 class="detail-title">${esc(p.title)}</h1>` +
      `<div class="detail-meta">${metaRow('Role', p.role)}${metaRow('Year', p.year)}${metaRow('Where', p.location)}${tags}</div>` +
      `<p class="detail-summary">${esc(p.summary)}</p>` +
      visit +
    `</header>` +
    `<div class="detail-gallery">${platesHtml}</div>` +
    (sibs.length > 1
      ? `<nav class="detail-nav" aria-label="More ${esc(cat)}">${navLink(prev, '← Prev')}${navLink(next, 'Next →')}</nav>`
      : '');
}

/* ---- JOURNAL: list of field notes ---- */
const fmtDate = (d) => String(d).replace(/-/g, '.');

function renderJournal(mount) {
  mount.classList.add('jr-list');
  mount.innerHTML = POSTS.map((p) =>
    `<a class="jr-row reveal" href="post.html?slug=${esc(p.slug)}" data-label="Journal">` +
      `<span class="jr-date">${esc(fmtDate(p.date))}</span>` +
      `<span class="jr-mid"><span class="jr-title">${esc(p.title)}</span><span class="jr-excerpt">${esc(p.excerpt)}</span></span>` +
      `<span class="jr-tags">${(p.tags || []).map(esc).join(' · ')}</span>` +
    `</a>`
  ).join('');
}

/* ---- JOURNAL: a single post (post.html?slug=) ---- */
function renderPost(mount) {
  const p = postBySlug(slugParam());
  if (!p) {
    mount.innerHTML = '<p class="post-missing mono">Post not found — <a href="/journal.html">all field notes →</a></p>';
    return;
  }
  document.title = `${p.title} — Kevin Wang`;
  mount.innerHTML =
    `<a class="post-back" href="/journal.html" data-label="Journal">← Field notes</a>` +
    `<header class="post-head">` +
      `<div class="post-meta">${esc(fmtDate(p.date))} <span class="accent">/</span> ${(p.tags || []).map(esc).join(' · ')}</div>` +
      `<h1 class="post-title">${esc(p.title)}</h1>` +
    `</header>` +
    `<div class="post-body">${p.body}</div>`;  // body is trusted HTML authored in journal.js
}

/* set the active page (for dropdown highlight + transition label) on routes
   where it isn't known until we read ?slug=. Call BEFORE mountChrome(). */
export function resolveActivePage() {
  if (document.querySelector('[data-render="detail"]')) {
    const p = PROJECTS.find((x) => x.id === slugParam());
    document.body.dataset.page = p ? p.discipline : '';
  } else if (document.querySelector('[data-render="post"]')) {
    document.body.dataset.page = 'journal';
  }
}

export function hydratePage() {
  document.querySelectorAll('[data-render]').forEach((mount) => {
    const kind = mount.getAttribute('data-render');
    const slug = mount.getAttribute('data-slug');
    if (kind === 'featured') renderFeatured(mount);
    else if (kind === 'list') renderList(mount, slug);
    else if (kind === 'gallery') renderGallery(mount, slug);
    else if (kind === 'detail') renderDetail(mount);
    else if (kind === 'journal') renderJournal(mount);
    else if (kind === 'post') renderPost(mount);
  });
  // keep header counts in sync with the data
  document.querySelectorAll('[data-count-for]').forEach((el) => {
    el.textContent = pad2(countFor(el.getAttribute('data-count-for')));
  });
}

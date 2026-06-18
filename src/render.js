/* ============================================================
   render.js — turns projects.js data into DOM.
   hydratePage() fills any [data-render] mount it finds:
     <div data-render="featured"></div>
     <section data-render="list"    data-slug="architecture"></section>
     <section data-render="gallery" data-slug="models"></section>
     <article data-render="detail"></article>      (project.html?slug=…)
   ============================================================ */

import { PROJECTS, DISCIPLINES, byDiscipline, featured, labelFor, countFor } from './data/projects.js';
import { coverFor, placeholderCover } from './data/placeholder.js';
import { POSTS, postBySlug } from './data/journal.js';
import { IMAGE_DIMS } from './data/imagedims.js';
import { setMeta } from './chrome.js';

// intrinsic width/height attrs so the browser reserves aspect-ratio space (no CLS)
const dimAttr = (src) => { const d = IMAGE_DIMS[src]; return d ? ` width="${d[0]}" height="${d[1]}"` : ''; };

/* Per-item share metadata — runs after the generic shell so a deep link to one
   project/post previews the actual item (title + summary) instead of "Project — Kevin Wang".
   og:image stays the brand PNG (reliable across scrapers); per-item images are a follow-up. */
function applyShareMeta({ title, description }) {
  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
}

// CreativeWork structured data for a project (Google renders JS, so this is picked up)
function injectProjectSchema(p, cat) {
  if (document.getElementById('ld-work')) return;
  const origin = location.origin;
  const graph = {
    '@context': 'https://schema.org', '@type': 'CreativeWork',
    name: p.title, creator: { '@type': 'Person', '@id': origin + '/#person', name: 'Kevin Wang' },
    genre: cat, dateCreated: String(p.year || ''), abstract: p.summary,
    ...(p.cover ? { image: origin + p.cover } : {}),
    ...(p.tags?.length ? { keywords: p.tags.join(', ') } : {}),
    url: origin + location.pathname + location.search,
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json'; s.id = 'ld-work'; s.textContent = JSON.stringify(graph);
  document.head.appendChild(s);
}

const pad2 = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const slugParam = () => new URLSearchParams(location.search).get('slug');

// internal projects open their detail page; external ones open in a new tab.
const detailHref = (p) => `project.html?slug=${encodeURIComponent(p.id)}`;

function badge(p) {
  return p.external ? '<span class="pr-badge">↗ External</span>' : '';
}

/* count-aware 12-col span rhythm so a grid always fills its rows and never
   floats a lone cell against empty columns (Objects has 1 item, Models 2).
   Returns one span (4/6/8/12) per item; shared by galleries + detail plates. */
function spanRhythm(n) {
  const PRESET = { 0: [], 1: [12], 2: [6, 6], 3: [12, 6, 6], 4: [8, 4, 4, 8], 5: [8, 4, 4, 8, 12], 6: [6, 6, 8, 4, 4, 8] };
  if (PRESET[n]) return PRESET[n];
  const out = [];
  for (let i = 0; i < n; i++) { const flip = Math.floor(i / 2) % 2; out.push(i % 2 === 0 ? (flip ? 4 : 8) : (flip ? 8 : 4)); }
  if (n % 2 === 1) out[n - 1] = 12;   // a lone trailing cell becomes a full-bleed moment
  return out;
}

/* ---- HOME: the quiet index — the five work disciplines, revealed on
   hover/focus via the shared fixed plate. Same gesture as the dropdown. ---- */
function renderIndex(mount) {
  const work = DISCIPLINES.filter((d) => !d.isMeta);
  mount.classList.add('index');
  mount.innerHTML = work.map((d, i) => {
    const items = byDiscipline(d.slug);
    const lead = items.find((p) => p.featured) || items[0];
    const cover = lead ? coverFor(lead, pad2(i + 1), d.label) : '';
    const n = items.length;
    return (
      `<a class="index-row" href="${esc(d.page)}" data-slug="${esc(d.slug)}" data-label="${esc(d.label)}" data-cover="${esc(cover)}">` +
        `<span class="ix-num">${esc(d.index)}</span>` +
        `<span class="ix-name">${esc(d.label)}</span>` +
        `<span class="ix-count">${n} ${n === 1 ? 'work' : 'works'}</span>` +
      `</a>`
    );
  }).join('');
}

/* ---- HOME: featured grid (legacy; superseded by the index) ---- */
function renderFeatured(mount) {
  const items = featured();
  mount.classList.add('feat-grid');
  mount.innerHTML = items.map((p, i) => {
    const cat = labelFor(p.discipline);
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const href = ext ? p.external : (p.app || detailHref(p));
    const tgt = ext ? ' target="_blank" rel="noopener" data-no-transition' : ` data-label="${esc(cat)}"`;
    const wide = (i + 1) % 3 === 0 ? ' feat-card--wide' : '';   // every 3rd is the full-bleed editorial unit
    return (
      `<a class="feat-card${wide} reveal" data-magnetic href="${esc(href)}"${tgt}>` +
        `<div class="fc-top"><span class="fc-cat">${esc(cat)}</span><span class="fc-num">F/${pad2(i + 1)}</span></div>` +
        `<img class="fc-cover" src="${cover}" alt="${esc(p.title)} — ${esc(cat)}"${dimAttr(cover)} loading="lazy">` +
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
      `<a class="proj-row" data-cover="${esc(cover)}" ${attrs}>` +
        `<span class="pr-index">${pad2(i + 1)}</span>` +
        `<span class="pr-title">${esc(p.title)}</span>` +
        `<span class="pr-summary">${esc(p.summary)}</span>` +
        `<span class="pr-meta">${esc(p.role)} · ${esc(p.year)} ${badge(p)}</span>` +
      `</a>`
    );
  }).join('');
}

/* ---- DISCIPLINE: image-forward gallery (links to detail) ---- */
function renderGallery(mount, slug) {
  const items = byDiscipline(slug);
  const cat = labelFor(slug);
  const spans = spanRhythm(items.length);
  mount.classList.add('gallery');
  mount.innerHTML = items.map((p, i) => {
    const cover = coverFor(p, pad2(i + 1), cat);
    const ext = !!p.external;
    const attrs = ext
      ? `href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition`
      : `href="${esc(p.app || detailHref(p))}" data-label="${esc(cat)}"`;
    return (
      `<a class="gal-item reveal-plate" data-span="${spans[i]}" data-magnetic ${attrs}>` +
        `<img src="${cover}" alt="${esc(p.title)} — ${esc(cat)}"${dimAttr(cover)} loading="lazy">` +
        `<figcaption class="gi-cap">` +
          `<span class="gi-id">${pad2(i + 1)}</span>` +
          `<span class="gi-title">${esc(p.title)}</span>` +
          `<span class="gi-meta">${ext ? '↗ External' : `${esc(p.role)} · ${esc(p.year)}`}</span>` +
        `</figcaption>` +
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
  applyShareMeta({ title: `${p.title} — Kevin Wang`, description: p.summary });
  injectProjectSchema(p, cat);

  // prev / next within the same discipline (wraps)
  const sibs = byDiscipline(p.discipline);
  const i = sibs.findIndex((x) => x.id === p.id);
  const prev = sibs[(i - 1 + sibs.length) % sibs.length];
  const next = sibs[(i + 1) % sibs.length];

  // lead image — real cover or generated brutalist placeholder
  const hero = coverFor(p, '00', cat);

  // plates: real gallery if present, else generated placeholders
  const placeholderPlates = !(p.gallery && p.gallery.length);
  const plates = placeholderPlates
    ? [0, 1, 2].map((n) => ({ src: placeholderCover({ index: pad2(n + 1), label: cat, seed: `${p.id}-${n}` }), n }))
    : p.gallery.map((src, n) => ({ src, n }));
  const plateSpans = spanRhythm(plates.length);

  // spec sheet — one row per known fact; absent/em-dash fields silently drop
  const specRow = (k, v) => (v && v !== '—') ? `<li><span class="ds-k">${k}</span><span class="ds-v">${esc(v)}</span></li>` : '';
  const tagRow = p.tags?.length ? `<li><span class="ds-k">Tags</span><span class="ds-v">${p.tags.map(esc).join(', ')}</span></li>` : '';
  const visit = p.external
    ? `<a class="detail-visit" data-magnetic href="${esc(p.external)}" target="_blank" rel="noopener" data-no-transition>Visit live site ↗</a>`
    : '';

  const platesHtml = plates.map((pl, idx) =>
    `<figure class="detail-plate reveal-plate" data-span="${plateSpans[idx]}">` +
      `<img src="${pl.src}" alt="${esc(p.title)} — plate ${pad2(pl.n + 1)}"${dimAttr(pl.src)} loading="lazy">` +
      `<figcaption class="dp-cap">Plate ${pad2(pl.n + 1)}${placeholderPlates ? ' · placeholder' : ''}</figcaption>` +
    `</figure>`
  ).join('');

  const navLink = (q, dir) =>
    `<a href="${esc(detailHref(q))}" data-label="${esc(cat)}"><span class="dn-dir">${dir}</span><span class="dn-title">${esc(q.title)}</span></a>`;

  mount.innerHTML =
    `<a class="detail-back" href="/${esc(p.discipline)}.html" data-label="${esc(cat)}">← ${esc(cat)} index</a>` +
    `<header class="detail-head">` +
      `<div class="detail-eyebrow mono">${esc(cat)} <span class="accent">/</span> ${esc(p.year)}</div>` +
      `<h1 class="detail-title">${esc(p.title)}</h1>` +
      `<div class="detail-headgrid">` +
        `<div class="detail-lead">` +
          `<p class="detail-summary">${esc(p.summary)}</p>` +
          visit +
        `</div>` +
        `<aside class="detail-spec">` +
          `<h3 class="ds-h mono">Project</h3>` +
          `<ul>${specRow('Role', p.role)}${specRow('Year', p.year)}${specRow('Where', p.location)}${tagRow}</ul>` +
        `</aside>` +
      `</div>` +
    `</header>` +
    `<figure class="detail-hero reveal-plate"><img src="${hero}" alt="${esc(p.title)} — ${esc(cat)}"${dimAttr(hero)} loading="lazy"></figure>` +
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
  applyShareMeta({ title: `${p.title} — Kevin Wang`, description: p.excerpt });
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
    if (kind === 'index') renderIndex(mount);
    else if (kind === 'featured') renderFeatured(mount);
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
  document.querySelectorAll('[data-count-total]').forEach((el) => {
    el.textContent = PROJECTS.length;
  });
}

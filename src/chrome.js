/* ============================================================
   chrome.js — the persistent site chrome (header, dropdown,
   footer) built ONCE and injected on every page. Single source
   of truth: dropdown labels/order/counts come from projects.js.
   ============================================================ */

import { DISCIPLINES, countFor } from './data/projects.js';
import { initDropdown } from './dropdown.js';

/* ------------------------------------------------------------------
   EDIT ME — your identity. Everything below reads from this object.
   ------------------------------------------------------------------ */
export const SITE = {
  name: 'Kevin Wang',            // proper case for SEO/schema; shown uppercase via CSS
  role: 'Architecture',
  tagline: 'Architecture student · Hong Kong',
  description: 'Kevin Wang — a Grade 12 student at Hong Kong International School (HKIS) building an architecture portfolio toward undergraduate study, exploring how culture, cities, and human experience meet in the built environment.',
  email: 'kevinwang6699@outlook.com',
  edition: "Portfolio ’26",
  // Real profiles → footer links + schema.org `sameAs` (helps Google link the search
  // entity to you — the key lever for a common name). Never ship a dead "#" link.
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/kevinwang673' },
    // LinkedIn: paste your full profile URL (the linkedin.com/in/… from your address bar)
    // and I'll add it — e.g. { label: 'LinkedIn', href: 'https://www.linkedin.com/in/…' },
  ],
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function headerHTML() {
  return (
    `<a class="brand" href="/" data-magnetic aria-label="${esc(SITE.name)} — home">` +
      `${esc(SITE.name)}` +
      `<span class="brand-sub">${esc(SITE.edition)}</span>` +
    `</a>` +
    `<button id="menu-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="site-dropdown">` +
      `<span class="mt-label">Index</span><span class="mt-glyph" aria-hidden="true">+</span>` +
    `</button>`
  );
}

function dropdownHTML(activePage) {
  const rows = DISCIPLINES.map((d) => {
    const active = d.slug === activePage ? ' is-active' : '';
    const current = d.slug === activePage ? ' aria-current="page"' : '';
    const count = d.isMeta ? '' : `<span class="dd-count">(${countFor(d.slug)})</span>`;
    return (
      `<a class="dd-row${active}"${current} href="${esc(d.page)}" data-slug="${esc(d.slug)}" data-label="${esc(d.label)}">` +
        `<span class="dd-index">${esc(d.index)}</span>` +
        `<span class="dd-mask"><span class="dd-label">${esc(d.label)}</span></span>` +
        count +
      `</a>`
    );
  }).join('');
  return (
    `<nav class="dd-list" aria-label="Disciplines">${rows}</nav>` +
    `<div class="dd-foot">` +
      `<span>${esc(SITE.tagline)}</span>` +
      `<a href="mailto:${esc(SITE.email)}" data-no-transition>${esc(SITE.email)}</a>` +
      `<a href="#" data-print data-no-transition>Save as PDF ↓</a>` +
    `</div>`
  );
}

function footerHTML() {
  const social = SITE.socials.map((s) =>
    `<a href="${esc(s.href)}"${s.href.startsWith('#') ? ' data-no-transition' : ' target="_blank" rel="noopener" data-no-transition'}>${esc(s.label)}</a>`
  ).join('');
  const year = (document.body.dataset.year || '2026');
  return (
    `<div class="foot-cta">` +
      `<div class="fc-label">Let’s build something —</div>` +
      `<a class="fc-mail" href="mailto:${esc(SITE.email)}" data-magnetic data-no-transition>Get in touch</a>` +
      `<a class="fc-email" href="mailto:${esc(SITE.email)}" data-no-transition>${esc(SITE.email)}</a>` +
    `</div>` +
    `<div class="foot-meta">` +
      `<span>${esc(SITE.name)} · ${esc(SITE.role)}</span>` +
      `<span class="foot-social">${social}</span>` +
      `<a href="#" data-print data-no-transition>Save as PDF ↓</a>` +
      `<span>© ${esc(year)}</span>` +
    `</div>`
  );
}

export function mountChrome() {
  const page = document.body.dataset.page || 'home';

  const header = document.getElementById('site-header');
  const dropdown = document.getElementById('site-dropdown');
  const footer = document.getElementById('site-footer');

  if (header) header.innerHTML = headerHTML();
  if (dropdown) dropdown.innerHTML = dropdownHTML(page);
  if (footer) footer.innerHTML = footerHTML();

  // scrim behind the dropdown (click-to-close target)
  if (!document.getElementById('dd-scrim')) {
    const scrim = document.createElement('div');
    scrim.id = 'dd-scrim';
    document.body.appendChild(scrim);
  }


  // remove the no-JS fallback nav now that the real chrome is mounted
  document.querySelectorAll('.static-nav').forEach((n) => n.remove());

  initDropdown();
  injectSEO();
}

/* ------------------------------------------------------------------
   SEO — canonical + absolute social URLs + schema.org structured data.
   Built from `location` so it auto-adapts to whatever domain the site
   is served from (no hardcoded URL to update when you add a domain).
   ------------------------------------------------------------------ */
export function setMeta(selector, attr, key, val) {
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', val);
}

function injectSEO() {
  const origin = location.origin;
  const url = origin + location.pathname + location.search;

  // canonical
  let canon = document.head.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
  canon.href = url;

  // og:url + make og/twitter images absolute (scrapers prefer absolute URLs)
  setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  document.head.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => {
    const c = m.getAttribute('content');
    if (c && c.startsWith('/')) m.setAttribute('content', origin + c);
  });

  // schema.org Person + WebSite (homepage only)
  if ((document.body.dataset.page || 'home') === 'home' && !document.getElementById('ld-person')) {
    const sameAs = (SITE.socials || []).map((s) => s.href).filter((h) => /^https?:/i.test(h));
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person', '@id': origin + '/#person',
          name: SITE.name, jobTitle: 'Designer',
          description: SITE.description, url: origin + '/', email: 'mailto:' + SITE.email,
          knowsAbout: ['Architecture', 'Architectural Design', 'Graphic Design', 'Web Design', 'Model Making'],
          ...(sameAs.length ? { sameAs } : {}),
        },
        {
          '@type': 'WebSite', '@id': origin + '/#website',
          name: SITE.name + ' — Portfolio', url: origin + '/',
          author: { '@id': origin + '/#person' },
        },
      ],
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'ld-person';
    s.textContent = JSON.stringify(graph);
    document.head.appendChild(s);
  }
}

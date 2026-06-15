/* ============================================================
   ui.js — the UI layer. Fully independent of the WebGL lifecycle:
   it never touches Three.js. It renders the narration, the
   15-component list (with archetype icons + 左祖/右社 pairing),
   the content sections, and the ground toggle. User actions call
   the controller-supplied handlers; update(state) syncs the DOM
   from the single source of truth (points 6 & 8).
   ============================================================ */

import { MONUMENTS, COSMOLOGY, TIMELINE, UNESCO, SOURCES } from '../data/axis.js';
import { iconFor } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const PAIR = { ancestor: '左祖 · Ancestor', deity: '右社 · Deity' };

export function createUI({ onGoto, onToggleGround }) {
  const $ = (id) => document.getElementById(id);
  const els = {};
  let rows = [];
  let lastActive = -1;

  function mount() {
    // narration refs
    ['axis-idx', 'axis-en', 'axis-zh', 'axis-meta', 'axis-blurb', 'axis-narration', 'axis-bar'].forEach((id) => { els[id] = $(id); });

    // cosmology
    const cosmo = $('ax-cosmo');
    if (cosmo) cosmo.innerHTML = COSMOLOGY.map((c) =>
      `<div class="cosmo-card reveal"><div class="cosmo-zh">${esc(c.zh)}</div><div class="cosmo-en mono">${esc(c.en)}</div><p class="cosmo-text">${esc(c.text)}</p></div>`).join('');

    // timeline
    const tl = $('ax-timeline');
    if (tl) tl.innerHTML = TIMELINE.map((t) =>
      `<li class="tl-row reveal"><span class="tl-year">${esc(t.year)}</span><span class="tl-mid"><span class="tl-label">${esc(t.label)}</span><span class="tl-text">${esc(t.text)}</span></span></li>`).join('');

    // unesco facts
    const u = $('ax-unesco');
    if (u) u.innerHTML = [
      ['Property', UNESCO.name], ['Chinese', UNESCO.zh], ['Inscribed', UNESCO.inscribed],
      ['Session', UNESCO.session], ['Criteria', UNESCO.criteria], ['Reference', UNESCO.reference],
      ['Components', String(UNESCO.components)], ['Area', UNESCO.area],
      ['Length', `${UNESCO.lengthKm} km · ${UNESCO.south} → ${UNESCO.north}`],
    ].map(([k, v]) => `<div class="u-row reveal"><span class="u-k mono">${esc(k)}</span><span class="u-v">${esc(v)}</span></div>`).join('');
    const nm = $('ax-unesco-name'); if (nm) nm.textContent = UNESCO.name;

    // 15-component list with icons + pairing — clickable (emits onGoto)
    const comp = $('ax-components');
    if (comp) {
      comp.innerHTML = MONUMENTS.map((m, i) => {
        const pair = m.interpretive.pairing ? `<span class="comp-pair mono">${esc(PAIR[m.interpretive.pairing])}</span>` : '';
        return `<button class="comp-row reveal${m.interpretive.pairing ? ' is-paired' : ''}" type="button" data-index="${i}" data-arch="${esc(m.archetype)}">` +
          `<span class="comp-idx mono">${pad2(i + 1)}</span>` +
          `<span class="comp-ic-wrap">${iconFor(m.archetype)}</span>` +
          `<span class="comp-main"><span class="comp-en">${esc(m.identity.en)}</span><span class="comp-zh">${esc(m.identity.zh)}</span></span>` +
          pair +
          `<span class="comp-yr mono">${esc(m.historical.year)}</span>` +
        `</button>`;
      }).join('');
      rows = [...comp.querySelectorAll('.comp-row')];
      rows.forEach((r) => r.addEventListener('click', () => onGoto(+r.dataset.index)));
    }

    // sources
    const src = $('ax-sources');
    if (src) src.innerHTML = SOURCES.map((s) =>
      `<li><a href="${esc(s.url)}" target="_blank" rel="noopener" data-no-transition>${esc(s.title)}</a></li>`).join('');

    // ground toggle
    els.toggle = $('ground-toggle');
    if (els.toggle) els.toggle.addEventListener('click', () => onToggleGround());
  }

  // derive the whole UI from a state snapshot — never drifts from the scene
  function update(s) {
    if (els['axis-narration'] && s.active !== lastActive) {
      const m = MONUMENTS[s.active];
      els['axis-idx'].textContent = `${pad2(s.active + 1)} / ${MONUMENTS.length}`;
      els['axis-en'].textContent = m.identity.en;
      els['axis-zh'].textContent = m.identity.zh;
      els['axis-meta'].textContent = `${m.historical.era} · ${m.historical.year}`;
      els['axis-blurb'].textContent = m.interpretive.role;
      els['axis-narration'].classList.remove('is-swap'); void els['axis-narration'].offsetWidth; els['axis-narration'].classList.add('is-swap');
      rows.forEach((r) => r.classList.toggle('is-active', +r.dataset.index === s.active));
      lastActive = s.active;
    }
    if (els['axis-bar']) els['axis-bar'].style.transform = `scaleY(${s.scroll.toFixed(4)})`;
    if (els.toggle) {
      const on = s.ground === 'satellite';
      els.toggle.setAttribute('aria-pressed', String(on));
      els.toggle.querySelector('.gt-label').textContent = on ? 'Modern city' : 'Massing';
    }
  }

  return { mount, update };
}

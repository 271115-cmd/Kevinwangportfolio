/* ============================================================
   icons.js — archetype-specific SVG glyphs for the component
   list, so the UI encodes structural differences visually
   (point 8). Stroke uses currentColor; pure markup, no logic.
   ============================================================ */

const G = {
  gate:   '<path d="M4 20V10l8-5 8 5v10"/><path d="M9 20v-5a3 3 0 0 1 6 0v5"/>',
  tower:  '<path d="M7 20V8l5-4 5 4v12"/><path d="M9 8h6"/><path d="M12 11v6"/>',
  palace: '<path d="M3 20V12l9-5 9 5v8"/><path d="M6 20v-5M10 20v-5M14 20v-5M18 20v-5"/>',
  temple: '<circle cx="12" cy="14" r="6"/><circle cx="12" cy="14" r="3"/><path d="M12 8V4"/>',
  altar:  '<rect x="4" y="15" width="16" height="4"/><rect x="7" y="11" width="10" height="4"/><rect x="10" y="7" width="4" height="4"/>',
  bridge: '<path d="M3 16c4-7 14-7 18 0"/><path d="M3 16v3M21 16v3"/>',
  hill:   '<path d="M3 20 L9 11 L12 14 L15 7 L21 20 Z"/>',
  square: '<rect x="4" y="16" width="16" height="3"/><path d="M12 16V5"/><path d="M10.5 5h3"/>',
  road:   '<path d="M8 4 L6 20 M16 4 L18 20"/><path d="M12 6v3M12 12v3"/>',
};

export function iconFor(archetype) {
  const inner = G[archetype] || G.altar;
  return `<svg class="comp-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

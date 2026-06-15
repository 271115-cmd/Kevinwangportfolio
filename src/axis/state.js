/* ============================================================
   state.js — THE single source of truth for the axis experience.
   Scroll input and UI events mutate ONLY this store; camera,
   segments, highlight, narration and UI all derive from it, so
   they can never desync (point 1 & 9).
   ============================================================ */

import { MONUMENTS } from '../data/axis.js';

const N = MONUMENTS.length;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createAxisState() {
  const state = {
    scroll: 0,      // raw scroll progress 0..1
    t: 0,           // scroll mapped to 0..(N-1)
    segment: 0,     // current segment index (the lower of the bracketing pair)
    intra: 0,       // progress within the current segment, 0..1
    active: 0,      // nearest monument index → drives highlight + narration
    axisPos: 0,     // interpolated spatial position along the axis (0..1) → drives camera
    ground: 'massing', // 'massing' | 'satellite'
  };

  const subs = new Set();
  const snapshot = () => ({ ...state });
  const notify = () => { const s = snapshot(); subs.forEach((fn) => fn(s)); };

  function setScroll(p) {
    p = clamp01(p);
    state.scroll = p;
    const t = p * (N - 1);
    state.t = t;
    const seg = Math.min(N - 2, Math.max(0, Math.floor(t)));
    state.segment = seg;
    state.intra = t - seg;
    state.active = Math.min(N - 1, Math.max(0, Math.round(t)));
    const a = MONUMENTS[seg].spatial.pos;
    const b = MONUMENTS[seg + 1].spatial.pos;
    state.axisPos = a + (b - a) * state.intra;
    notify();
  }

  function setGround(mode) {
    if (mode !== state.ground) { state.ground = mode; notify(); }
  }
  function toggleGround() { setGround(state.ground === 'massing' ? 'satellite' : 'massing'); }

  return {
    setScroll, setGround, toggleGround,
    subscribe(fn) { subs.add(fn); fn(snapshot()); return () => subs.delete(fn); },
    get: snapshot,
    segmentCount: N,
  };
}

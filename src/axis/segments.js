/* ============================================================
   segments.js — lazy, windowed loading of monument geometry.
   Only monuments near the active segment exist in the scene;
   distant ones are removed (cached) and, beyond a cache budget,
   disposed. Focus handover runs through the material BLOOM
   transitioner (kit.js) — never a geometry rebuild.

   FINALE mode (the closing pull-back): every monument is built
   (pre-warmed in the approach, throttled here), added to the
   scene, and lit south→north in a scroll-scrubbed cascade — fully
   reversible. Leaving the finale hands back to the window logic.
   ============================================================ */

import { MONUMENTS } from '../data/axis.js';
import { buildMonument, disposeMonument } from './archetypes.js';
import { setFocus, createFocusTransitioner } from './kit.js';
import { FINALE } from './config.js';

const N = MONUMENTS.length;

export function createSegments(scene, M, { windowRadius = 2, cacheLimit = 20 } = {}) {
  const built = new Map();    // index → group (cached; may be detached from scene)
  const inScene = new Set();
  let activeIdx = -1;
  let finaleActive = false;
  let prewarmPending = false;
  const fx = createFocusTransitioner(M);

  const build = (i) => {
    if (built.has(i)) return built.get(i);
    const g = buildMonument(MONUMENTS[i], M);
    built.set(i, g);
    return g;
  };
  const addToScene = (i) => { if (!inScene.has(i)) { scene.add(build(i)); inScene.add(i); } };
  const removeFromScene = (i) => { if (inScene.has(i)) { scene.remove(built.get(i)); inScene.delete(i); } };
  const disposeIndex = (i) => {
    const g = built.get(i);
    if (!g) return;
    removeFromScene(i);
    disposeMonument(g);
    built.delete(i);
  };

  function ensureWindow(center) {
    const lo = Math.max(0, center - windowRadius);
    const hi = Math.min(N - 1, center + windowRadius);
    for (let i = lo; i <= hi; i++) addToScene(i);
    for (const i of [...inScene]) if (i < lo || i > hi) removeFromScene(i);
    // free memory beyond the cache budget, dropping the farthest detached groups first
    if (built.size > cacheLimit) {
      const far = [...built.keys()].filter((i) => !inScene.has(i))
        .sort((a, b) => Math.abs(b - center) - Math.abs(a - center));
      while (built.size > cacheLimit && far.length) disposeIndex(far.shift());
    }
  }

  function setActive(i, now) {
    if (i === activeIdx) return;
    const prev = built.get(activeIdx);
    activeIdx = i;
    fx.focus(prev, built.get(i), now);   // the bloom handover
  }

  /* build a not-yet-built monument during idle on the finale approach, so the
     rAF finale builder has less to catch up on (re-arms itself until all warm) */
  function prewarm() {
    if (prewarmPending || built.size >= N) return;
    let idx = -1;
    for (let i = 0; i < N; i++) if (!built.has(i)) { idx = i; break; }
    if (idx < 0) return;
    prewarmPending = true;
    const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : (f) => setTimeout(f, 30);
    idle(() => { prewarmPending = false; build(idx); prewarm(); });
  }

  /* ONE per-frame driver (called from the rAF loop, not scroll events).
     raw = scroll-accurate finale target (drives the light cascade);
     cur = smoothed finale (drives camera + when to tear down the vista). */
  function sync(raw, cur, active, scroll, now = performance.now()) {
    const inFinale = raw > 0 || cur > 0.001;    // stay populated until the camera has returned
    if (inFinale) {
      finaleActive = true;
      let budget = 3;                            // spread the 15-monument build across frames
      for (let i = 0; i < N; i++) {
        if (!built.has(i)) { if (budget <= 0) continue; budget--; }
        addToScene(i);
      }
      const lit = Math.floor(Math.min(1, raw / FINALE.litBy) * N + 1e-4);   // south→north cascade
      for (const i of inScene) {
        const g = built.get(i);
        const on = i < lit || i === active;
        if (g.userData.lit !== on) { setFocus(g, on, M); g.userData.lit = on; }
      }
    } else {
      if (finaleActive) {                        // just settled back into the walk
        finaleActive = false;
        for (const i of inScene) {
          const g = built.get(i); const on = i === active;
          setFocus(g, on, M); g.userData.lit = on;
        }
        activeIdx = active;                       // avoid a stray out-bloom on the old index
      }
      ensureWindow(active);                       // prune the force-added vista back to ±windowRadius
      setActive(active, now);
      if (scroll > 0.72) prewarm();
    }
    fx.tick(now);
  }

  return {
    sync,
    get activeIndex() { return activeIdx; },
    get liveCount() { return inScene.size; },
    get cacheCount() { return built.size; },
  };
}

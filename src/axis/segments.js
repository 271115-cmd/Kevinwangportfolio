/* ============================================================
   segments.js — lazy, windowed loading of monument geometry.
   Only monuments near the active segment exist in the scene;
   distant ones are removed (cached) and, beyond a cache limit,
   disposed. Highlight is a material swap to the shared accent
   material — never a geometry rebuild (points 5, 9, 10).
   ============================================================ */

import { MONUMENTS } from '../data/axis.js';
import { buildMonument, disposeMonument } from './archetypes.js';

export function createSegments(scene, M, { windowRadius = 2, cacheLimit = 7 } = {}) {
  const built = new Map();    // index → group (cached; may be detached from scene)
  const inScene = new Set();
  let activeIdx = -1;

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
    const hi = Math.min(MONUMENTS.length - 1, center + windowRadius);
    for (let i = lo; i <= hi; i++) addToScene(i);
    for (const i of [...inScene]) if (i < lo || i > hi) removeFromScene(i);
    // free memory beyond the cache budget, dropping the farthest detached groups first
    if (built.size > cacheLimit) {
      const far = [...built.keys()].filter((i) => !inScene.has(i))
        .sort((a, b) => Math.abs(b - center) - Math.abs(a - center));
      while (built.size > cacheLimit && far.length) disposeIndex(far.shift());
    }
  }

  function setActive(i) {
    if (i === activeIdx) return;
    const prev = built.get(activeIdx);
    if (prev) prev.userData.meshes.forEach((me) => { me.material = M.face; });
    activeIdx = i;
    const cur = built.get(i);
    if (cur) cur.userData.meshes.forEach((me) => { me.material = M.faceActive; });
  }

  return {
    ensureWindow,
    setActive,
    get activeIndex() { return activeIdx; },
    get liveCount() { return inScene.size; },
    get cacheCount() { return built.size; },
  };
}

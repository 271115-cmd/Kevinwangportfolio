/* ============================================================
   archetypes.js — procedural architecture.
   Each monument is generated from its archetype into a grouped,
   low-poly white-model construction. Faces use the SHARED face
   material; highlight is done by the scene swapping the group's
   meshes to the shared accent material (see segments.js). No
   interpretation logic here — geometry only (point 4 & 10).
   ============================================================ */

import * as THREE from 'three';
import { zFor, xForSide } from './config.js';

/* add one box/cylinder part + ink edges; collect the face mesh for highlighting */
function addPart(group, meshes, geo, x, y, z, M) {
  const mesh = new THREE.Mesh(geo, M.face);
  mesh.position.set(x, y, z);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), M.edge));
  group.add(mesh);
  meshes.push(mesh);
  return mesh;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rTop, rBot, h) => new THREE.CylinderGeometry(rTop, rBot, h, 12);

/* stack decreasing layers from the ground up (towers, altars, hills) */
function stack(group, meshes, layers, M) {
  let base = 0;
  for (const L of layers) {
    const geo = L.r != null ? cyl(L.rTop ?? L.r, L.r, L.h) : box(L.w, L.h, L.d);
    addPart(group, meshes, geo, L.x || 0, base + L.h / 2, L.z || 0, M);
    base += L.h;
  }
}

/* --- the four required archetypes + supporting forms --- */
const builders = {
  // monumental base + body + layered (double-eave) roof
  gate(s, g, m, M) {
    addPart(g, m, box(5.2 * s, 1.0 * s, 2.4 * s), 0, 0.5 * s, 0, M);          // platform
    addPart(g, m, box(4.0 * s, 1.6 * s, 1.9 * s), 0, 1.8 * s, 0, M);          // body w/ passage mass
    addPart(g, m, box(4.8 * s, 0.5 * s, 2.3 * s), 0, 2.85 * s, 0, M);         // lower eave
    addPart(g, m, box(3.4 * s, 0.7 * s, 1.7 * s), 0, 3.45 * s, 0, M);         // upper roof
  },
  // vertical massing + transition + roof cap; the bell+drum pair = two stacks
  tower(s, g, m, M) {
    const one = (z) => stack(g, m, [
      { w: 2.8 * s, h: 1.4 * s, d: 2.4 * s, z },
      { w: 2.2 * s, h: 2.6 * s, d: 1.9 * s, z },
      { w: 2.7 * s, h: 0.6 * s, d: 2.3 * s, z },   // eave
      { w: 1.9 * s, h: 0.8 * s, d: 1.6 * s, z },   // cap
    ], M);
    one(2.4 * s); one(-2.4 * s);                    // drum (south) + bell (north)
  },
  // wide terrace base + colonnade abstraction + large roof mass
  palace(s, g, m, M) {
    addPart(g, m, box(7.0 * s, 1.0 * s, 6.0 * s), 0, 0.5 * s, 0, M);          // terrace
    const cols = 6, span = 5.6 * s;
    for (let i = 0; i < cols; i++) {                                          // colonnade
      const x = -span / 2 + (span / (cols - 1)) * i;
      addPart(g, m, box(0.35 * s, 2.2 * s, 0.35 * s), x, 1.0 * s + 1.1 * s, 2.4 * s, M);
    }
    addPart(g, m, box(6.2 * s, 1.0 * s, 5.2 * s), 0, 2.6 * s, 0, M);          // hall body
    addPart(g, m, box(7.2 * s, 1.2 * s, 6.0 * s), 0, 3.6 * s, 0, M);          // great roof
  },
  // concentric round ceremonial terraces (Temple of Heaven idiom)
  temple(s, g, m, M) {
    stack(g, m, [
      { r: 3.2 * s, h: 0.6 * s }, { r: 2.4 * s, h: 0.6 * s }, { r: 1.7 * s, h: 0.6 * s },
      { r: 1.5 * s, rTop: 0.2 * s, h: 2.2 * s },   // tapered rotunda
    ], M);
  },
  // square stepped ceremonial terraces (altar idiom)
  altar(s, g, m, M) {
    stack(g, m, [
      { w: 3.8 * s, h: 0.5 * s, d: 3.8 * s }, { w: 2.8 * s, h: 0.5 * s, d: 2.8 * s },
      { w: 1.8 * s, h: 0.5 * s, d: 1.8 * s },
    ], M);
  },
  // low cambered span across the line
  bridge(s, g, m, M) {
    addPart(g, m, box(7.0 * s, 0.5 * s, 1.6 * s), 0, 0.5 * s, 0, M);
    addPart(g, m, box(7.6 * s, 0.4 * s, 0.4 * s), 0, 0.95 * s, 0.9 * s, M);    // rail
    addPart(g, m, box(7.6 * s, 0.4 * s, 0.4 * s), 0, 0.95 * s, -0.9 * s, M);
  },
  // stepped artificial mound
  hill(s, g, m, M) {
    stack(g, m, [
      { w: 6.0 * s, h: 1.0 * s, d: 4.0 * s }, { w: 4.4 * s, h: 1.0 * s, d: 3.0 * s },
      { w: 2.8 * s, h: 1.0 * s, d: 2.0 * s }, { w: 1.4 * s, h: 1.0 * s, d: 1.2 * s },
    ], M);
  },
  // flat civic plinth + a slender monument
  square(s, g, m, M) {
    addPart(g, m, box(5.0 * s, 0.3 * s, 7.0 * s), 0, 0.15 * s, 0, M);
    addPart(g, m, box(0.7 * s, 3.2 * s, 0.7 * s), 0, 1.7 * s, 0, M);          // obelisk
  },
  // excavated paving strip along the line
  road(s, g, m, M) {
    addPart(g, m, box(2.2 * s, 0.18 * s, 9 * s), 0, 0.09 * s, 0, M);
  },
};

/**
 * Build a monument's grouped geometry from its archetype.
 * @returns {THREE.Group} positioned on the axis; userData.meshes are the face meshes.
 */
export function buildMonument(monument, M) {
  const g = new THREE.Group();
  const meshes = [];
  const s = monument.spatial.scale;
  (builders[monument.archetype] || builders.altar)(s, g, meshes, M);
  g.position.set(xForSide(monument.spatial.side, s), 0, zFor(monument.spatial.pos));
  g.userData = { id: monument.id, meshes };
  return g;
}

/** Free a built group's geometry (materials are shared — never disposed here). */
export function disposeMonument(group) {
  group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

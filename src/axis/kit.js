/* ============================================================
   kit.js — a procedural "kit of parts" for Ming/Qing official
   timber architecture (官式建筑), built as crisp low-poly white
   study-models. Every monument on the Central Axis is assembled
   from these shared components, modeled to roughly 1-metre detail:
   tiered marble platforms (须弥座) with balustrades (栏杆), bay
   column grids (间), dougong bracket courses (斗拱), upswept
   curved roofs — hip (庑殿), gable-hip (歇山), pyramidal (攒尖),
   and the circular triple-eave drum (圜攒尖, 祈年殿) — plus ridge
   ornaments (鸱吻), finials (宝顶), arched gate bases (城台) and
   marble arch bridges.

   Units are METRES. A monument builder works at true-ish scale,
   then the caller scales the finished group for the atlas. The
   smallest modeled features (balusters, bracket arms, steps,
   ridge ends) are ~1 m — the detail floor the brief asks for.

   Geometry only — no interpretation logic. Materials are shared
   singletons created once by makeMaterials() and passed in.
   ============================================================ */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ---------- shared materials (created once, reused everywhere) ----------
   PBR study-model set, tuned for the cinematic layer (IBL + ACES + fog).
   envMapIntensity is the "anti-wet" knob — enough that whites read as
   sculpted marble under the sky, not so much they look glossy. The SELECTED
   monument's cinnabar roles carry a faint emissive so it reads as self-lit
   and pops against the lit off-white neighbours. Shape is byte-identical to
   before (on.{stone,timber,roof,detail} / off / edge) so setFocus/finalize
   are untouched. */
export function makeMaterials() {
  const std = (color, roughness, envMapIntensity, emissive, emissiveIntensity) =>
    new THREE.MeshStandardMaterial({
      color, roughness, metalness: 0, envMapIntensity,
      ...(emissive != null ? { emissive, emissiveIntensity } : {}),
    });
  return {
    on: {
      stone:  std(0xC85B4A, 0.52, 0.55, 0x3A0D08, 0.18),  // marble platforms/balustrades
      timber: std(0xB03A2B, 0.74, 0.30, 0x330A06, 0.16),  // walls, columns, bodies
      roof:   std(0x8F2A20, 0.60, 0.42, 0x2A0704, 0.20),  // the great roofs
      detail: std(0xA83830, 0.66, 0.34, 0x300805, 0.22),  // brackets, ornaments
    },
    off: std(0xEFEDE7, 0.68, 0.45),   // neighbours — quiet sculpted off-white
    edge: new THREE.LineBasicMaterial({ color: 0x55110B, transparent: true, opacity: 0.7 }),
  };
}

/* ---------- tiny vector + geometry helpers ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, t) => new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

function pushTri(pos, a, b, c) {
  // skip degenerate (zero-area) triangles so normals never go NaN
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * cx + cy * cy + cz * cz < 1e-9) return;
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}
function pushQuad(pos, a, b, c, d) { pushTri(pos, a, b, c); pushTri(pos, a, c, d); }

/* sample an (cols × rows) parametric grid fn(i,j)->Vector3 into triangles */
function gridSurf(pos, cols, rows, fn, flip = false) {
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = fn(i, j), b = fn(i + 1, j), c = fn(i + 1, j + 1), d = fn(i, j + 1);
      if (flip) pushQuad(pos, a, d, c, b); else pushQuad(pos, a, b, c, d);
    }
  }
}
function geomFrom(pos) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function lineGeom(segs) {
  const p = [];
  for (const [a, b] of segs) p.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return g;
}

/* normalise to a mergeable face geometry: non-indexed, position + normal only */
function faceGeo(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  return g;
}
function matrixOf(x, y, z, opt) {
  const m = new THREE.Matrix4();
  if (opt.rotX || opt.rotY || opt.rotZ) {
    m.makeRotationFromEuler(new THREE.Euler(opt.rotX || 0, opt.rotY || 0, opt.rotZ || 0));
    m.setPosition(x, y, z);
  } else m.makeTranslation(x, y, z);
  return m;
}

/* ============================================================
   Build accumulator — collects geometry per material role and bakes
   curated edge lines, then MERGES each role into a single mesh on
   finalize(). One monument → ~4 face meshes + 1 edge object, not the
   hundreds of balusters/brackets it is composed of, so draw calls
   stay low even with several monuments live (points 5, 9, 10).
   ============================================================ */
export function createBuild(M) {
  const group = new THREE.Group();
  const buckets = { stone: [], timber: [], roof: [], detail: [] };
  const edgeGeos = [];
  const meshes = [];   // filled on finalize: { mesh, role }
  const edges = [];    // filled on finalize: [LineSegments]
  let done = false;

  function addGeo(role, geo, x = 0, y = 0, z = 0, opt = {}) {
    const mtx = matrixOf(x, y, z, opt);
    const g = faceGeo(geo); g.applyMatrix4(mtx);
    (buckets[role] || buckets.detail).push(g);
    if (opt.edges !== false) {
      const eg = opt.edgeGeo ? opt.edgeGeo.clone() : new THREE.EdgesGeometry(geo, opt.edgeAngle ?? 18);
      eg.applyMatrix4(mtx); edgeGeos.push(eg);
    }
    if (geo.dispose && geo !== opt.edgeGeo) geo.dispose();
    return null;
  }
  /* explicit feature lines (ridge / hip / eave) */
  function addLines(segs, x = 0, y = 0, z = 0) {
    const g = lineGeom(segs);
    g.applyMatrix4(matrixOf(x, y, z, {}));
    edgeGeos.push(g);
    return null;
  }
  const box = (role, w, h, d, x, y, z, opt = {}) => addGeo(role, new THREE.BoxGeometry(w, h, d), x, y, z, opt);
  const cyl = (role, rT, rB, h, x, y, z, seg = 16, opt = {}) =>
    addGeo(role, new THREE.CylinderGeometry(rT, rB, h, seg), x, y, z, opt);

  function finalize() {
    if (done) return B; done = true;
    for (const role of Object.keys(buckets)) {
      const list = buckets[role];
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, M.off);
      mesh.userData.role = role;
      mesh.castShadow = true; mesh.receiveShadow = true;   // soft shadows (cinematic layer)
      group.add(mesh);
      meshes.push({ mesh, role });
    }
    if (edgeGeos.length) {
      const mergedE = mergeGeometries(edgeGeos, false);
      edgeGeos.forEach((g) => g.dispose());
      const line = new THREE.LineSegments(mergedE, M.edge);
      line.visible = false;
      group.add(line);
      edges.push(line);
    }
    return B;
  }

  const B = { group, meshes, edges, addGeo, addLines, box, cyl, finalize, M };
  return B;
}

/* ============================================================
   ROOFS
   roofShell builds an upswept curved roof as one surface mesh plus
   curated feature lines. ridgeFrac = 0 collapses the ridge to a
   point → pyramidal (攒尖); > 0 → hip (庑殿). gable-hip (歇山) adds
   a small gable wall + a second upper hip via the gableHip flag.
   All in metres, origin at eave level, centred on the building.
   ============================================================ */
function roofShell({
  w, d, h, ov = 1.4, lift = 1.2, ridgeFrac = 0.42,
  sag = 0.14, cols = 8, rows = 5,
}) {
  const ew = w / 2 + ov, ed = d / 2 + ov;
  const rx = ridgeFrac * (w / 2);
  const R0 = V(-rx, h, 0), R1 = V(rx, h, 0);
  const flare = (t) => Math.pow(Math.abs(t), 2.7);              // 0 centre → 1 at corner (起翘)
  const dip = (v) => -sag * h * Math.sin(Math.PI * v);          // concave sweep (反宇)

  // eave edges (corner-lifted + cambered), param 0..1
  const frontE = (u) => V(-ew + 2 * ew * u, lift * flare(2 * u - 1), ed);
  const backE = (u) => V(-ew + 2 * ew * u, lift * flare(2 * u - 1), -ed);
  const leftE = (v) => V(-ew, lift * flare(2 * v - 1), ed - 2 * ed * v);
  const rightE = (v) => V(ew, lift * flare(2 * v - 1), ed - 2 * ed * v);

  const pos = [];
  // front trapezoid (toward +z): bottom = front eave, top = ridge
  gridSurf(pos, cols, rows, (i, j) => {
    const u = i / cols, v = j / rows;
    const P = lerpV(frontE(u), lerpV(R0, R1, u), v); P.y += dip(v); return P;
  });
  // back trapezoid (toward -z) — mirror winding
  gridSurf(pos, cols, rows, (i, j) => {
    const u = i / cols, v = j / rows;
    const P = lerpV(backE(u), lerpV(R0, R1, u), v); P.y += dip(v); return P;
  }, true);
  // left hip triangle: bottom = left eave, apex = R0
  gridSurf(pos, cols, rows, (i, j) => {
    const u = i / cols, v = j / rows;
    const P = lerpV(leftE(u), R0, v); P.y += dip(v); return P;
  }, true);
  // right hip triangle: bottom = right eave, apex = R1
  gridSurf(pos, cols, rows, (i, j) => {
    const u = i / cols, v = j / rows;
    const P = lerpV(rightE(u), R1, v); P.y += dip(v); return P;
  });

  // feature lines: main ridge, 4 hip ridges, eave loop (sampled to show the camber)
  const segs = [];
  if (rx > 0.01) segs.push([R0, R1]);
  segs.push([frontE(0), R0], [backE(0), R0], [frontE(1), R1], [backE(1), R1]);
  const sampleEave = (fn, n = cols) => {
    for (let i = 0; i < n; i++) segs.push([fn(i / n), fn((i + 1) / n)]);
  };
  sampleEave(frontE); sampleEave(backE); sampleEave(leftE); sampleEave(rightE);

  return { geo: geomFrom(pos), segs };
}

/* vertical triangular gable wall (山花) at each end of a 歇山 ridge, set
   back from the eave (收山), with sloping barge-boards (博风板). */
function gableEnds(B, { rx, breakY, ridgeY, gw, y }) {
  const tri = (sx) => {
    const apex = V(sx * rx, ridgeY, 0);
    const b = V(sx * rx, breakY, gw / 2), c = V(sx * rx, breakY, -gw / 2);
    const pos = [];
    pushTri(pos, apex, b, c); pushTri(pos, apex, c, b);   // double-sided gable panel
    B.addGeo('detail', geomFrom(pos), 0, y, 0, { edges: false });
    B.addLines([[apex, b], [apex, c], [b, c]], 0, y, 0);  // barge-boards + base
  };
  tri(1); tri(-1);
}

/* place a roof on a build at height y. eaves stack with a short inter-eave
   wall band (重檐 / 三滴水). gable=true → 歇山 gable-hip (longer ridge + end
   gable walls); else 庑殿 hip. ridgeFrac=0 → 攒尖 pyramidal point. */
export function roof(B, { w, d, y, eaves = 1, roofH, ov, lift, ridgeFrac, gable = false, gap = 1.1, shrink = 0.8 }) {
  const rf = ridgeFrac ?? (gable ? 0.62 : 0.42);
  let cw = w, cd = d, cy = y;
  for (let e = 0; e < eaves; e++) {
    const top = e === eaves - 1;
    const hgt = roofH * (top ? 1 : 0.45);
    const rfrac = top ? rf : 0;                 // lower eaves are skirts (no exposed ridge)
    const { geo, segs } = roofShell({
      w: cw, d: cd, h: hgt,
      ov: ov ?? Math.max(1.0, cw * 0.13),
      lift: lift ?? Math.max(0.8, cw * 0.05),
      ridgeFrac: rfrac,
    });
    B.addGeo('roof', geo, 0, cy, 0, { edges: false });
    B.addLines(segs, 0, cy, 0);
    if (top && gable && rfrac > 0.01) {
      gableEnds(B, { rx: rfrac * (cw / 2), breakY: hgt * 0.42, ridgeY: hgt, gw: cd * 0.5, y: cy });
    }
    if (!top) {
      cy += hgt - gap * 0.3;
      B.box('timber', cw * shrink * 0.92, gap, cd * shrink * 0.92, 0, cy + gap / 2, 0);  // storey/clerestory band
      cy += gap;
      cw *= shrink; cd *= shrink;
    }
  }
  return { ridgeHalf: rf * (cw / 2), ridgeY: cy + roofH };
}

/* a square pyramidal roof (攒尖) → for pavilions; ridgeFrac 0 + finial */
export function pyramidRoof(B, { w, d, y, roofH, ov, lift, finial = true }) {
  const { geo, segs } = roofShell({
    w, d, h: roofH, ridgeFrac: 0,
    ov: ov ?? w * 0.16, lift: lift ?? w * 0.08, rows: 5, cols: 7,
  });
  B.addGeo('roof', geo, 0, y, 0, { edges: false });
  B.addLines(segs, 0, y, 0);
  if (finial) finialTop(B, { y: y + roofH, r: Math.max(0.4, w * 0.05) });
}

/* ============================================================
   CIRCULAR drum + stacked conical eaves — the Hall of Prayer for
   Good Harvests (祈年殿) idiom: a round timber drum carrying 2–3
   blue-tile cones, crowned by a gold treasure-top.
   ============================================================ */
export function circularHall(B, { rBase, eaves = 3, drumH, roofH, y = 0, finial = true }) {
  let r = rBase, cy = y;
  // round timber drum (with a hint of columns as facets)
  B.cyl('timber', rBase * 0.96, rBase, drumH, 0, cy + drumH / 2, 0, 28);
  cy += drumH;
  for (let e = 0; e < eaves; e++) {
    const top = e === eaves - 1;
    const ov = r * 0.26;
    const h = roofH * (top ? 1 : 0.66);
    // conical eave: a wide flaring skirt (cylinder, small top → wide overhanging base)
    const skirt = new THREE.CylinderGeometry(r * (top ? 0.10 : 0.74), r + ov, h, 28, 1, true);
    B.addGeo('roof', skirt, 0, cy + h / 2, 0, { edges: false });
    // eave ring line
    const ringSegs = [];
    const n = 28, rr = r + ov;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      ringSegs.push([V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr), V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr)]);
    }
    B.addLines(ringSegs, 0, cy, 0);
    if (!top) {
      cy += h * 0.74;
      r *= 0.74;
      B.cyl('timber', r * 0.96, r, drumH * 0.5, 0, cy + drumH * 0.25, 0, 24);
      cy += drumH * 0.5;
    } else {
      cy += h;
    }
  }
  if (finial) finialTop(B, { y: cy, r: rBase * 0.10, tall: true });
}

/* ============================================================
   PLATFORMS — tiered marble terrace (须弥座) with optional carved
   balustrade (栏杆: 望柱 posts + rails) and a south staircase ramp.
   ============================================================ */
export function terrace(B, { w, d, tiers = 1, tierH = 1.6, inset = 1.8, balustrade = false, stair = true, waist = false, apron = 0, spouts = false, y = 0 }) {
  let cw = w, cd = d, cy = y;
  for (let t = 0; t < tiers; t++) {
    if (waist && tierH > 1.2) {
      // 须弥座 profile: base fascia → recessed waist (束腰) → cap fascia
      const baseH = tierH * 0.34, waistH = tierH * 0.32, capH = tierH - baseH - waistH;
      B.box('stone', cw, baseH, cd, 0, cy + baseH / 2, 0);
      B.box('stone', cw - 1.2, waistH, cd - 1.2, 0, cy + baseH + waistH / 2, 0);
      B.box('stone', cw, capH, cd, 0, cy + baseH + waistH + capH / 2, 0);
    } else {
      B.box('stone', cw, tierH, cd, 0, cy + tierH / 2, 0);
    }
    const top = t === tiers - 1;
    if (spouts) spoutRing(B, { w: cw, d: cd, y: cy + tierH * 0.7 });
    if (balustrade) balustradeRing(B, { w: cw - 0.4, d: cd - 0.4, y: cy + tierH, h: Math.min(1.2, tierH * 0.7), gapSouth: top });
    cy += tierH;
    cw -= inset * 2; cd -= inset * 2;
  }
  if (apron > 0) {
    // 月台 forward ceremonial terrace at the top level
    B.box('stone', (cw + inset * 2) * 0.92, tierH, apron, 0, cy - tierH / 2, (cd + inset * 2) / 2 + apron / 2 - 0.5);
    if (balustrade) balustradeRing(B, { w: (cw + inset * 2) * 0.92, d: apron, y: cy, h: 1.0, gapSouth: true });
  }
  if (stair) {
    // central spirit-ramp (御路) flanked by stepped flights, on the south (+z) face
    const totalH = tiers * tierH;
    const run = inset * 2 + 2.5;
    const z0 = (d - (tiers - 1) * inset * 2) / 2 + apron;
    B.addGeo('stone', new THREE.BoxGeometry(w * 0.14, totalH, run), 0, y + totalH / 2, z0 + run / 2 - 0.5);  // ramp
    const steps = Math.max(3, Math.round(totalH / 0.9));
    for (let s = 0; s < steps; s++) {
      const sh = totalH * (1 - s / steps);
      B.box('stone', w * 0.30, sh, run / steps * 1.2, w * 0.24, y + sh / 2, z0 + (run / steps) * s);
      B.box('stone', w * 0.30, sh, run / steps * 1.2, -w * 0.24, y + sh / 2, z0 + (run / steps) * s);
    }
  }
  return { topW: cw + inset * 2, topD: cd + inset * 2, topY: cy };
}

/* a ring of 螭首 dragon-head drain spouts projecting from beneath a tier */
function spoutRing(B, { w, d, y }) {
  const stud = (x, z, ax) => B.box('detail', ax ? 0.9 : 0.4, 0.4, ax ? 0.4 : 0.9, x, y, z);
  const nx = Math.max(3, Math.round(w / 3.2)), nz = Math.max(3, Math.round(d / 3.2));
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + (w / nx) * i; stud(x, d / 2 + 0.3, false); stud(x, -d / 2 - 0.3, false); }
  for (let j = 1; j < nz; j++) { const z = -d / 2 + (d / nz) * j; stud(w / 2 + 0.3, z, true); stud(-w / 2 - 0.3, z, true); }
}

/* a ring of balustrade posts + a top rail around a rectangle */
export function balustradeRing(B, { w, d, y, h = 1.0, postEvery = 2.4, gapSouth = false }) {
  const post = (x, z) => B.box('stone', 0.3, h, 0.3, x, y + h / 2, z);
  const railH = 0.16;
  const rail = (w2, d2, x, z, horiz) =>
    B.box('stone', horiz ? w2 : 0.18, railH, horiz ? 0.18 : d2, x, y + h * 0.7, z);
  const nx = Math.max(2, Math.round(w / postEvery));
  const nz = Math.max(2, Math.round(d / postEvery));
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (w / nx) * i;
    post(x, d / 2); if (!gapSouth) post(x, -d / 2);
  }
  for (let j = 0; j <= nz; j++) {
    const z = -d / 2 + (d / nz) * j;
    post(w / 2, z); post(-w / 2, z);
  }
  rail(w, 0, 0, d / 2, true); if (!gapSouth) rail(w, 0, 0, -d / 2, true);
  rail(0, d, w / 2, 0, false); rail(0, d, -w / 2, 0, false);
}

/* ============================================================
   BODY — a bay column grid (面阔 × 进深) with wall infill, a top
   architrave beam (额枋) and an optional dougong bracket course.
   ============================================================ */
export function bayBody(B, { w, d, h, frontBays = 7, depthBays = 5, y = 0, colonnade = true, dougong = true, wall = true }) {
  const colR = Math.min(w / frontBays, d / depthBays) * 0.12;
  // wall mass (set in from the columns so the colonnade reads in front)
  if (wall) B.box('timber', w * 0.9, h, d * 0.9, 0, y + h / 2, 0);
  // perimeter columns
  if (colonnade) {
    const place = (x, z) => B.cyl('timber', colR, colR * 1.1, h, x, y + h / 2, z, 8);
    for (let i = 0; i <= frontBays; i++) {
      const x = -w / 2 + (w / frontBays) * i;
      place(x, d / 2); place(x, -d / 2);
    }
    for (let j = 1; j < depthBays; j++) {
      const z = -d / 2 + (d / depthBays) * j;
      place(w / 2, z); place(-w / 2, z);
    }
  }
  // architrave beam under the eave
  B.box('timber', w + 0.6, h * 0.12, d + 0.6, 0, y + h - h * 0.06, 0);
  if (dougong) dougongCourse(B, { w: w + 0.6, d: d + 0.6, y: y + h, frontBays, depthBays });
  return { topY: y + h + (dougong ? 1.1 : 0) };
}

/* a course of abstracted dougong bracket-sets along the top of the walls */
export function dougongCourse(B, { w, d, y, frontBays, depthBays }) {
  const bh = 1.0;                          // ~1 m bracket band
  const set = (x, z) => {
    B.box('detail', 1.1, bh * 0.6, 1.1, x, y + bh * 0.3, z);   // 斗 block
    B.box('detail', 1.9, bh * 0.28, 0.5, x, y + bh * 0.75, z); // 拱 arm (transverse)
    B.box('detail', 0.5, bh * 0.28, 1.9, x, y + bh * 0.75, z); // 拱 arm (longitudinal)
  };
  const perFront = Math.max(frontBays, 2) * 2;
  for (let i = 0; i <= perFront; i++) {
    const x = -w / 2 + (w / perFront) * i;
    set(x, d / 2); set(x, -d / 2);
  }
  const perSide = Math.max(depthBays, 2) * 2;
  for (let j = 1; j < perSide; j++) {
    const z = -d / 2 + (d / perSide) * j;
    set(w / 2, z); set(-w / 2, z);
  }
}

/* ridge owl-tail ornaments (鸱吻) seated at the two ends of a main ridge */
export function ridgeOrnaments(B, { ridgeHalf, y, z = 0, s = 1 }) {
  const orn = (x) => {
    B.box('detail', 0.5 * s, 1.8 * s, 1.0 * s, x, y + 0.9 * s, z);              // upright tail body
    B.box('detail', 1.0 * s, 0.5 * s, 1.0 * s, x + (x < 0 ? 0.45 : -0.45) * s, y + 1.7 * s, z); // inward-curling head
  };
  orn(-ridgeHalf); orn(ridgeHalf);
}

/* a treasure-top finial (宝顶) */
export function finialTop(B, { y, r = 0.6, tall = false }) {
  B.cyl('detail', r * 0.6, r, tall ? r * 2.2 : r * 1.2, 0, y + (tall ? r * 1.1 : r * 0.6), 0, 12);
  B.addGeo('detail', new THREE.SphereGeometry(r * 0.8, 12, 10), 0, y + (tall ? r * 2.4 : r * 1.5), 0, { edges: false });
}

/* ============================================================
   GATE BASE — a battered masonry wall-base (城台) pierced by one
   or more arched passages, modeled as one extruded pierced slab so
   the tunnel runs straight through.
   ============================================================ */
export function gateBase(B, { w, h, d, passages = 1, passW, archRise, y = 0, parapet = true }) {
  passW = passW || w * (passages === 1 ? 0.22 : 0.1);
  archRise = archRise || passW * 0.5;
  const straight = h * 0.42;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.lineTo(-w / 2, 0);
  const centers = [];
  if (passages === 1) centers.push(0);
  else for (let i = 0; i < passages; i++) centers.push((-(passages - 1) / 2 + i) * (w / (passages + 0.6)));
  for (const cx of centers) {
    const r = passW / 2;
    const hole = new THREE.Path();
    hole.moveTo(cx - r, 0); hole.lineTo(cx - r, straight);
    hole.absarc(cx, straight, r, Math.PI, 0, true);
    hole.lineTo(cx + r, 0); hole.lineTo(cx - r, 0);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -d / 2);
  B.addGeo('stone', geo, 0, y, 0);
  if (parapet) {
    B.box('stone', w + 0.8, 0.5, d + 0.8, 0, y + h + 0.25, 0);              // capstone
    // 女墙 crenellation hint on the south parapet
    const cn = Math.round(w / 2.4);
    for (let i = 0; i <= cn; i++) B.box('stone', 0.7, 1.0, 0.5, -w / 2 + (w / cn) * i, y + h + 1.0, d / 2 + 0.3);
  }
  return { topY: y + h + (parapet ? 0.5 : 0) };
}

/* ============================================================
   BRIDGES — a cambered marble deck on arches, with post railings.
   count > 1 lays parallel spans across the line (外金水桥 = 7).
   ============================================================ */
export function archBridge(B, { span, width, rise = 1.4, count = 1, gap, deckW, grade = false }) {
  deckW = deckW || (count > 1 ? width / (count * 1.7) : width);
  gap = gap || (count > 1 ? (width - deckW * count) / (count - 1 || 1) : 0);
  const totalW = count > 1 ? width : deckW;
  const startX = -totalW / 2 + deckW / 2;
  const seg = 10;
  const mid = (count - 1) / 2;
  for (let c = 0; c < count; c++) {
    const cx = count > 1 ? startX + c * (deckW + gap) : 0;
    // graded by rank: central bridge widest, stepping down outward (外金水桥)
    const w = grade ? deckW * (1 - 0.42 * (mid ? Math.abs(c - mid) / mid : 0)) : deckW;
    // cambered deck via a row of segments following an arc in z
    const pos = [];
    const yAt = (t) => rise * Math.sin(Math.PI * t);
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg;
      const z0 = -span / 2 + span * t0, z1 = -span / 2 + span * t1;
      const y0 = yAt(t0), y1 = yAt(t1);
      pushQuad(pos,
        V(-w / 2, y0, z0), V(w / 2, y0, z0), V(w / 2, y1, z1), V(-w / 2, y1, z1));
      // underside arch ring
      pushQuad(pos,
        V(-w / 2, y0 - 0.6, z0), V(-w / 2, y1 - 0.6, z1), V(w / 2, y1 - 0.6, z1), V(w / 2, y0 - 0.6, z0));
    }
    B.addGeo('stone', geomFrom(pos), cx, 0, 0, { edges: false });
    // railings (post lines along both sides)
    const railSegs = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, z = -span / 2 + span * t, yy = yAt(t) + 0.7;
      railSegs.push([V(-w / 2, yAt(t), z), V(-w / 2, yy, z)]);
      railSegs.push([V(w / 2, yAt(t), z), V(w / 2, yy, z)]);
    }
    B.addLines(railSegs, cx, 0, 0);
  }
}

/* ============================================================
   SPECIALISED PARTS for individual monuments
   ============================================================ */

/* round, tiered marble terrace (祈年殿) — concentric drums + ring balustrade */
export function roundTerrace(B, { rBase, tiers = 3, tierH = 1.8, inset = 4, balustrade = true, stairs = 8, y = 0 }) {
  let r = rBase, cy = y;
  for (let t = 0; t < tiers; t++) {
    B.cyl('stone', r, r, tierH, 0, cy + tierH / 2, 0, 36);
    if (balustrade) {
      const n = Math.max(16, Math.round(r * 1.6));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        B.box('stone', 0.3, 1.0, 0.3, Math.cos(a) * (r - 0.4), cy + tierH + 0.5, Math.sin(a) * (r - 0.4));
      }
      const ringSegs = [];
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = r - 0.4, yy = cy + tierH + 0.8;
        ringSegs.push([V(Math.cos(a0) * rr, yy, Math.sin(a0) * rr), V(Math.cos(a1) * rr, yy, Math.sin(a1) * rr)]);
      }
      B.addLines(ringSegs);
    }
    cy += tierH; r -= inset;
  }
  // radial stair ramps cutting the terrace (八出陛)
  for (let s = 0; s < stairs; s++) {
    const a = (s / stairs) * Math.PI * 2;
    B.addGeo('stone', new THREE.BoxGeometry(rBase * 0.16, tiers * tierH, inset * tiers + 2),
      Math.cos(a) * (rBase * 0.5), y + (tiers * tierH) / 2, Math.sin(a) * (rBase * 0.5), { rotY: -a });
  }
  return { topR: r + inset, topY: cy };
}

/* a tapered four-sided shaft (the People's Heroes obelisk stele) */
export function taperedShaft(B, { wBot, wTop, d, dTop, h, y = 0 }) {
  const hw0 = wBot / 2, hw1 = wTop / 2, hd0 = d / 2, hd1 = (dTop ?? wTop) / 2;
  const b = [V(-hw0, 0, hd0), V(hw0, 0, hd0), V(hw0, 0, -hd0), V(-hw0, 0, -hd0)];
  const t = [V(-hw1, h, hd1), V(hw1, h, hd1), V(hw1, h, -hd1), V(-hw1, h, -hd1)];
  const pos = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; pushQuad(pos, b[i], b[j], t[j], t[i]); }
  pushQuad(pos, t[0], t[1], t[2], t[3]);
  B.addGeo('stone', geomFrom(pos), 0, y, 0);
  return { topY: y + h, topW: wTop };
}

/* a tall brick block gridded with small recessed arrow-slit windows (箭楼) */
export function arrowSlitBlock(B, { w, h, d, rows = 4, colsFront = 12, y = 0 }) {
  B.box('stone', w, h, d, 0, y + h / 2, 0);
  const slit = (x, yy, z, fw, fd) => B.box('detail', fw, h / rows * 0.4, fd, x, yy, z);
  for (let r = 0; r < rows; r++) {
    const yy = y + h * (0.18 + 0.74 * r / (rows - 1 || 1));
    for (let c = 0; c < colsFront; c++) {
      const x = -w / 2 + (w / (colsFront + 1)) * (c + 1);
      slit(x, yy, d / 2 + 0.05, w / colsFront * 0.4, 0.3);   // south face
    }
    const sideN = Math.max(2, Math.round(d / (w / colsFront)));
    for (let c = 0; c < sideN; c++) {
      const z = -d / 2 + (d / (sideN + 1)) * (c + 1);
      slit(w / 2 + 0.05, yy, z, 0.3, d / sideN * 0.4);
      slit(-w / 2 - 0.05, yy, z, 0.3, d / sideN * 0.4);
    }
  }
  return { topY: y + h };
}

/* a trabeated white-stone gateway (棂星门) — two posts + a lintel, no roof.
   along='x' → spans across x at (z); along='z' → spans across z at (x). */
export function lingxingGate(B, { w = 6, h = 6, x = 0, z = 0, along = 'x' }) {
  if (along === 'x') {
    B.box('stone', 0.7, h, 0.7, x - w / 2, h / 2, z);
    B.box('stone', 0.7, h, 0.7, x + w / 2, h / 2, z);
    B.box('stone', w + 1.2, 0.7, 0.7, x, h - 0.6, z);
    B.box('stone', w + 2.0, 0.4, 0.9, x, h + 0.1, z);
  } else {
    B.box('stone', 0.7, h, 0.7, x, h / 2, z - w / 2);
    B.box('stone', 0.7, h, 0.7, x, h / 2, z + w / 2);
    B.box('stone', 0.7, 0.7, w + 1.2, x, h - 0.6, z);
    B.box('stone', 0.9, 0.4, w + 2.0, x, h + 0.1, z);
  }
}

/* a smooth elongated earth mound (景山) */
export function mound(B, { w, d, h, y = 0 }) {
  const geo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(w / 2, h, d / 2);
  B.addGeo('timber', geo, 0, y, 0, { edges: false });
  // a few contour lines to read the slope
  const segs = [];
  for (let k = 1; k <= 3; k++) {
    const yy = y + h * (k / 4), rr = Math.cos(Math.asin(k / 4));
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      segs.push([V(Math.cos(a0) * rr * w / 2, yy, Math.sin(a0) * rr * d / 2),
      V(Math.cos(a1) * rr * w / 2, yy, Math.sin(a1) * rr * d / 2)]);
    }
  }
  B.addLines(segs);
  return { topY: y + h };
}

/* four reclining 镇水兽 water-taming beasts on flared corner wing-walls (万宁桥) */
export function cornerBeasts(B, { w, d, y = 0 }) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    B.box('detail', 1.4, 0.9, 2.2, sx * (w / 2 - 1), y + 0.45, sz * (d / 2 - 1));
  }
}

/* ============================================================
   focus / ghost — the scene calls this to toggle a whole monument
   between the toned, ink-edged "focused" state and the quiet flat
   "ghost" state used for neighbours.
   ============================================================ */
export function setFocus(group, on, M) {
  const ud = group.userData;
  if (!ud || !ud.meshes) return;
  for (const { mesh, role } of ud.meshes) mesh.material = on ? M.on[role] : M.off;
  for (const e of ud.edges) e.visible = on;
}

/* free a built group's geometry (materials are shared — never disposed) */
export function disposeMonument(group) {
  group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

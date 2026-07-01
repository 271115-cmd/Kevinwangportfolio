/* ============================================================
   archetypes.js — per-monument procedural architecture.
   Each of the fifteen Central Axis monuments is assembled, at
   roughly true metre scale, from the shared kit of parts (kit.js):
   tiered marble platforms (须弥座), bay column grids (间), dougong
   bracket courses (斗拱), and upswept curved roofs — hip (庑殿),
   gable-hip (歇山), pyramidal (攒尖) and the circular triple-eave
   drum (祈年殿). Dimensions follow the research dossier (real bay
   counts, terrace tiers, roof forms, footprints). The finished
   metre-scale group is then scaled to the atlas by MODEL_SCALE.

   Geometry only — no interpretation logic (point 4 & 10).
   ============================================================ */

import * as THREE from 'three';
import { zFor, MODEL_SCALE, FLANK_MARGIN } from './config.js';
import {
  createBuild, disposeMonument,
  terrace, roundTerrace, bayBody, roof, circularHall,
  ridgeOrnaments, finialTop, gateBase, archBridge,
  taperedShaft, arrowSlitBlock, lingxingGate, mound, cornerBeasts,
} from './kit.js';

export { disposeMonument };

/* attach a separately-built sub-structure into B at an offset, merging its
   meshes/edges so focus toggling reaches the whole monument. */
function attach(B, child, x = 0, y = 0, z = 0) {
  child.finalize();                 // merge the sub-structure's geometry first
  child.group.position.set(x, y, z);
  B.group.add(child.group);
  child.meshes.forEach((m) => B.meshes.push(m));
  child.edges.forEach((e) => B.edges.push(e));
}

/* a small crowning pavilion (square pyramidal, n eaves) — Jingshan summits */
function pavilion(B, { w, bodyH, eaves, roofH, finialR }) {
  const t = terrace(B, { w: w * 1.35, d: w * 1.35, tiers: 1, tierH: w * 0.12, inset: 1, stair: false });
  const b = bayBody(B, { w, d: w, h: bodyH, frontBays: 3, depthBays: 3, y: t.topY, dougong: true });
  roof(B, { w: w * 1.2, d: w * 1.2, y: b.topY, eaves, roofH, ridgeFrac: 0 });
  finialTop(B, { y: b.topY + roofH, r: finialR });
}

/* ----------------------------------------------------------------
   the fifteen builders (metres). keyed by monument id.
   ---------------------------------------------------------------- */
const builders = {
  /* southern gate-tower: tall brick platform + single arch, carrying a
     two-storey 5×3 timber pavilion under a 重檐歇山三滴水 (3-eave gable-hip) roof. */
  yongdingmen(B) {
    const base = gateBase(B, { w: 31, h: 8, d: 17, passages: 1, passW: 5, parapet: true });
    const b = bayBody(B, { w: 24, d: 11, h: 6, frontBays: 5, depthBays: 3, y: base.topY });
    roof(B, { w: 28, d: 15, y: b.topY, eaves: 3, roofH: 5, gable: true });
  },

  /* Altar of Agriculture → the Taisui Hall: a wide, low single-eave HIP
     hall (7 bays) on a low stone terrace (no balustrade). */
  xiannongtan(B) {
    const t = terrace(B, { w: 53, d: 28, tiers: 1, tierH: 1.6, inset: 2, balustrade: false, stair: true });
    const b = bayBody(B, { w: 47, d: 23, h: 11, frontBays: 7, depthBays: 3, y: t.topY });
    const r = roof(B, { w: 53, d: 29, y: b.topY, eaves: 1, roofH: 9, gable: false });
    ridgeOrnaments(B, { ridgeHalf: r.ridgeHalf, y: r.ridgeY - 0.4, s: 1.5 });
  },

  /* Temple of Heaven → the circular Hall of Prayer: a round timber drum
     under three stacked blue cones + gilt finial, on a round 3-tier terrace. */
  tiantan(B) {
    // round 3-tier terrace ~90/79/68 m diameter (real); hall ~32 m diameter
    const t = roundTerrace(B, { rBase: 45, tiers: 3, tierH: 1.7, inset: 5.5, balustrade: true, stairs: 8 });
    circularHall(B, { rBase: 16, eaves: 3, drumH: 8, roofH: 11, y: t.topY });
  },

  /* Zhengyangmen ENSEMBLE: the Arrow Tower (hero, south) — a pierced
     arrow-slit fortress block on a high brick platform; and the broader
     Gate Tower (north), a 2-storey double-eave gable-hip pavilion. */
  zhengyangmen(B, M) {
    const arrow = createBuild(M);
    const ab = gateBase(arrow, { w: 34, h: 12, d: 18, passages: 1, passW: 5, parapet: false });
    const asl = arrowSlitBlock(arrow, { w: 30, h: 15, d: 15, rows: 4, colsFront: 13, y: ab.topY });
    roof(arrow, { w: 34, d: 19, y: asl.topY, eaves: 2, roofH: 8, gable: true });
    attach(B, arrow, 0, 0, 0);        // hero (arrow tower) centred on the axis position

    const tower = createBuild(M);
    const tb = gateBase(tower, { w: 44, h: 14, d: 24, passages: 1, passW: 6, parapet: false });
    const body = bayBody(tower, { w: 36, d: 18, h: 11, frontBays: 7, depthBays: 5, y: tb.topY });
    roof(tower, { w: 44, d: 24, y: body.topY, eaves: 2, roofH: 12, gable: true });
    attach(B, tower, 0, 0, -30);      // gate tower ~108 m north (compressed for the atlas)
  },

  /* Southern road remains — a recessed paving corridor, not a building:
     a central granite band flanked by two earthen rut bands, set in a pit. */
  'south-road'(B) {
    B.box('stone', 18, 1.0, 46, 0, -0.5, 0);                 // sunken pit base
    B.box('stone', 4.8, 0.4, 44, 0, 0.2, 0);                 // central granite imperial way
    B.box('timber', 5.6, 0.18, 44, 6.2, 0.09, 0);            // east earthen rut path
    B.box('timber', 5.6, 0.18, 44, -6.2, 0.09, 0);           // west earthen rut path
    for (let k = 0; k < 4; k++) B.box('stone', 18, 0.16, 0.4, 0, -0.2 - k * 0.18, -22 + 0.2);  // strata edge
  },

  /* Tian'anmen Square → the Monument to the People's Heroes: a tall
     tapering granite obelisk with a small gable-hip roof cap, on a double
     Sumeru pedestal and two low balustraded marble terraces. */
  'tiananmen-square'(B) {
    const t = terrace(B, { w: 34, d: 28, tiers: 2, tierH: 1.4, inset: 2.4, balustrade: true, stair: true });
    const p = terrace(B, { w: 16, d: 12, tiers: 2, tierH: 2.2, inset: 1.6, waist: true, balustrade: false, stair: false, y: t.topY });
    const sh = taperedShaft(B, { wBot: 10, wTop: 8, d: 7, dTop: 5.6, h: 27, y: p.topY });
    roof(B, { w: 9, d: 6.5, y: sh.topY, eaves: 1, roofH: 2.8, gable: true });
  },

  /* Tian'anmen: a tall red city-platform pierced by five arches, carrying
     a 9×5 double-eave gable-hip rostrum hall on a balustraded marble terrace. */
  tiananmen(B) {
    const base = gateBase(B, { w: 66, h: 14, d: 34, passages: 5, passW: 4.6, parapet: false });
    const t = terrace(B, { w: 56, d: 26, tiers: 1, tierH: 1.6, inset: 1, balustrade: true, waist: true, stair: false, y: base.topY });
    const b = bayBody(B, { w: 52, d: 22, h: 9, frontBays: 9, depthBays: 5, y: t.topY });
    roof(B, { w: 60, d: 28, y: b.topY, eaves: 2, roofH: 8, gable: true });
  },

  /* Outer Jinshui Bridges — seven white-marble arch bridges fanned across
     the line, the central one widest, stepping down by rank. */
  jinshui(B) {
    archBridge(B, { span: 22, width: 60, rise: 2.6, count: 7, grade: true });
  },

  /* Duanmen — a plainer twin of Tian'anmen: five arches + 9×5 double-eave
     gable-hip tower, no rostrum or bridges. */
  duanmen(B) {
    const base = gateBase(B, { w: 60, h: 14, d: 30, passages: 5, passW: 4.2, parapet: false });
    const t = terrace(B, { w: 50, d: 24, tiers: 1, tierH: 1.5, inset: 1, balustrade: true, waist: true, stair: false, y: base.topY });
    const b = bayBody(B, { w: 46, d: 20, h: 9, frontBays: 9, depthBays: 5, y: t.topY });
    roof(B, { w: 54, d: 26, y: b.topY, eaves: 2, roofH: 7, gable: true });
  },

  /* The Forbidden City → the Hall of Supreme Harmony: an 11×5 double-eave
     HIP hall on the three-tier marble terrace (三台) with a forward apron
     (月台), dragon-spout course and the great ridge finials. The pivot. */
  'forbidden-city'(B) {
    const t = terrace(B, { w: 80, d: 50, tiers: 3, tierH: 2.7, inset: 4, balustrade: true, waist: true, spouts: true, apron: 18, stair: true });
    const b = bayBody(B, { w: 58, d: 30, h: 13, frontBays: 11, depthBays: 5, y: t.topY });
    const r = roof(B, { w: 66, d: 38, y: b.topY, eaves: 2, roofH: 10, gable: false });
    ridgeOrnaments(B, { ridgeHalf: r.ridgeHalf, y: r.ridgeY - 0.5, s: 2.0 });
  },

  /* Imperial Ancestral Temple → the Front Hall (享殿): an 11×6 double-eave
     HIP hall on a three-tier marble terrace — a wide, low rectangular hall,
     NOT a round temple. Restrained northern corner upturn. */
  taimiao(B) {
    const t = terrace(B, { w: 82, d: 44, tiers: 3, tierH: 1.5, inset: 3.5, balustrade: true, waist: true, stair: true });
    const b = bayBody(B, { w: 64, d: 32, h: 15, frontBays: 11, depthBays: 6, y: t.topY });
    const r = roof(B, { w: 72, d: 40, y: b.topY, eaves: 2, roofH: 9, gable: false, lift: 1.0 });
    ridgeOrnaments(B, { ridgeHalf: r.ridgeHalf, y: r.ridgeY - 0.5, s: 1.7 });
  },

  /* Altar of Land & Grain → the square five-color-earth altar: a very low,
     flat three-tier marble dais with four-fold symmetry, a central stone
     marker, a precinct wall and four stone lingxing gates. */
  shejitan(B) {
    const t = terrace(B, { w: 18, d: 18, tiers: 3, tierH: 0.55, inset: 0.9, balustrade: false, stair: false });
    for (const [x, z, ax] of [[0, 10.5, 0], [0, -10.5, 0], [10.5, 0, 1], [-10.5, 0, 1]])
      B.box('stone', ax ? 2.4 : 5, t.topY, ax ? 5 : 2.4, x, t.topY / 2, z);   // four stairs
    B.box('stone', 1.1, 2.0, 1.1, 0, t.topY + 1.0, 0);                         // 社主石 centre marker
    // low precinct wall (waist-high), set well back
    const S = 24;
    for (const [w, d, x, z] of [[S * 2, 1, 0, S], [S * 2, 1, 0, -S], [1, S * 2, S, 0], [1, S * 2, -S, 0]])
      B.box('stone', w, 2.4, d, x, 1.2, z);
    lingxingGate(B, { w: 6, h: 6.5, x: 0, z: S, along: 'x' });
    lingxingGate(B, { w: 6, h: 6.5, x: 0, z: -S, along: 'x' });
    lingxingGate(B, { w: 6, h: 6.5, x: S, z: 0, along: 'z' });
    lingxingGate(B, { w: 6, h: 6.5, x: -S, z: 0, along: 'z' });
  },

  /* Jingshan — an artificial earth mound carrying the five-pavilion crown;
     the central Wanchun Pavilion (square, triple-eave pyramidal) is the
     highpoint of the whole axis. */
  jingshan(B, M) {
    const hm = mound(B, { w: 92, d: 32, h: 24 });
    const yAt = (x) => 24 * Math.sqrt(Math.max(0, 1 - (x / 46) ** 2));
    const place = (x, cfg) => { const p = createBuild(M); pavilion(p, cfg); attach(B, p, x, yAt(x) - 0.6, 0); };
    place(0, { w: 12, bodyH: 6, eaves: 3, roofH: 9, finialR: 0.9 });    // Wanchun (centre, tallest)
    place(24, { w: 9, bodyH: 4.5, eaves: 2, roofH: 6.5, finialR: 0.7 });
    place(-24, { w: 9, bodyH: 4.5, eaves: 2, roofH: 6.5, finialR: 0.7 });
    place(41, { w: 7.5, bodyH: 3.6, eaves: 2, roofH: 5, finialR: 0.6 });
    place(-41, { w: 7.5, bodyH: 3.6, eaves: 2, roofH: 5, finialR: 0.6 });
  },

  /* Wanning Bridge — a single low semicircular marble arch in a long, broad
     causeway, gently humped deck, balustrade, four corner water-beasts. */
  wanning(B) {
    archBridge(B, { span: 16, width: 17, rise: 3, count: 1, deckW: 17 });
    cornerBeasts(B, { w: 17, d: 18, y: 0.3 });
  },

  /* Drum Tower & Bell Tower — the northern terminus. The Drum Tower (hero):
     a heavy brick podium with a vaulted passage carrying a 5×3 timber drum
     hall under a triple-eave gable-hip roof. The Bell Tower, 100 m north: a
     slimmer all-masonry double-eave gable-hip block. */
  'bell-drum'(B, M) {
    const drum = createBuild(M);
    const db = gateBase(drum, { w: 56, h: 16, d: 33, passages: 1, passW: 5.5, parapet: false });
    const dbody = bayBody(drum, { w: 40, d: 22, h: 10, frontBays: 5, depthBays: 3, y: db.topY, colonnade: false, wall: true });
    roof(drum, { w: 50, d: 28, y: dbody.topY, eaves: 3, roofH: 10, gable: true });
    attach(B, drum, 0, 0, 0);         // hero (Drum Tower) centred on the axis terminus

    const bell = createBuild(M);
    const bb = gateBase(bell, { w: 24, h: 30, d: 24, passages: 1, passW: 4, parapet: false });
    roof(bell, { w: 28, d: 28, y: bb.topY, eaves: 2, roofH: 12, gable: true });
    attach(B, bell, 0, 0, -28);       // Bell Tower 100 m north (compressed for the atlas)
  },
};

/* generic fallback by archetype, should the data ever add a new id */
function fallback(B, m) {
  const t = terrace(B, { w: 30, d: 22, tiers: 2, tierH: 1.6, inset: 2.4, balustrade: true });
  const b = bayBody(B, { w: 22, d: 14, h: 9, frontBays: 5, depthBays: 3, y: t.topY });
  roof(B, { w: 26, d: 18, y: b.topY, eaves: 2, roofH: 9, gable: true });
}

/**
 * Build a monument's grouped geometry from its id/archetype, scaled to the
 * atlas and positioned on the axis. Flanking sites are offset laterally by
 * their own footprint so they never collide with the centre line.
 * @returns {THREE.Group} userData = { id, meshes, edges } for focus/ghost.
 */
export function buildMonument(monument, M) {
  const B = createBuild(M);
  (builders[monument.id] || ((b) => fallback(b, monument)))(B, M);
  B.finalize();                      // merge this monument's own (non-sub) geometry

  B.group.scale.setScalar(MODEL_SCALE);
  B.group.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(B.group);
  const halfW = (bbox.max.x - bbox.min.x) / 2;

  const side = monument.spatial.side;
  const xOff = side === 'east' ? halfW + FLANK_MARGIN : side === 'west' ? -(halfW + FLANK_MARGIN) : 0;
  B.group.position.set(xOff, 0, zFor(monument.spatial.pos));
  B.group.userData = { id: monument.id, meshes: B.meshes, edges: B.edges };
  return B.group;
}

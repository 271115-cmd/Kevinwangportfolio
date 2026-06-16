/* ============================================================
   config.js — shared spatial constants + colour tokens for the
   Central Axis scene. Single place for axis geometry math so the
   camera, segments, and archetypes all agree.
   ============================================================ */

export const AXIS_LEN = 240;                 // world length, south → north
export const Z_SOUTH = 14;                   // world z at pos 0 (south)
export const zFor = (pos) => Z_SOUTH - pos * AXIS_LEN;   // pos 0..1 → world z

// lateral offset for flanking (east/west) sites; center sites sit on x=0
export const xForSide = (side, scale = 3) =>
  side === 'east' ? 9 + scale : side === 'west' ? -(9 + scale) : 0;

export const COLORS = {
  paper: 0xFFFFFF,
  paper2: 0xF2F2F1,
  ink: 0x1A1A18,
  accent: 0x6E6A60,   // patina — the single muted tone (axis line + active site)
};

// camera travel limits (world z) — bounded so it can never drift past the line
export const CAM = {
  x: 46, y: 34, back: 44, ahead: 26, lookY: 4,
  zSouthLimit: zFor(-0.04),   // a touch south of Yongdingmen
  zNorthLimit: zFor(1.04),    // a touch north of the Bell Tower
  lerp: 0.08,                 // render smoothing toward the state-derived pose
};

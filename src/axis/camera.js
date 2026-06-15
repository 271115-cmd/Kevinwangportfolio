/* ============================================================
   camera.js — deterministic camera derivation.
   The camera pose is a PURE function of the axis position (from
   state). Bounded to explicit travel limits; the off-axis +
   elevated offsets keep it from intersecting massing (point 2).
   The scene lerps toward this pose for render smoothing only.
   ============================================================ */

import { CAM, zFor } from './config.js';

const clampZ = (z) => Math.min(CAM.zSouthLimit, Math.max(CAM.zNorthLimit, z));

/** axisPos 0..1 → focal world z along the axis, bounded. */
export function focalZ(axisPos) {
  return clampZ(zFor(axisPos));
}

export const camPose = {
  posX: CAM.x, posY: CAM.y, back: CAM.back, ahead: CAM.ahead, lookY: CAM.lookY,
};

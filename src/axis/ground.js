/* ============================================================
   ground.js — the ground plane, with two cross-fading modes:
   'massing' (faint construction grid) and 'satellite' (a
   procedural modern-city plan). Toggling only fades opacities —
   it never recreates geometry and never touches the camera or
   scroll (point 7).
   ============================================================ */

import * as THREE from 'three';
import { COLORS, zFor, AXIS_LEN, CINE } from './config.js';

function makeCityTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f2ed'; x.fillRect(0, 0, 1024, 1024);
  // scatter city blocks (neutral greys — the quiet palette, no accent colour)
  for (let i = 0; i < 1400; i++) {
    const bx = Math.random() * 1024, by = Math.random() * 1024;
    const bw = 6 + Math.random() * 26, bh = 6 + Math.random() * 26;
    const g = 196 + Math.floor(Math.random() * 44);
    x.fillStyle = `rgb(${g},${g - 3},${g - 8})`;
    x.fillRect(bx, by, bw, bh);
  }
  // the central axis corridor (vertical) kept clear + marked in patina
  x.fillStyle = '#f4f2ed'; x.fillRect(486, 0, 52, 1024);
  x.strokeStyle = 'rgba(110,106,96,0.85)'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(512, 0); x.lineTo(512, 1024); x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function createGround(scene, { useShadows = false } = {}) {
  const SIZE = AXIS_LEN + 240;                 // span the whole (now much longer) axis
  const grid = new THREE.GridHelper(SIZE, Math.round(SIZE / 5), COLORS.ink, COLORS.ink);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  grid.position.set(0, 0, zFor(0.5));          // centre on the axis, not the world origin
  scene.add(grid);

  // a dedicated ShadowMaterial catcher — the city plane (MeshBasic) can't
  // receive shadows; this soft warm-ink plane grounds the buildings with
  // contact shadows over the sky, and ignores the massing/satellite fades.
  if (useShadows) {
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE, SIZE),
      new THREE.ShadowMaterial({ color: CINE.shadowCatcherColor, opacity: CINE.shadowCatcherOpacity })
    );
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.set(0, -0.05, zFor(0.5));
    catcher.receiveShadow = true;
    catcher.renderOrder = -1;
    scene.add(catcher);
  }

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshBasicMaterial({ map: makeCityTexture(), transparent: true, opacity: 0 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, -0.06, zFor(0.5));
  scene.add(plane);

  let mode = 'massing';
  const setMode = (m) => { mode = m; };

  // fade toward the target opacities each frame (smooth, no geometry churn)
  function update() {
    const gTarget = mode === 'massing' ? 0.06 : 0.015;
    const pTarget = mode === 'satellite' ? 0.92 : 0;
    grid.material.opacity += (gTarget - grid.material.opacity) * 0.08;
    plane.material.opacity += (pTarget - plane.material.opacity) * 0.08;
  }

  return { setMode, update };
}

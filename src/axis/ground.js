/* ============================================================
   ground.js — the ground plane, with two cross-fading modes:
   'massing' (faint construction grid) and 'satellite' (a
   procedural modern-city plan). Toggling only fades opacities —
   it never recreates geometry and never touches the camera or
   scroll (point 7).
   ============================================================ */

import * as THREE from 'three';
import { COLORS, zFor } from './config.js';

function makeCityTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#ece8de'; x.fillRect(0, 0, 1024, 1024);
  // scatter city blocks
  for (let i = 0; i < 1400; i++) {
    const bx = Math.random() * 1024, by = Math.random() * 1024;
    const bw = 6 + Math.random() * 26, bh = 6 + Math.random() * 26;
    const g = 150 + Math.floor(Math.random() * 70);
    x.fillStyle = `rgb(${g},${g - 4},${g - 12})`;
    x.fillRect(bx, by, bw, bh);
  }
  // the central axis corridor (vertical) kept clear + marked
  x.fillStyle = '#ece8de'; x.fillRect(486, 0, 52, 1024);
  x.strokeStyle = 'rgba(255,59,0,0.9)'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(512, 0); x.lineTo(512, 1024); x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function createGround(scene) {
  const grid = new THREE.GridHelper(900, 180, COLORS.ink, COLORS.ink);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  scene.add(grid);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
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

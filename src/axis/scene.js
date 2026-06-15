/* ============================================================
   scene.js — the WebGL layer. Owns renderer, camera, lights,
   shared materials, the axis line, ground and the segment
   manager. It exposes applyState(snapshot) and reacts ONLY to
   that — no scroll/DOM/GSAP coupling lives here (point 6).
   ============================================================ */

import * as THREE from 'three';
import { AXIS_LEN, COLORS, CAM, zFor } from './config.js';
import { focalZ, camPose } from './camera.js';
import { createSegments } from './segments.js';
import { createGround } from './ground.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(COLORS.paper, 1);     // opaque paper — no transparent holes

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a4, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(40, 80, 30);
  scene.add(sun);

  // shared materials — exactly three, reused across every monument (point 10)
  const M = {
    face: new THREE.MeshStandardMaterial({ color: COLORS.paper2, roughness: 0.85, metalness: 0 }),
    faceActive: new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.6, metalness: 0 }),
    edge: new THREE.LineBasicMaterial({ color: COLORS.ink }),
  };

  // the axis line itself
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, AXIS_LEN + 30),
    new THREE.MeshBasicMaterial({ color: COLORS.accent })
  );
  line.position.set(0, 0.06, zFor(0.5));
  scene.add(line);

  const ground = createGround(scene);
  const segments = createSegments(scene, M);

  let current = null;             // latest state snapshot
  let curAxisPos = 0;             // smoothed camera driver
  const lookTarget = new THREE.Vector3();   // reused — no per-frame allocation

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // react to a state change (only acts on actual changes within segments/ground)
  function applyState(s) {
    current = s;
    segments.ensureWindow(s.active);
    segments.setActive(s.active);
    ground.setMode(s.ground);
  }

  function frame() {
    const target = current ? current.axisPos : 0;
    curAxisPos += (target - curAxisPos) * CAM.lerp;
    const fz = focalZ(curAxisPos);
    camera.position.set(camPose.posX, camPose.posY, fz + camPose.back);
    lookTarget.set(0, camPose.lookY, fz - camPose.ahead);
    camera.lookAt(lookTarget);
    ground.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { applyState, segments };
}

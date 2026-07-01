/* ============================================================
   scene.js — the WebGL layer. Owns renderer, camera, lights,
   shared materials, the axis line, ground and the segment
   manager. It exposes applyState(snapshot) and reacts ONLY to
   that — no scroll/DOM/GSAP coupling lives here (point 6).

   Cinematic render layer (ported/extended from the Duyichu
   pipeline): ACES tone mapping, IBL (PMREM + RoomEnvironment),
   procedural gradient sky, atmospheric fog, a physical golden-hour
   sun with soft shadows on a MOVING frustum that tracks the hero,
   and a restrained post stack (bloom + grade/vignette + OutputPass).
   Weak devices drop post + shadows to a "lite" path that still keeps
   the tone-map + IBL + sky + fog look. Tuning lives in config CINE.
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { AXIS_LEN, COLORS, CAM, CINE, zFor } from './config.js';
import { focalZ, camPose } from './camera.js';
import { createSegments } from './segments.js';
import { createGround } from './ground.js';
import { makeMaterials } from './kit.js';

/* ---- module helpers (no per-instance/per-frame allocation) ---- */

// vertical gradient sky as a CanvasTexture (skyTop → skyBottom, weighted so
// the horizon band is skyBottom == fog.color for a seamless dissolve)
function skyTexture(topHex, bottomHex) {
  const hex = (h) => '#' + h.toString(16).padStart(6, '0');
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, hex(topHex));
  g.addColorStop(0.62, hex(bottomHex));
  g.addColorStop(1.0, hex(bottomHex));
  x.fillStyle = g; x.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// unit sun direction from elevation/azimuth (azimuth from +z south → +x east)
function sunDirection(elevDeg, azDeg, out) {
  const el = elevDeg * Math.PI / 180, az = azDeg * Math.PI / 180;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

// lift / gamma / gain + saturation + radial vignette — runs in linear space
// BEFORE OutputPass (which does the single ACES + sRGB encode). No sRGB here.
const GradeVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uLift: { value: new THREE.Vector3() },
    uGamma: { value: new THREE.Vector3(1, 1, 1) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 },
    uVignette: { value: 0.28 },
    uVigSoft: { value: 0.52 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec3 uLift, uGamma, uGain;
    uniform float uSat, uVignette, uVigSoft;
    void main(){
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = max(tex.rgb, 0.0);
      c = c + uLift;                                   // lift  (shadows)
      c = pow(max(c, 0.0), uGamma);                    // gamma (midtones, per-channel)
      c = c * uGain;                                   // gain  (highlights)
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));  // saturation
      c = mix(vec3(l), c, uSat);
      float d = distance(vUv, vec2(0.5));              // radial vignette
      c *= 1.0 - uVignette * smoothstep(uVigSoft, 0.9, d);
      gl_FragColor = vec4(max(c, 0.0), tex.a);
    }`,
};

export function createScene(canvas) {
  // ---- device tier: only genuinely weak DEVICES drop to lite (reduced-motion
  // does NOT — the scene has no autoplay, so those users still get the full
  // still cinematic frame). ----
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const conn = navigator.connection || {};
  const weak = mem <= 2 || cores <= 2 || conn.saveData ||
    /(^|-)(2g|slow-2g|3g)$/.test(conn.effectiveType || '');
  let usePost = !weak;
  const useShadows = !weak;
  const DPR = Math.min(devicePixelRatio, weak ? CINE.pixelCapWeak : CINE.pixelCapFull);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: weak, powerPreference: 'high-performance' });
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(CINE.skyBottom, 1);   // safety only — the sky bg paints over it
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CINE.exposure;
  if (useShadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;   // soft via shadow.radius; PCFSoft deprecated
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 900);

  // atmosphere: fog + gradient sky + IBL (the "un-flatten" trio)
  const FOG = new THREE.Color(CINE.fogColor);
  scene.fog = new THREE.Fog(FOG, CINE.fogNear, CINE.fogFar);
  scene.background = skyTexture(CINE.skyTop, CINE.skyBottom);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), CINE.pmremBlur).texture;
  scene.environmentIntensity = CINE.envIntensity;
  pmrem.dispose();

  // light rig — golden-hour key that AGREES with the sky sun direction
  scene.add(new THREE.HemisphereLight(CINE.hemiSky, CINE.hemiGround, CINE.hemiIntensity));
  scene.add(new THREE.AmbientLight(0xffffff, CINE.ambient));
  const _sunBase = sunDirection(CINE.sunElevationDeg, CINE.sunAzimuthDeg, new THREE.Vector3());
  const sun = new THREE.DirectionalLight(CINE.sunColor, CINE.sunIntensity);
  sun.position.copy(_sunBase).multiplyScalar(300);
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(CINE.fillColor, CINE.fillIntensity);
  fill.position.set(-60, 40, -40);
  scene.add(fill);
  if (useShadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(CINE.shadowMapDesktop, CINE.shadowMapDesktop);
    sun.shadow.bias = CINE.shadowBias;
    sun.shadow.normalBias = CINE.shadowNormalBias;
    sun.shadow.radius = CINE.shadowRadius;
    const sc = sun.shadow.camera;
    sc.left = -CINE.shadowHalf; sc.right = CINE.shadowHalf;
    sc.top = CINE.shadowHalf; sc.bottom = -CINE.shadowHalf;
    sc.near = CINE.shadowNear; sc.far = CINE.shadowFar;
    sc.updateProjectionMatrix();
  }

  // shared material set — toned study-model "focus" roles + a flat "ghost"
  // for neighbours + one ink edge, reused across every monument (point 10)
  const M = makeMaterials();

  // the axis line itself (fades into fog at distance)
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, AXIS_LEN + 30),
    new THREE.MeshBasicMaterial({ color: COLORS.accent, fog: true })
  );
  line.position.set(0, 0.06, zFor(0.5));
  scene.add(line);

  const ground = createGround(scene, { useShadows });
  const segments = createSegments(scene, M);

  // ---- post-processing composer (full tier only) ----
  let composer = null, bloom = null;
  if (usePost) {
    try {
      const bs = renderer.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(bs.x, bs.y, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(DPR);
      composer.setSize(innerWidth, innerHeight);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight),
        CINE.bloomStrength, CINE.bloomRadius, CINE.bloomThreshold);
      composer.addPass(bloom);
      const grade = new ShaderPass(GradeVignetteShader);
      grade.uniforms.uLift.value.fromArray(CINE.gradeLift);
      grade.uniforms.uGamma.value.fromArray(CINE.gradeGamma);
      grade.uniforms.uGain.value.fromArray(CINE.gradeGain);
      grade.uniforms.uSat.value = CINE.gradeSat;
      grade.uniforms.uVignette.value = CINE.vignette;
      grade.uniforms.uVigSoft.value = CINE.vignetteSoft;
      composer.addPass(grade);
      composer.addPass(new OutputPass());   // LAST — ACES + sRGB, exactly once
    } catch (e) {
      composer = null; usePost = false;     // degrade to forward render, not full fallback
      console.warn('[axis] post-processing unavailable — forward render', e);
    }
  }

  let current = null;             // latest state snapshot
  let curAxisPos = 0;             // smoothed camera driver
  const lookTarget = new THREE.Vector3();   // reused — no per-frame allocation
  const _sunPos = new THREE.Vector3();

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); bloom.setSize(w, h); }
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
    if (useShadows) {
      // slide the sun + its shadow frustum with the hero so the ±120 map stays sharp
      _sunPos.copy(_sunBase).multiplyScalar(300); _sunPos.z += fz;
      sun.position.copy(_sunPos);
      sun.target.position.set(0, 2, fz);
      sun.target.updateMatrixWorld();
    }
    ground.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { applyState, segments };
}

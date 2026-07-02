/* ============================================================
   scene.js — the WebGL layer. Owns renderer, camera, lights,
   shared materials, the axis line, ground and the segment
   manager. It exposes applyState(snapshot) and reacts ONLY to
   that — no scroll/DOM/GSAP coupling lives here (point 6).

   Cinematic render layer: ACES tone mapping, IBL (PMREM +
   RoomEnvironment), procedural gradient sky, atmospheric fog, a
   physical sun with soft shadows on a MOVING frustum, and a
   restrained post stack (bloom + grade/vignette + OutputPass).

   Director's cut:
   · A DAY'S WALK — the light itself travels: dawn at Yongdingmen,
     high warm light through the imperial core, dusk at the Bell &
     Drum Towers (the timekeepers). Sun/sky/fog lerp along DAY_STOPS,
     keyed to axis position; skyBottom == fog colour always.
   · MATERIAL BLOOM — focus handover animates through the kit's
     transitioner (ticked here each frame).
   · THE FINALE — over the last stretch of scroll the camera lifts
     above the Bell Tower and looks back south down the whole line;
     the fog veil lifts; segments light the monuments in a cascade.

   Weak devices drop post + shadows but keep the tone-map + IBL +
   sky + fog look. Tuning lives in config (CINE / DAY_STOPS / FINALE).
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { AXIS_LEN, COLORS, CAM, CINE, DAY_STOPS, FINALE, zFor } from './config.js';
import { focalZ, camPose } from './camera.js';
import { createSegments } from './segments.js';
import { createGround } from './ground.js';
import { makeMaterials } from './kit.js';

/* ---- module helpers (no per-instance/per-frame allocation) ---- */

// updatable vertical gradient sky (top → horizon; horizon band == fog colour)
function makeSky() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let lastT = '', lastB = '';
  return {
    tex,
    set(top, bottom) {
      const t = top.getStyle(), b = bottom.getStyle();
      if (t === lastT && b === lastB) return;      // skip the GPU re-upload when unchanged
      lastT = t; lastB = b;
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0.0, t);
      g.addColorStop(0.62, b);
      g.addColorStop(1.0, b);
      x.fillStyle = g; x.fillRect(0, 0, 2, 256);
      tex.needsUpdate = true;
    },
  };
}

// unit sun direction from elevation/azimuth (azimuth from +z south → +x east)
function sunDirection(elevDeg, azDeg, out) {
  const el = elevDeg * Math.PI / 180, az = azDeg * Math.PI / 180;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

const smooth01 = (x) => x * x * (3 - 2 * x);

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
    renderer.shadowMap.type = THREE.PCFShadowMap;   // soft via shadow.radius
    renderer.shadowMap.autoUpdate = false;          // we drive needsUpdate (frozen when the hero is still)
  }
  // dev-only camera-snap hook (?snap) for headless verification; import.meta.env.DEV
  // is false in production, so this whole expression tree-shakes out of the build.
  const SNAP = import.meta.env.DEV && /[?&]snap/.test(location.search);

  const scene = new THREE.Scene();
  // far reaches past the finale aerial view of the full line
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2600);

  // atmosphere: fog + gradient sky + IBL (the "un-flatten" trio)
  scene.fog = new THREE.Fog(CINE.fogColor, CINE.fogNear, CINE.fogFar);
  const sky = makeSky();
  scene.background = sky.tex;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), CINE.pmremBlur).texture;
  scene.environmentIntensity = CINE.envIntensity;
  pmrem.dispose();

  // light rig — key sun + hemisphere fill; colours/direction driven by the day arc
  const hemi = new THREE.HemisphereLight(CINE.hemiSky, CINE.hemiGround, CINE.hemiIntensity);
  scene.add(hemi);
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

  // ---- the day arc: dawn (south) → day (core) → dusk (north) ----
  const STOPS = DAY_STOPS.map((s) => ({
    t: s.t, sunInt: s.sunInt, el: s.el, az: s.az, hemi: s.hemi,
    skyTop: new THREE.Color(s.skyTop), skyBottom: new THREE.Color(s.skyBottom), sun: new THREE.Color(s.sun),
  }));
  const _cTop = new THREE.Color(), _cBot = new THREE.Color();
  let lastDayT = -1;
  function updateDaylight(t) {
    if (Math.abs(t - lastDayT) < 0.008) return;      // sky redraw only on real change
    lastDayT = t;
    let a = STOPS[0], b = STOPS[STOPS.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      if (t >= STOPS[i].t && t <= STOPS[i + 1].t) { a = STOPS[i]; b = STOPS[i + 1]; break; }
    }
    const k = (t - a.t) / ((b.t - a.t) || 1);
    _cTop.lerpColors(a.skyTop, b.skyTop, k);
    _cBot.lerpColors(a.skyBottom, b.skyBottom, k);
    sky.set(_cTop, _cBot);
    scene.fog.color.copy(_cBot);                     // horizon == fog, always (no seam)
    renderer.setClearColor(_cBot, 1);
    sun.color.lerpColors(a.sun, b.sun, k);
    sun.intensity = a.sunInt + (b.sunInt - a.sunInt) * k;
    hemi.intensity = a.hemi + (b.hemi - a.hemi) * k;
    sunDirection(a.el + (b.el - a.el) * k, a.az + (b.az - a.az) * k, _sunBase);
  }

  // shared material set — real per-role materials for the focused monument,
  // one pale ghost for neighbours, one ink edge (point 10)
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
  let curFinale = 0;              // smoothed finale phase
  const lookTarget = new THREE.Vector3();   // reused — no per-frame allocation
  const _sunPos = new THREE.Vector3();
  let prevWantShadow = false, lastShadowFz = Infinity;
  const _p1 = new THREE.Vector3(), _l1 = new THREE.Vector3();

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); bloom.setSize(w, h); }
  }
  addEventListener('resize', resize);
  resize();

  // react to a state change — just stash the snapshot + ground mode; ALL segment
  // work (window, focus bloom, finale build/light/teardown) is pumped per-frame
  // from the rAF loop so it can't stall if the user stops scrolling mid-finale.
  function applyState(s) {
    current = s;
    ground.setMode(s.ground);
  }

  function frame() {
    const now = performance.now();
    const target = current ? current.axisPos : 0;
    curAxisPos += (target - curAxisPos) * (SNAP ? 1 : CAM.lerp);
    const fTarget = current ? current.finale : 0;
    curFinale += (fTarget - curFinale) * (SNAP ? 1 : 0.09);
    if (fTarget === 0 && curFinale < 0.001) curFinale = 0;

    updateDaylight(Math.min(1, Math.max(0, curAxisPos)));

    const fz = focalZ(curAxisPos);
    camera.position.set(camPose.posX, camPose.posY, fz + camPose.back);
    lookTarget.set(0, camPose.lookY, fz - camPose.ahead);
    if (curFinale > 0.0005) {
      // the pull-back: rise above the Bell Tower, look back south down the line
      const f = smooth01(curFinale);
      _p1.set(FINALE.camX, FINALE.camY, zFor(1) - FINALE.camZbeyond);
      _l1.set(0, FINALE.lookY, zFor(FINALE.lookPos));
      camera.position.lerp(_p1, f);
      lookTarget.lerp(_l1, f);
      scene.fog.near = CINE.fogNear + (FINALE.fogNear - CINE.fogNear) * f;   // the veil lifts
      scene.fog.far = CINE.fogFar + (FINALE.fogFar - CINE.fogFar) * f;
    } else {
      scene.fog.near = CINE.fogNear;
      scene.fog.far = CINE.fogFar;
    }
    camera.lookAt(lookTarget);

    if (useShadows) {
      // shadows off during the aerial finale (they don't read from up there → free the GPU);
      // otherwise slide the sun + its ±120 frustum with the hero and only re-render the
      // shadow map when the hero (or its lighting) actually moved.
      const wantShadow = curFinale < 0.5;
      sun.castShadow = wantShadow;
      if (wantShadow) {
        _sunPos.copy(_sunBase).multiplyScalar(300); _sunPos.z += fz;
        sun.position.copy(_sunPos);
        sun.target.position.set(0, 2, fz);
        sun.target.updateMatrixWorld();
        if (!prevWantShadow || Math.abs(fz - lastShadowFz) > 0.5) {
          renderer.shadowMap.needsUpdate = true; lastShadowFz = fz;
        }
      }
      prevWantShadow = wantShadow;
    }
    // pump the segment manager off the render loop (build/light/window/bloom)
    segments.sync(current ? current.finale : 0, curFinale, current ? current.active : 0,
      current ? current.scroll : 0, now);
    ground.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { applyState, segments };
}

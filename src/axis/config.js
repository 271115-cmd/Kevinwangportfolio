/* ============================================================
   config.js — shared spatial constants + colour tokens for the
   Central Axis scene. Single place for axis geometry math so the
   camera, segments, and archetypes all agree.
   ============================================================ */

export const AXIS_LEN = 1084;                // world length, south → north (real proportions, generously spread)
export const Z_SOUTH = 14;                   // world z at pos 0 (south)
export const zFor = (pos) => Z_SOUTH - pos * AXIS_LEN;   // pos 0..1 → world z

// monuments are built at true-ish metre scale, then shrunk into the atlas
export const MODEL_SCALE = 0.42;             // ~1 world unit ≈ 2.4 m of building
export const FLANK_MARGIN = 7;               // gap from the axis line for east/west sites

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

// ============================================================
// CINE — the single tuning surface for the cinematic render layer
// (ACES tone-map + IBL + procedural sky + fog + soft shadows + post).
// Two tokens must never drift: skyBottom == fogColor == the horizon,
// so distant monuments dissolve seamlessly into the haze.
// ============================================================
export const CINE = {
  // tone mapping (ACESFilmic)
  exposure: 1.02,                 // range 0.9–1.15 — the global dimmer; tune this first
  // IBL
  envIntensity: 0.35,             // scene.environmentIntensity. range 0.25–0.5
  pmremBlur: 0.04,                // PMREM.fromScene sigma. range 0.02–0.1
  // palette (sRGB hex)
  skyTop:    0xBFC9D6,            // cool luminous zenith
  skyBottom: 0xF3E9D8,            // warm golden haze at horizon
  fogColor:  0xF3E9D8,            // == skyBottom (single source)
  // fog (linear)
  fogNear:   110, fogFar: 620,    // hero crisp (near > camera-to-focal ~55u); north dissolves
  // sun — warm golden-hour key; MUST agree with sky
  sunColor: 0xFFE9C6, sunIntensity: 2.0,   // ACES units (was 0.9 pre-IBL). range 1.6–2.6
  sunElevationDeg: 16, sunAzimuthDeg: 108,  // low = long shadows; SE rake
  // hemisphere + fill
  hemiSky: 0xDFEAFF, hemiGround: 0x9C8F7A, hemiIntensity: 0.55,
  ambient: 0.12,                  // floor so shadow faces don't crush
  fillColor: 0xDDE6F0, fillIntensity: 0.30,  // cool counter-fill, no shadow
  // shadows (moving ortho frustum)
  shadowHalf: 120, shadowMapDesktop: 2048, shadowMapWeak: 1024,
  shadowNear: 1, shadowFar: 600,
  shadowBias: -0.0004, shadowNormalBias: 0.6, shadowRadius: 4,
  shadowCatcherOpacity: 0.24, shadowCatcherColor: 0x2A2620,
  // bloom (UnrealBloomPass)
  bloomStrength: 0.26, bloomRadius: 0.60, bloomThreshold: 0.92,
  // grade + vignette (golden-hour preset)
  gradeLift:  [0.010, 0.006, -0.004],
  gradeGamma: [1.02, 1.00, 0.96],
  gradeGain:  [1.06, 1.02, 0.94],
  gradeSat:   1.06,
  vignette:   0.28, vignetteSoft: 0.52,
  // perf
  pixelCapFull: 2, pixelCapWeak: 1.5,
};

// ============================================================
// DAY_STOPS — a day's walk. t = position along the axis (0 south → 1 north):
// dawn at Yongdingmen → high warm light through the imperial core → dusk at
// the Bell & Drum Towers (the city's timekeepers announcing nightfall).
// Sun el/az sweep east → south → west; skyBottom stays == fog colour.
// ============================================================
export const DAY_STOPS = [
  { t: 0.00, skyTop: 0xC7D2E2, skyBottom: 0xF6E3CE, sun: 0xFFC493, sunInt: 1.75, el: 10, az: 78, hemi: 0.50 },
  { t: 0.45, skyTop: 0xBFC9D6, skyBottom: 0xF3E9D8, sun: 0xFFE9C6, sunInt: 2.10, el: 30, az: 18, hemi: 0.55 },
  { t: 1.00, skyTop: 0x7C86A0, skyBottom: 0xEFCDA6, sun: 0xFF9F63, sunInt: 1.35, el: 12, az: -70, hemi: 0.42 },
];

// ============================================================
// FINALE — the pull-back. The last stretch of scroll lifts the camera above
// the Bell Tower to look back south down the whole line; monuments light up
// south → north in a cascade and the haze lifts so the full 7.8 km reads.
// ============================================================
export const FINALE = {
  start: 0.86,                        // scroll fraction where the finale begins
  camX: 140, camY: 300, camZbeyond: 140,   // aerial pose near the spine, above/north of the Bell Tower
  lookY: 18, lookPos: 0.40,           // gaze back south down the line
  fogNear: 520, fogFar: 3600,         // the veil lifts
  litBy: 0.9,                         // the south→north light-up cascade lands as the camera settles
};

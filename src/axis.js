/* ============================================================
   axis.js — entry point for "The Living Central Axis".
   The system is modular (see src/axis/*): state → scene (camera,
   segments, ground) and a decoupled UI, wired by the controller.
   This file just exposes initAxis() for the lazy import in main.js.
   ============================================================ */

export { initAxis } from './axis/controller.js';

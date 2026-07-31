// src/game-render/modes/strategic/skyMath.ts
// Pure math for DesertSky, split out so DesertSky.ts (which wires these into
// three.js objects) stays under the file-length cap.

// --- Height falloff: haze pools in troughs, crests and sky stay clear -----
//
// Finding 1: FogExp2 applied uniformly with altitude turned dusk into "a flat
// mauve gradient with zero terrain" — the same density sat on the crests as
// in the troughs, so there was no terrain left showing through it. Scaling
// density down with world height instead leaves the troughs exactly as hazy
// as before while the crests and skyline clear. heightScale is on the order
// of DesertTerrain's dune amplitude (124) per the brief, so a crest a full
// dune-height up has already decayed by exp(-1) ~= 37%.
//
// GLSL has no module system, so sandShader.glsl.ts's fog override cannot
// import this; it re-implements the same formula and cites this comment.
// This is the tested source of truth for it.
export function heightFogFactor(worldY: number, heightScale: number): number {
  return Math.exp(-Math.max(0, worldY) / Math.max(1e-6, heightScale))
}

// --- Sun azimuth, and the camera yaw that keeps it in frame ---------------
//
// Finding 2: dawn and golden-pm were captioned "sun on the horizon" yet held
// no sun, because Lighting.applyPalette's azimuth default and CameraRig's
// default yaw (0) were never reconciled — the one object anchoring the
// composition sat off to the side every hour. Lighting.ts fixes azimuth for
// this view on purpose (a single patch of desert, sun rises and sets on the
// same bearing); aiming the rig's initial yaw at that bearing once, at
// construction, keeps the sun in frame at every hour rather than only
// whichever one it was eyeballed against.
export const SURFACE_SUN_AZIMUTH = Math.PI * 0.25

/**
 * CameraRig yaw whose forward vector (see its apply(): position is
 * target + horizontal*(sin(yaw), ..., cos(yaw)), always looking at target)
 * points at a compass azimuth — i.e. the direction (cos A, sin A) that
 * Lighting.ts's own sun.position formula places the sun along.
 */
export function yawToFaceAzimuth(azimuthRadians: number): number {
  return Math.atan2(-Math.cos(azimuthRadians), -Math.sin(azimuthRadians))
}

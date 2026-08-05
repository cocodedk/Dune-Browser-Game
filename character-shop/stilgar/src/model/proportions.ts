// character-shop/stilgar/src/model/proportions.ts
// Every derived measurement the geometry builders and the R1 tests share,
// computed once from spec.ts's PROPORTIONS. Pure numbers — no three.js
// import — so this stays trivially unit-testable and is the ONE place the
// vertical stack (ground to crown) and the limb sub-splits live; a builder
// file changing a segment fraction here cannot silently disagree with the
// test file measuring it, because both read the same constant.
//
// Vertical scheme mirrors the placeholder's four-way body split (leg/pelvis/
// spine/chest fractions of bodyH sum to 1); this round adds the sub-splits
// (boot/calf/thigh, upper/fore/hand) and the horizontal plan (hip joint
// inset, shoulder cap radius, torso taper) the placeholder never needed.
//
// The head band is sized top-down from heightM, not bottom-up from headH:
// hoodTopY targets heightM * 0.998, a deliberate 0.2% margin inside the
// seam test's 1% height tolerance so a hood (the tallest mesh) never risks
// tipping the overall figure out of spec — see hoodTopY below.

import { PROPORTIONS } from '../spec'

const { heightM, headHeightFraction, shoulderHalfWidth, hipHalfWidth } = PROPORTIONS

export const headH = heightM * (headHeightFraction.min + headHeightFraction.max) / 2
export const bodyH = heightM - headH

// Ground-up stack: legH is hip-joint height off the ground (world Y of the
// pelvis group's origin), matching the placeholder's convention exactly.
export const legH = bodyH * 0.58
export const pelvisH = bodyH * 0.09
export const spineH = bodyH * 0.17
export const chestH = bodyH * 0.16
export const shoulderY = legH + pelvisH + spineH + chestH // == bodyH == neck base

// Leg sub-split (ground up): boot rise, calf, thigh.
export const bootH = legH * 0.13
export const calfH = legH * 0.41
export const thighH = legH * 0.46

// Hip joint sits INSET from the outer hip half-width (the pelvis MASS is
// hipHalfWidth wide; real hip sockets sit under that outer line, not on it —
// otherwise the thighs would read wider than the hips they hang from).
export const hipJointX = hipHalfWidth * 0.62
export const thighTopR = 0.095
export const kneeR = 0.072
export const calfTopR = 0.078
export const ankleR = 0.052
export const bootHalfW = 0.075
export const bootHalfD = 0.115

// Arm sub-split (shoulder down): upper arm, forearm, hand.
export const armTotal = heightM * 0.42
export const upperArmLen = armTotal * 0.42
export const forearmLen = armTotal * 0.36
export const handLen = armTotal * 0.22
// Shoulder caps: a subtle deltoid rounding at the arm socket only, NOT the
// figure's primary shoulder statement. Found too large at 0.075 — read as
// two large spheres sitting on the pectorals ("fallen pauldrons"/"a bust");
// the shoulder WRAP (geometry/costume.ts) now owns the visible shoulder-to-
// shoulder edge and the measured shoulderHalfWidth (it reaches further out
// than these caps do). capX below still keeps the caps' own reach at
// exactly shoulderHalfWidth by construction (capX + shoulderR ==
// shoulderHalfWidth) — shrinking shoulderR only shrinks the ball, never
// that identity.
export const shoulderR = 0.048
export const upperArmTopR = 0.052
export const elbowR = 0.05
export const forearmTopR = 0.045
export const wristR = 0.038

// Neutral A-pose abduction: arms hang ~25-30 degrees off the body.
export const ARM_ABDUCTION_RAD = (28 * Math.PI) / 180

// Torso plan — two stacked truncated cones (chest, then spine) so the
// silhouette tapers shoulders -> waist -> hips instead of a straight tube.
// Direct children of 'chest'/'spine'/'pelvis' only (child armature groups
// like armL/head are excluded from what these represent) — that is what
// lets silhouette.test.ts measure "shoulder width" and "hip width" as
// exactly the torso mass, not the whole limb.
export const chestTopHalfW = shoulderHalfWidth - shoulderR * 0.47 // ribcage top, just inboard of the deltoid caps
export const chestBottomHalfW = Math.min(shoulderHalfWidth, hipHalfWidth) * 0.885 // narrows toward the waist
export const spineBottomHalfW = hipHalfWidth * 0.97 // widens back out toward the hips
export const pelvisHalfW = hipHalfWidth
export const torsoDepthRatio = 0.62 // front-back flatten vs side-to-side (a torso is elliptical, not round)

// Head plan. The 'head' armature group's own local origin sits at WORLD
// Y = shoulderY (it is a child of 'chest', jointed at the chest top) — so
// every export below this line is LOCAL to that group's frame (i.e.
// relative to the neck base), NOT world-absolute.
//
// R1 pass-3 (2026-08-05) rewrote this block. Pass 2 sized the head as a
// stack of analytic radii (hoodR, skullRX/RY/RZ, JAW_RX/RY/RZ) because the
// head WAS a stack of spheres; the result read as a balloon with a slice
// cut out, a mushroom brow and a truncated-cone beard. The head is now one
// lofted surface (geometry/head.ts) with the face sculpted into it
// (geometry/face.ts), so what proportions.ts owns is no longer a set of
// radii but the four ANATOMY LANDMARKS every sculpt file must agree on.

// The tallest mesh on the figure. 0.998 of heightM is a deliberate 0.2%
// margin inside seam.test.ts's 1% height tolerance, so the hood peak — not
// some later addition — is what defines the figure's stature.
export const hoodTopY = heightM * 0.998
export const hoodTopLocal = hoodTopY - shoulderY

// Eye line, straight off the spec, expressed in the head group's frame.
// Every face form in geometry/face.ts is placed RELATIVE to this, so a
// spec change moves the brow, sockets, cheekbones and nose together.
export const eyeLineLocal = PROPORTIONS.eyeLineFraction * heightM - shoulderY

// Bare crown, a hood's cloth thickness plus drape loft below the peak.
export const crownLocal = hoodTopLocal - 0.0125
// Chin. Classical head canon: the eye line halves crown-to-chin. Held here
// so head.ts's profile table and beard.ts's hair mass cannot disagree
// about where the jaw ends.
export const chinLocal = 2 * eyeLineLocal - crownLocal
// Widest point of the face — the zygomatic arch, at the eye line. Heavy-
// boned (spec.ts: "Broad, heavy-boned head"), so a full 0.160 m across.
export const faceHalfWidth = 0.080

export const neckR = 0.0495

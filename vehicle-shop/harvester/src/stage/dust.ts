// vehicle-shop/harvester/src/stage/dust.ts
// I7 (immediate-improvements §7 dust + §9): two semi-transparent, expanding
// dust plumes behind the REAR sprockets (TRACK.sprocketZ[1], both sides),
// driven by the crawler's signed track speeds through the SAME update path
// as the belt scroll — Harvester.ts passes state.trackLeft/trackRight here
// exactly as it does to tracks.update(), so the I0 harness's drive()/tick()
// drives dust deterministically and two identical (pose, drive, tick)
// sequences render byte-identical frames.
//
// DETERMINISM: no randomness anywhere. A plume's phase is METRES OF TRACK
// TRAVEL (|speed| * dt, wrapped to one cycle), never wall-clock time — and
// this round's correctness question (a) is answered by construction:
// dustVisualAt short-circuits to {0, 0} on zero magnitude BEFORE touching
// phase, so a parked machine reads zero dust at any phase, not just at
// phase 0.
//
// The pure maths below needs no three.js and is unit-tested directly;
// buildDustPlumes only copies those numbers onto two camera-facing Sprites —
// auto-billboarding is the cheapest correct answer to "semi-transparent
// expanding planes" across the whole turntable set, with no plume-vs-camera
// geometry to get wrong.

import { Group, Sprite, SpriteMaterial } from 'three'
import { TRACK } from '../spec'
import { wrapMod } from '../model/beltPhase'

// Lighter than the sand/sky (0xd9b98a) it sits against, not darker or the
// same tone — real dust backscatters light and reads as a haze LIFTING the
// background, not a shadow on it. A tone this close to the background would
// be invisible at the shot list's ~90m capture distances no matter how big
// the sprite is (found by capture: the first pass, at 0xcdb583/opacity 0.35/
// max scale 5.5, was measurably present in pixels but effectively invisible
// to the eye — the loop's own "if you can't see it, report WEAK" rule).
const DUST_COLOR = 0xe8dab8

/** Metres of track travel per plume cycle: birth, expansion, fade, repeat. */
export const DUST_CYCLE_DISTANCE = 6
export const DUST_MAX_OPACITY = 0.6
/** Scale in metres, at a sprocket radius of 3.2m — a puff several times the
 *  sprocket at birth, growing into a plume comparable to the pod's own
 *  width, so it reads against a 60m machine at capture distance instead of
 *  needing a close-up to see at all. */
export const DUST_MIN_SCALE = 4
export const DUST_MAX_SCALE = 16
/** |speed| at which the plume reaches full size/density; beyond it, no
 *  bigger, no denser — restraint, the same principle as the I7 fill light. */
export const DUST_SPEED_SATURATION = 4

/** How far past the rear sprocket the plume sits (+Z, trailing the machine
 *  as it drives toward -Z), and how low it hangs over the sand. */
const EMITTER_Z_OFFSET = 4.5
const EMITTER_Y = 1.8

export interface DustVisual {
  scale: number
  opacity: number
}

/** Phase advances only by the distance travelled — |speed| * dt, never the
 *  wall clock — and wraps modulo one cycle so a plume repeats rather than
 *  growing forever. Reused from beltPhase.ts's wrapMod: same always-positive
 *  remainder a reversing track needs. */
export function advanceDustPhase(phase: number, speed: number, dt: number): number {
  return wrapMod(phase + Math.abs(speed) * dt, DUST_CYCLE_DISTANCE)
}

/** Correctness (a), pinned here: magnitude is 0 at speed 0, and the visual
 *  is returned as exactly {0, 0} before phase is even consulted. Magnitude
 *  (not signed speed) drives it, so reversing kicks up dust exactly like
 *  driving forward — a real track does not care which way it turns. */
export function dustVisualAt(phase: number, speed: number): DustVisual {
  const magnitude = Math.min(Math.abs(speed) / DUST_SPEED_SATURATION, 1)
  if (magnitude <= 0) return { scale: 0, opacity: 0 }
  const t = phase / DUST_CYCLE_DISTANCE
  const envelope = Math.sin(Math.PI * t)
  return {
    scale: DUST_MIN_SCALE + (DUST_MAX_SCALE - DUST_MIN_SCALE) * t * magnitude,
    opacity: DUST_MAX_OPACITY * magnitude * envelope,
  }
}

export interface DustPlumes {
  group: Group
  /** Advance both plumes from the crawler's signed track speeds — the same
   *  two numbers tracks.update() and cab.update() read. */
  update(trackLeft: number, trackRight: number, dt: number): void
  dispose(): void
}

interface Plume {
  side: 1 | -1
  sprite: Sprite
  material: SpriteMaterial
  phase: number
}

export function buildDustPlumes(): DustPlumes {
  const group = new Group()
  group.name = 'dustPlumes'

  const rearZ = TRACK.sprocketZ[1] + EMITTER_Z_OFFSET
  const plumes: Plume[] = ([1, -1] as const).map((side) => {
    const material = new SpriteMaterial({ color: DUST_COLOR, transparent: true, opacity: 0, depthWrite: false })
    const sprite = new Sprite(material)
    sprite.name = 'dustPlume'
    sprite.position.set(side * TRACK.centreX, EMITTER_Y, rearZ)
    sprite.scale.setScalar(0)
    group.add(sprite)
    return { side, sprite, material, phase: 0 }
  })

  return {
    group,
    update(trackLeft, trackRight, dt) {
      // +X is starboard (side 1), the same convention tracks.ts uses to
      // pick trackRight/trackLeft for its own runners and belts.
      for (const plume of plumes) {
        const speed = plume.side === 1 ? trackRight : trackLeft
        plume.phase = advanceDustPhase(plume.phase, speed, dt)
        const visual = dustVisualAt(plume.phase, speed)
        plume.sprite.scale.setScalar(visual.scale)
        plume.material.opacity = visual.opacity
      }
    },
    dispose() {
      // Sprites share three.js's internal PlaneGeometry singleton — dispose
      // only the materials built here, never the geometry.
      for (const plume of plumes) plume.material.dispose()
    },
  }
}

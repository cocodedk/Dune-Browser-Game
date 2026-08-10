// src/game-render/modes/location/sietchGate.ts
// Decides, per frame, whether the player's current location shows the real
// 3D sietch set or the painted diorama, and mounts/disposes the set on the
// way in and out.
//
// A LocationMode instance normally corresponds to one arrival for its whole
// lifetime — but world.player.location can change under it without a scene
// signal (a debug teleport is the reachable case today), so `sync` re-checks
// every frame rather than once at construction. That is the one place a
// kind switch WITHIN a mode instance has to be handled without leaking.

import type { PerspectiveCamera, Scene } from 'three'
import type { WorldState } from '../../../types'
import type { Hotspot } from './locationDefs'
import { INITIAL_CHARACTERS } from '../../../data/characters'
import { hotspotsFor } from './locationDefs'
import { createSietchSet } from './SietchSet'
import type { SietchSet } from './SietchSet'

// The shop's interior was authored and approved under ACES exposure 1.0 (see
// SietchSet.ts's envMapIntensity=0 note for the matching env-map story). The
// game's Renderer otherwise drives exposure from the hour every frame
// (ThreeContainer.tsx) — right for the open desert, wrong for a lit interior
// whose materials were never tuned against that curve. The painted diorama
// never had this problem (toneMapped:false makes it exposure-immune by
// construction); a real MeshStandardMaterial set has no such immunity, so the
// gate pins the value explicitly for as long as the set is mounted.
//
// scene.userData is the channel rather than a new SceneMode field: LocationMode
// is at the file's 200-line cap, and ThreeContainer already reads modes.scene
// every frame to call updateEnvironment/render, so this rides along for free
// and needs no interface change (same idiom SietchMarkers/PlanetMarkers use
// for per-mesh `emphasis`, just at the scene level).
const PINNED_EXPOSURE = 1.0

export interface SietchGate {
  readonly active: boolean
  readonly camera: PerspectiveCamera | null
  /** The spots currently shown, for the caller's own pointer router — the
   *  HUD (sietchHud.ts) paints these, but hit-testing reads a copy the
   *  caller owns, so both must see the same list or clicks miss what the
   *  screen shows. Empty while inactive. */
  readonly spots: Hotspot[]
  /** Mount or dispose the set to match the player's current location; a
   *  no-op if nowhere is found. Safe to call every frame. */
  sync(world: WorldState): void
  update(elapsedMs: number): void
  setHover(id: string | null): void
  dispose(): void
}

export function createSietchGate(
  scene: Scene,
  canvas: HTMLElement | undefined,
  displayHeight: () => number,
  displayRatio: () => number,
  /** Hide the diorama's own meshes while the set is mounted. */
  onEnter: () => void,
  /** Show them again once the set is torn down. */
  onLeave: () => void,
): SietchGate {
  let set: SietchSet | null = null
  let spots: Hotspot[] = []

  return {
    get active(): boolean {
      return set !== null
    },
    get camera(): PerspectiveCamera | null {
      return set?.camera ?? null
    },
    get spots(): Hotspot[] {
      return spots
    },
    sync(world): void {
      const place = world.villages.find(v => v.id === world.player.location)
      if (!place || place.kind !== 'sietch') {
        if (set) {
          set.dispose()
          set = null
          spots = []
          delete scene.userData.exposurePin
          onLeave()
        }
        return
      }
      if (!set) {
        scene.userData.exposurePin = PINNED_EXPOSURE
        onEnter()
        set = createSietchSet(scene, canvas, displayHeight, displayRatio)
      }
      const hasSpeaker = INITIAL_CHARACTERS.some(c => c.locationId === world.player.location)
      spots = hotspotsFor(place.kind, hasSpeaker)
      set.setContent(spots, place.name)
    },
    update(elapsedMs): void {
      set?.update(elapsedMs)
    },
    setHover(id): void {
      set?.setHover(id)
    },
    dispose(): void {
      // Belt-and-suspenders: ModeManager always constructs the next mode's
      // (and its own fresh Scene) before disposing this one, so nothing ever
      // reads this stale flag off this scene — but leaving it set would be a
      // landmine for the next thing that touches this exact Scene object.
      if (set) delete scene.userData.exposurePin
      set?.dispose()
    },
  }
}

// vehicle-shop/ornihopter/src/interior/mfdLive.ts
// The two MFD pages, kept in step with the craft.
//
// B5 asks that the nav page's compass and the systems page's altitude/throttle
// bars come from FlightState. This owns the textures, the repaint, and the one
// judgement call in it: WHEN.
//
// CADENCE IS VALUE-DRIVEN. A page is 128x128 = 16k texels, and repainting both
// every frame would run a per-texel painter 2 million times a second to redraw
// pictures that are, at cruise, identical. So each page carries a quantised key
// — heading to 2 degrees for the map, throttle/speed/altitude to a percent and
// a metre for the systems page — and repaints only when its own key moves. At
// the screen size these pages render (214px wide in the pilot frame, per
// mfdFaces.ts) 2 degrees is well under one texel of map rotation, so nothing
// visible is being dropped; in the cruise the pages simply stop repainting.
//
// The alternative, a fixed Hz gate, was rejected for being both worse and
// untestable: it repaints unchanged pages and lags changed ones, and it cannot
// be asserted without stubbing a clock.

import type { DataTexture } from 'three'
import type { FlightState } from '../contracts'
import { readFlight } from '../hud/reading'
import { bakeFace, paintInto } from './faceBaker'
import { movingMapPainter, systemsPagePainter, MFD_SIZE } from './mfdFaces'

export interface LivePages {
  /** The nav/moving-map page, track-up. */
  map: DataTexture
  /** The engine/systems page: throttle, speed and altitude bars. */
  systems: DataTexture
  update(state: Readonly<FlightState>): void
  dispose(): void
}

function repaint(texture: DataTexture, paint: Parameters<typeof paintInto>[2]): void {
  paintInto(texture.image.data as Uint8Array, MFD_SIZE, paint)
  texture.needsUpdate = true
}

export function createLivePages(): LivePages {
  const zero = { pitchDeg: 0, rollDeg: 0, headingDeg: 0, altitude: 0, speed: 0, throttle: 0 }
  const map = bakeFace(MFD_SIZE, movingMapPainter(zero))
  const systems = bakeFace(MFD_SIZE, systemsPagePainter(zero))
  let mapKey = Number.NaN
  let systemsKey = Number.NaN

  return {
    map,
    systems,
    update(state) {
      const r = readFlight(state)
      const nextMap = Math.round(r.headingDeg / 2)
      if (nextMap !== mapKey) {
        mapKey = nextMap
        repaint(map, movingMapPainter(r))
      }
      // One packed key rather than three comparisons: throttle to the percent,
      // speed to the half-metre-per-second, altitude to the metre.
      const nextSystems =
        Math.round(r.throttle * 100) * 1e6 +
        Math.round(r.speed * 2) * 1e3 +
        Math.round(Math.min(9999, Math.max(0, r.altitude)))
      if (nextSystems !== systemsKey) {
        systemsKey = nextSystems
        repaint(systems, systemsPagePainter(r))
      }
    },
    dispose() {
      map.dispose()
      systems.dispose()
    },
  }
}

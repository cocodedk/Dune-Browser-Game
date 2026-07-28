// src/game-render/core/modeFactories.ts
// Which scene mode each id builds, in one place.
//
// Split out of ThreeContainer so that file stays about the render loop rather
// than about the cast of modes. The wiring between orbit and surface is the
// only interesting part: each hands off to the other through the ModeManager's
// pure reducer rather than constructing its counterpart directly.

import type { PerspectiveCamera } from 'three'
import type { WorldState } from '../../types'
import type { QualitySettings } from './Quality'
import { ModeManager } from './ModeManager'
import { createPlanetMode } from '../planet/PlanetMode'
import { createStrategicMode } from '../modes/strategic/StrategicMode'
import { createFlightMode } from '../modes/flight/FlightMode'
import { createConversationMode } from '../modes/conversation/ConversationMode'
import { createLocationMode } from '../modes/location/LocationMode'

export function createModeManager(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
): ModeManager {
  const modes: ModeManager = new ModeManager({
    // Orbit. Zooming all the way in descends to the surface.
    strategic: () =>
      createPlanetMode(camera, quality, world, canvas, () =>
        modes.handleSignal({ kind: 'descend' }),
      ),
    // The dune field underfoot. Zooming back out returns to orbit.
    surface: () =>
      createStrategicMode(camera, quality, world, canvas, () =>
        modes.handleSignal({ kind: 'ascend' }),
      ),
    conversation: () => createConversationMode(camera),
    location: () => createLocationMode(),
    flight: () => createFlightMode(camera, quality),
  })
  return modes
}

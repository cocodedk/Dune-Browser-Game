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
import { EventBus } from '../../EventBus'
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
  // Where the player last came down. The surface view is one dune field, so
  // it has to be told which patch of Arrakis it represents — otherwise
  // descending anywhere lands in the same place.
  let descentCentre = { lat: 0, lon: 0 }

  const modes: ModeManager = new ModeManager({
    // Orbit. Zooming all the way in descends to the surface.
    strategic: () =>
      createPlanetMode(camera, quality, world, canvas, centre => {
        descentCentre = centre
        modes.handleSignal({ kind: 'descend' })
      }),
    // The dune field underfoot. Zooming back out returns to orbit.
    surface: () =>
      createStrategicMode(camera, quality, world, canvas, descentCentre, () =>
        modes.handleSignal({ kind: 'ascend' }),
      ),
    conversation: () => createConversationMode(camera),
    location: () =>
      createLocationMode(
        canvas,
        () => modes.handleSignal({ kind: 'ascend' }),
        // Speaking is an engine action, so it goes over the bus rather than
        // being performed here — the render layer never mutates the world.
        id => { if (id === 'talk') EventBus.emit('player:talk', {}) },
      ),
    flight: () => createFlightMode(camera, quality),
  })
  return modes
}

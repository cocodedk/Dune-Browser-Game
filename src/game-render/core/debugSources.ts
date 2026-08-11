// src/game-render/core/debugSources.ts
// Everything window.__DUNE__ can see and poke.
//
// Split from ThreeContainer, which is meant to be about the frame loop and had
// become half debug plumbing. The affordances here exist because measuring is
// the only thing that has reliably found bugs in this project: several of them
// were systems that were fully built, fully tested, and never actually called.

import { world } from '../../game-engine/GameState'
import { hashState } from '../../game-engine/state/hash'
import { parityHash, parityView } from '../../game-engine/state/parityView'
import { advanceSeconds } from '../../game-engine/sim/advance'
import { EventBus } from '../../EventBus'
import { wireDebugHandle } from './wireDebugHandle'
import type { DebugHandle } from './DebugHandle'
import type { ModeManager } from './ModeManager'
import type { RendererHandle } from './Renderer'

interface AudioLike {
  debugState: () => Record<string, unknown>
}

export function wireDebugSources(
  debug: DebugHandle | null,
  handle: RendererHandle,
  modes: ModeManager,
  canvas: HTMLCanvasElement,
  audio: AudioLike,
): void {
  wireDebugHandle(debug, {
      audio: audio.debugState,
      setTime: seconds => { world.time = seconds },
      setVegetation: value => {
        for (const region of world.ecology) region.vegetation = value
      },
      worms: () => world.wormSightings.map(s => ({ ...s })),
      signWorm: fieldId => {
        world.wormSightings.push({ fieldId, atTime: world.time })
      },
      revealSites: () => {
        world.desertSites = world.desertSites.map(s => ({ ...s, discovered: true }))
      },
      teleport: villageId => {
        world.player.location = villageId
        world.player.state = 'idle'
        world.player.travelTarget = null
      },
      giveHarvester: () => {
        for (const group of world.troopGroups) {
          world.equipment.push({
            id: `debug_harvester_${group.id}`,
            kind: 'harvester',
            locationId: null,
            groupId: group.id,
            condition: 100,
          })
        }
      },
      giveEquipment: kind => {
        for (const group of world.troopGroups) {
          world.equipment.push({
            id: `debug_${kind}_${group.id}`,
            kind: kind as (typeof world.equipment)[number]['kind'],
            locationId: null,
            groupId: group.id,
            condition: 100,
          })
        }
      },
      endRun: ending => {
        world.goalAchieved = true
        world.ending = ending as typeof world.ending
      },
      player: () => ({
        state: world.player.state,
        location: world.player.location,
        travelTarget: world.player.travelTarget,
        spice: world.player.spice,
        inDialogue: world.dialogue !== null,
        difficulty: world.difficulty,
      }),
      scene: () => modes.scene,
      camera: () => modes.active?.camera ?? handle.camera,
      size: () => ({ width: canvas.clientWidth, height: canvas.clientHeight }),
  })
  // Not part of DebugSources: it needs no per-container plumbing (world is
  // already in scope here), and it must stay read-only by construction —
  // wireDebugHandle's assignments all come from mutation-capable sources.
  if (debug) debug.hashState = () => hashState(world)
  wireParityDebug(debug)
}

/**
 * WP04 chunk W4b's parity affordances — split from the block above (which
 * predates this chunk) since these four exist for one reason, not general
 * inspection: making e2e/parity.spec.ts's browser side reach the exact same
 * `world.time`/state the headless runner does at every comparison point.
 * See DebugHandle.ts's own doc on each field for the full citation.
 */
function wireParityDebug(debug: DebugHandle | null): void {
  if (!debug) return
  debug.parityHash = () => parityHash(world)
  debug.parityViewJSON = () => JSON.stringify(parityView(world))
  debug.pauseForParity = () => { world.paused = true }
  debug.advanceTo = targetSeconds => {
    world.paused = false
    advanceSeconds(targetSeconds - world.time)
    world.paused = true
    return parityHash(world)
  }
  debug.replay = entry => {
    // Deliberately loose: `entry` is a recorded sim/trace.ts tuple — its
    // event name is one of BusEvents' player-command keys at runtime, but
    // DebugHandle.ts types this bridge as plain [string, unknown] rather
    // than importing the full BusEvents union into the debug surface.
    // EventBus.emit(entry[0], entry[1]) still reaches the exact same
    // listener CommandWiring.ts's static `EventBus.on('player:pledge_sietch',
    // onPledge)` (etc.) registered — this is the production seam, not a
    // parallel one, only invoked here through a loosely-typed cast. Called
    // via `.call(EventBus, ...)`, not a bare extracted reference: emit is a
    // class method whose `this` is the EventBus singleton — an unbound call
    // loses that binding (measured: "Cannot read properties of undefined
    // (reading 'listeners')").
    const [name, payload] = entry
    const emit = EventBus.emit as (event: string, payload: unknown) => void
    emit.call(EventBus, name, payload)
    return parityHash(world)
  }
}

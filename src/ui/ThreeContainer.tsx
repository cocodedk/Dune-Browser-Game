// src/ui/ThreeContainer.tsx
// Mounts the three.js renderer and drives the frame loop. React's only job is
// to own the canvas element's lifetime — it never touches the scene graph and
// never re-renders per frame.

import { useEffect, useRef } from 'react'
import { Raycaster, Vector2, Vector3, Plane } from 'three'
import { world } from '../game-engine/GameState'
import { DAY_SECONDS } from '../game-engine/TimeSystem'
import { paletteForTime } from '../game-render/materials/Atmosphere'
import { initLoop, tick } from '../runtime/GameDriver'
import { wireCommands } from '../runtime/CommandWiring'
import { decideVisit } from '../runtime/VisitPolicy'
import { EventBus } from '../EventBus'
import { resolveQuality } from '../game-render/core/Quality'
import { createRenderer } from '../game-render/core/Renderer'
import { createModeManager } from '../game-render/core/modeFactories'
import { COMMAND_COLUMN_WIDTH } from './theme'
import {
  attachDebugHandle, detachDebugHandle, wireDebugHandle,
} from '../game-render/core/DebugHandle'
import { AudioManager } from '../game-render/audio/AudioManager'
import { startTravel } from '../game-engine/TravelSystem'
import { startDialogue } from '../game-engine/DialogueSystem'
import { pushEvent } from '../game-engine/EventSystem'

/** Dispatch a logical pick — the same path a raycast hit will take in Stage 03. */
function dispatchPick(id: string): void {
  const action = decideVisit(world, id)
  if (action.kind === 'travel') startTravel(action.targetId)
  else if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId)
  else if (action.kind === 'event') pushEvent('village_selected', action.message)
  if (action.kind !== 'none') EventBus.emit('village:selected', { villageId: id })
}

export default function ThreeContainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const quality = resolveQuality({
      cores: navigator.hardwareConcurrency ?? 0,
      devicePixelRatio: window.devicePixelRatio || 1,
    })

    const handle = createRenderer(canvas, quality, COMMAND_COLUMN_WIDTH)
    const modes = createModeManager(handle.camera, quality, world, canvas)
    modes.start('strategic')

    // Raycast a pointer position onto the y=0 plane, then let the active mode
    // resolve that world position to a location id. Same path __DUNE__.pick
    // takes, minus the ray.
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    const groundPlane = new Plane(new Vector3(0, 1, 0), 0)
    const hit = new Vector3()

    function onPointerDown(event: PointerEvent): void {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, handle.camera)
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return

      const id = modes.active?.pickAt?.(hit.x, hit.z)
      if (id) dispatchPick(id)
    }
    canvas.addEventListener('pointerdown', onPointerDown)

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return
      // Skipping is purely visual: the engine still lands the trip on time.
      if (modes.currentId === 'flight') modes.handleSignal({ kind: 'travel_complete' })
    }
    window.addEventListener('keydown', onKeyDown)

    const unwire = wireCommands()
    const audio = new AudioManager()
    audio.playAmbient('ambient_desert')
    const debug = attachDebugHandle(dispatchPick)
    wireDebugHandle(debug, {
      audio: audio.debugState,
      setTime: seconds => { world.time = seconds },
      setVegetation: value => {
        for (const region of world.ecology) region.vegetation = value
      },
      player: () => ({
        state: world.player.state,
        location: world.player.location,
        travelTarget: world.player.travelTarget,
        spice: world.player.spice,
        inDialogue: world.dialogue !== null,
      }),
      scene: () => modes.scene,
      camera: () => modes.active?.camera ?? handle.camera,
      size: () => ({ width: canvas.clientWidth, height: canvas.clientHeight }),
    })
    initLoop()

    let raf = 0
    let last = performance.now()
    let wasTraveling = false
    let wasInDialogue = false

    function frame(now: number): void {
      const deltaMs = Math.min(now - last, 100) // clamp after a tab-switch stall
      last = now

      tick(deltaMs)

      // Travel start/complete drive the cinematic. Read from world state
      // rather than a local timer so the two can never diverge.
      const traveling = world.player.state === 'traveling'
      if (traveling !== wasTraveling) {
        modes.handleSignal({ kind: traveling ? 'travel_start' : 'travel_complete' })
        wasTraveling = traveling
      }

      // Dialogue drives the conversation view from world state for the same
      // reason travel does: the view can never disagree with the engine.
      const inDialogue = world.dialogue !== null
      if (inDialogue !== wasInDialogue) {
        modes.handleSignal({ kind: inDialogue ? 'dialogue_start' : 'dialogue_end' })
        wasInDialogue = inDialogue
      }

      modes.update(deltaMs, world)

      // Exposure follows the hour. The palette has always computed this; until
      // now nothing read it, so tone mapping sat at a fixed 1.0 and noon
      // bleached the desert flat while midnight crushed it.
      handle.setExposure(paletteForTime(world.time, DAY_SECONDS).exposure)

      const scene = modes.scene
      if (scene) handle.render(scene, modes.active?.camera)
      else handle.clear() // no mode registered yet — still paint the base colour

      // Wind rises and falls with the sun, on the same clock as the sky.
      audio.setDayFraction((world.time % 60) / 60)

      if (debug) {
        debug.frame += 1
        debug.mode = modes.currentId
        debug.worldTime = world.time
        debug.renderInfo = handle.info()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      unwire()
      audio.dispose()
      modes.dispose()
      handle.dispose()
      detachDebugHandle()
    }
  }, [])

  return (
    <div id="scene-container" style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  )
}

const styles = {
  container: {
    // Fills the column rather than sitting at a fixed 800x500. The renderer
    // already resizes off this element via ResizeObserver, so the 3D view
    // follows the window with no further wiring.
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden' as const,
    background: '#120d07',
  },
  canvas: {
    display: 'block' as const,
    width: '100%',
    height: '100%',
  },
}

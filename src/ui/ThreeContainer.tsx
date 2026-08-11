// src/ui/ThreeContainer.tsx
// Mounts the three.js renderer and drives the frame loop. React's only job is
// to own the canvas element's lifetime — it never touches the scene graph and
// never re-renders per frame.

import { useEffect, useRef } from 'react'
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
import { attachDebugHandle, detachDebugHandle } from '../game-render/core/DebugHandle'
import { wireDebugSources } from '../game-render/core/debugSources'
import { AudioManager } from '../game-render/audio/AudioManager'
import { startTravel } from '../game-engine/TravelSystem'
import { startDialogue } from '../game-engine/DialogueSystem'
import { pushEvent } from '../game-engine/EventSystem'
import { attachSceneInput } from './sceneInput'

/** Dispatch a logical pick — the same path a raycast hit will take in Stage 03. */
function dispatchPick(id: string): void {
  const action = decideVisit(world, id)
  if (action.kind === 'travel') startTravel(action.targetId)
  else if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId, action.nodeId)
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

    // Pointer picking + Escape/Skip — see ui/sceneInput.ts for why this
    // moved out (chunk W3d's flight skip-gate needed the room).
    const sceneInput = attachSceneInput(canvas, handle.camera, modes, dispatchPick)

    const unwire = wireCommands()
    const audio = new AudioManager()
    audio.playAmbient('ambient_desert')
    const debug = attachDebugHandle(dispatchPick)
    wireDebugSources(debug, handle, modes, canvas, audio)
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
      // Timestamps the flight skip gate in real time — see sceneInput's own doc.
      sceneInput.noteTravelState(traveling)

      // Dialogue drives the conversation view from world state for the same
      // reason travel does: the view can never disagree with the engine.
      const inDialogue = world.dialogue !== null
      if (inDialogue !== wasInDialogue) {
        modes.handleSignal({ kind: inDialogue ? 'dialogue_start' : 'dialogue_end' })
        wasInDialogue = inDialogue
      }

      modes.update(deltaMs, world)

      // One palette, read for two things. Exposure follows the hour, as it
      // always has; the same palette also feeds updateEnvironment, which
      // PMREMs the sky dome's own gradient into scene.environment so metals
      // reflect sky-above/sand-below instead of rendering black or leaning on
      // an emissive workaround. The bake itself is throttled internally to
      // real palette changes — see env/skyEnvironment.ts — so calling this
      // every frame costs nothing on the frames that do not rebake.
      const scene = modes.scene
      const palette = paletteForTime(world.time, DAY_SECONDS)
      // A mode may pin exposure for its own scene (scene.userData.exposurePin)
      // when it has real lit materials tuned against a fixed value rather than
      // the hour curve — the sietch interior is the current example
      // (sietchGate.ts). modes.update() above already ran sync() for this
      // frame, so the pin is current before it is read here.
      const exposurePin = scene?.userData.exposurePin as number | undefined
      handle.setExposure(exposurePin ?? palette.exposure)

      if (scene) {
        handle.updateEnvironment(scene, palette)
        handle.render(scene, modes.active?.camera)
      } else {
        handle.clear() // no mode registered yet — still paint the base colour
      }

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
      sceneInput.dispose()
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

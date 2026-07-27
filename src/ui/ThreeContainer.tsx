// src/ui/ThreeContainer.tsx
// Mounts the three.js renderer and drives the frame loop. React's only job is
// to own the canvas element's lifetime — it never touches the scene graph and
// never re-renders per frame.

import { useEffect, useRef } from 'react'
import { world } from '../game-engine/GameState'
import { initLoop, tick } from '../runtime/GameDriver'
import { wireCommands } from '../runtime/CommandWiring'
import { decideVisit } from '../runtime/VisitPolicy'
import { EventBus } from '../EventBus'
import { resolveQuality } from '../game-render/core/Quality'
import { createRenderer } from '../game-render/core/Renderer'
import { ModeManager } from '../game-render/core/ModeManager'
import { createStrategicMode } from '../game-render/modes/strategic/StrategicMode'
import { attachDebugHandle, detachDebugHandle } from '../game-render/core/DebugHandle'
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

    const handle = createRenderer(canvas, quality)
    const modes = new ModeManager({
      strategic: () => createStrategicMode(handle.camera, quality),
    })
    modes.start('strategic')

    const unwire = wireCommands()
    const debug = attachDebugHandle(dispatchPick)
    initLoop()

    let raf = 0
    let last = performance.now()

    function frame(now: number): void {
      const deltaMs = Math.min(now - last, 100) // clamp after a tab-switch stall
      last = now

      tick(deltaMs)
      modes.update(deltaMs, world)

      const scene = modes.scene
      if (scene) handle.render(scene)
      else handle.clear() // no mode registered yet — still paint the base colour

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
      unwire()
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
    width: 800,
    height: 500,
    flexShrink: 0,
    border: '1px solid #3d2b10',
    borderRadius: 4,
    overflow: 'hidden' as const,
    background: '#120d07',
  },
  canvas: {
    display: 'block' as const,
    width: '100%',
    height: '100%',
  },
}

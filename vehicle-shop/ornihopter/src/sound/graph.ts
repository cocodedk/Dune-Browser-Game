// vehicle-shop/ornihopter/src/sound/graph.ts
// The Web Audio side. It owns no opinions: params.ts decides what the craft
// sounds like, and this applies those numbers to nodes. The split is the whole
// reason the mix is unit-tested at all — everything below this line needs an
// AudioContext and can only ever be smoke-checked in a live browser.
//
// Signal path, once, so it can be read without tracing connect() calls:
//
//   strokes ─┐
//            ├─> cabin low-pass ──> cabin gain ──> master gain ──> destination
//   engine ──┘   (armored tub)      (level drop)   (M-key mute)

import { createNoiseBuffer } from './noise'
import { createEngineVoice } from './engineVoice'
import type { EngineVoice } from './engineVoice'
import { fireStroke } from './strokeVoice'
import type { SoundParams } from './params'

export interface AudioReadback {
  contextState: string
  sampleRate: number
  currentTime: number
  muted: boolean
  /** Live AudioParam values read off the nodes themselves, not the params
   *  object — this is what proves the graph is actually carrying the mix. */
  nodes: Record<string, number>
  topology: string[]
}

export interface SoundGraph {
  apply(params: SoundParams): void
  setMuted(muted: boolean): void
  read(): AudioReadback
  dispose(): void
}

/** Cabin filter time constant. Fast enough to feel like the camera cut, slow
 *  enough that the filter sweep is a move and not a click. */
const CABIN_TAU = 0.05

export function createSoundGraph(ctx: AudioContext): SoundGraph {
  const noise = createNoiseBuffer(ctx)
  const now = ctx.currentTime

  const master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)

  const cabinGain = ctx.createGain()
  cabinGain.gain.value = 0.9
  cabinGain.connect(master)

  const cabin = ctx.createBiquadFilter()
  cabin.type = 'lowpass'
  cabin.frequency.value = 17000
  // Gentle. A resonant peak at the corner would whistle every time the camera
  // moved between the tub and the open air.
  cabin.Q.value = 0.7
  cabin.connect(cabinGain)

  const strokeBus = ctx.createGain()
  strokeBus.gain.value = 1
  strokeBus.connect(cabin)

  const engine: EngineVoice = createEngineVoice(ctx, noise, cabin)
  let muted = false
  let strokes = 0

  return {
    apply(params) {
      const at = ctx.currentTime
      engine.apply(params, at)
      cabin.frequency.setTargetAtTime(params.cabinCutoffHz, at, CABIN_TAU)
      cabinGain.gain.setTargetAtTime(params.cabinGain, at, CABIN_TAU)
      if (params.strokeTrigger) {
        fireStroke(ctx, noise, strokeBus, params, at)
        strokes++
      }
    },
    setMuted(next) {
      muted = next
      // Ramped, not assigned: setting gain.value to 0 mid-waveform is a click.
      master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02)
    },
    read() {
      return {
        contextState: ctx.state,
        sampleRate: ctx.sampleRate,
        currentTime: Number(ctx.currentTime.toFixed(3)),
        muted,
        nodes: {
          masterGain: master.gain.value,
          cabinGain: cabinGain.gain.value,
          cabinCutoffHz: cabin.frequency.value,
          engineGain: engine.grind.gain.value,
          engineLowpassHz: engine.lowpass.frequency.value,
          whineGain: engine.whine.gain.value,
          bedGain: engine.bed.gain.value,
          strokesFired: strokes,
          startedAt: now,
        },
        topology: [
          'strokeBus -> cabinLowpass',
          'engineGrind -> engineLowpass -> cabinLowpass',
          'engineWhine -> cabinLowpass',
          'engineBed(noise->bandpass) -> cabinLowpass',
          'cabinLowpass -> cabinGain -> masterGain -> destination',
        ],
      }
    },
    dispose() {
      engine.dispose()
      for (const node of [strokeBus, cabin, cabinGain, master]) node.disconnect()
    },
  }
}

// vehicle-shop/ornihopter/src/sound/engineVoice.ts
// The continuous turbine layer: a grind, a whine and a bed, all running for
// the life of the session and only ever gain- and pitch-modulated. Nothing is
// started or stopped per frame, which is what keeps it seamless under a beat
// that comes and goes.
//
// The whine is locked to the grind's own fundamental by an integer-ish ratio
// rather than given its own absolute frequency. An unrelated whine reads as a
// SECOND machine somewhere off-screen; a harmonically locked one reads as the
// top end of the machine you are sitting in.

import { startNoise } from './noise'
import type { SoundParams } from './params'

export interface EngineVoice {
  grind: GainNode
  lowpass: BiquadFilterNode
  whine: GainNode
  bed: GainNode
  apply(params: SoundParams, now: number): void
  dispose(): void
}

/** Time constants for setTargetAtTime. Long enough that a throttle sweep
 *  glides instead of stepping, short enough that it still feels connected. */
const GAIN_TAU = 0.06
const PITCH_TAU = 0.09

export function createEngineVoice(
  ctx: AudioContext,
  noise: AudioBuffer,
  destination: AudioNode
): EngineVoice {
  const now = ctx.currentTime
  const grind = ctx.createGain()
  const lowpass = ctx.createBiquadFilter()
  const whine = ctx.createGain()
  const bed = ctx.createGain()

  grind.gain.value = 0
  whine.gain.value = 0
  bed.gain.value = 0
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 500
  lowpass.Q.value = 0.9

  grind.connect(lowpass).connect(destination)
  whine.connect(destination)
  bed.connect(destination)

  // The grind: two saws a few cents apart so they beat against each other
  // (one machine, two shafts, never quite synchronised) plus a sine an octave
  // down for the mass underneath.
  const sawA = ctx.createOscillator()
  const sawB = ctx.createOscillator()
  const sub = ctx.createOscillator()
  sawA.type = 'sawtooth'
  sawB.type = 'sawtooth'
  sawB.detune.value = 11
  sub.type = 'sine'
  const subGain = ctx.createGain()
  subGain.gain.value = 0.55
  sawA.connect(grind)
  sawB.connect(grind)
  sub.connect(subGain).connect(grind)

  // The whine: the fundamental's upper partial, plus a fifth above it at a
  // third of the level for the shimmer a single sine cannot give.
  const whineA = ctx.createOscillator()
  const whineB = ctx.createOscillator()
  whineA.type = 'sine'
  whineB.type = 'triangle'
  const whineBGain = ctx.createGain()
  whineBGain.gain.value = 0.3
  whineA.connect(whine)
  whineB.connect(whineBGain).connect(whine)

  // The bed: band-limited noise, the combustor behind everything.
  const bedSource = startNoise(ctx, noise, now)
  const bedBand = ctx.createBiquadFilter()
  bedBand.type = 'bandpass'
  bedBand.frequency.value = 1450
  bedBand.Q.value = 1.1
  bedSource.connect(bedBand).connect(bed)

  const oscillators = [sawA, sawB, sub, whineA, whineB]
  for (const osc of oscillators) osc.start(now)

  return {
    grind,
    lowpass,
    whine,
    bed,
    apply(params, at) {
      grind.gain.setTargetAtTime(params.engineGain, at, GAIN_TAU)
      whine.gain.setTargetAtTime(params.whineGain, at, GAIN_TAU)
      bed.gain.setTargetAtTime(params.bedGain, at, GAIN_TAU)
      lowpass.frequency.setTargetAtTime(params.engineLowpassHz, at, PITCH_TAU)
      sawA.frequency.setTargetAtTime(params.engineHz, at, PITCH_TAU)
      sawB.frequency.setTargetAtTime(params.engineHz, at, PITCH_TAU)
      sub.frequency.setTargetAtTime(params.engineHz * 0.5, at, PITCH_TAU)
      whineA.frequency.setTargetAtTime(params.whineHz, at, PITCH_TAU)
      whineB.frequency.setTargetAtTime(params.whineHz * 1.5, at, PITCH_TAU)
    },
    dispose() {
      for (const osc of oscillators) osc.stop()
      bedSource.stop()
      for (const node of [grind, lowpass, whine, bed]) node.disconnect()
    },
  }
}

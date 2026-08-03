// vehicle-shop/ornihopter/src/sound/strokeVoice.ts
// One wing stroke, fired and forgotten. Built per stroke rather than gated
// from a permanent voice because an envelope that has to restart cleanly
// mid-decay is exactly where clicks come from, and at four beats a second the
// node churn is nothing.
//
// A stroke is TWO things landing together, and that is the whole timbre
// argument. The noise burst swept DOWN through a band-pass is the air being
// thrown — high and thin as the wing bites, dropping as the mass of air lets
// go. The short low body tone beneath it is the spar taking the load: a
// triangle, not a sine, because the odd harmonics are what make it read as
// something wooden and stressed rather than a kick drum.

import { startNoise } from './noise'
import type { SoundParams } from './params'

/** Below this a stroke would be inaudible; the tail of a spool-down reaches
 *  it, and building nodes for silence is pure waste. */
const AUDIBLE_GAIN = 5e-4

/** Never ramp exponentially to zero — Web Audio forbids it. */
const FLOOR = 1e-4

export function fireStroke(
  ctx: AudioContext,
  noise: AudioBuffer,
  destination: AudioNode,
  params: SoundParams,
  at: number
): void {
  if (params.strokeGain < AUDIBLE_GAIN) return
  const start = Math.max(at, ctx.currentTime)
  const peak = start + params.strokeAttack
  const end = peak + params.strokeDecay

  air(ctx, noise, destination, params, start, peak, end)
  body(ctx, destination, params, start, end)
}

/** The air: a burst of pink noise through a band-pass that falls as it decays. */
function air(
  ctx: AudioContext,
  noise: AudioBuffer,
  destination: AudioNode,
  params: SoundParams,
  start: number,
  peak: number,
  end: number
): void {
  const source = startNoise(ctx, noise, start)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  // Broad. A narrow band is a whistle; this has to stay air.
  band.Q.value = 0.85
  band.frequency.setValueAtTime(params.strokeBandHz, start)
  band.frequency.exponentialRampToValueAtTime(params.strokeBandEndHz, end)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(FLOOR, start)
  envelope.gain.linearRampToValueAtTime(params.strokeGain, peak)
  envelope.gain.exponentialRampToValueAtTime(FLOOR, end)

  source.connect(band).connect(envelope).connect(destination)
  source.stop(end + 0.02)
  source.onended = () => {
    source.disconnect()
    band.disconnect()
    envelope.disconnect()
  }
}

/** The body: a short falling triangle, the leading-edge spar under load. */
function body(
  ctx: AudioContext,
  destination: AudioNode,
  params: SoundParams,
  start: number,
  end: number
): void {
  const tone = ctx.createOscillator()
  tone.type = 'triangle'
  tone.frequency.setValueAtTime(params.bodyHz, start)
  // A small downward bend, the pitch drop of something heavy being loaded and
  // then released. Big bends read as a cartoon boing.
  tone.frequency.exponentialRampToValueAtTime(params.bodyHz * 0.74, start + params.bodyDecay)

  const envelope = ctx.createGain()
  const stop = start + params.bodyDecay
  envelope.gain.setValueAtTime(FLOOR, start)
  envelope.gain.linearRampToValueAtTime(Math.max(params.bodyGain, FLOOR), start + 0.012)
  envelope.gain.exponentialRampToValueAtTime(FLOOR, stop)

  tone.connect(envelope).connect(destination)
  tone.start(start)
  tone.stop(Math.min(stop, end) + 0.02)
  tone.onended = () => {
    tone.disconnect()
    envelope.disconnect()
  }
}

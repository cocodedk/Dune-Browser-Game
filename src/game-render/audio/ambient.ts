// src/game-render/audio/ambient.ts
// Procedurally synthesised desert ambience.
//
// Generated in WebAudio rather than streamed from a file, so it needs no asset
// pipeline, adds nothing to the bundle, and never fails on a missing download.
// A desert is mostly wind, and wind is filtered noise — which is one of the
// few things synthesis does better than a short looping sample, because it
// never repeats and so never announces its loop point.

export interface AmbientBed {
  /** Connect the bed to a destination and start it. */
  start(destination: AudioNode): void
  /** Track the hour: 0 is midnight, 0.5 noon. Wind rises with the sun. */
  setDayFraction(fraction: number): void
  stop(): void
}

const NOISE_SECONDS = 4

/** A few seconds of white noise, looped. The filter does the character work. */
function buildNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * NOISE_SECONDS
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  // Brown-ish noise: integrating white noise tilts energy toward the low end,
  // which is what makes it read as wind over sand rather than as static.
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export function createAmbientBed(context: AudioContext): AmbientBed {
  const noise = context.createBufferSource()
  noise.buffer = buildNoiseBuffer(context)
  noise.loop = true

  // Main wind band.
  const windFilter = context.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 420
  windFilter.Q.value = 0.7

  const windGain = context.createGain()
  windGain.gain.value = 0.55

  // A second, higher band that swells independently — two uncorrelated
  // envelopes are what stop the bed sounding like a single static hiss.
  const gustFilter = context.createBiquadFilter()
  gustFilter.type = 'bandpass'
  gustFilter.frequency.value = 1400
  gustFilter.Q.value = 1.4

  const gustGain = context.createGain()
  gustGain.gain.value = 0.0

  // Slow LFO driving the gusts. Deliberately not a round number of seconds, so
  // it never phase-locks with anything the player can consciously track.
  const lfo = context.createOscillator()
  lfo.frequency.value = 0.037
  const lfoDepth = context.createGain()
  lfoDepth.gain.value = 0.22

  // Low drone for the sense of open space.
  const drone = context.createOscillator()
  drone.type = 'sine'
  drone.frequency.value = 58
  const droneGain = context.createGain()
  droneGain.gain.value = 0.11

  noise.connect(windFilter).connect(windGain)
  noise.connect(gustFilter).connect(gustGain)
  lfo.connect(lfoDepth).connect(gustGain.gain)
  drone.connect(droneGain)

  let started = false

  return {
    start(destination: AudioNode): void {
      if (started) return
      started = true
      windGain.connect(destination)
      gustGain.connect(destination)
      droneGain.connect(destination)
      noise.start()
      lfo.start()
      drone.start()
    },

    setDayFraction(fraction: number): void {
      if (!started) return
      const f = ((fraction % 1) + 1) % 1
      // Peaks at noon: the desert is loudest when it is hottest.
      const heat = Math.max(0, -Math.cos(f * Math.PI * 2))
      const now = context.currentTime

      windGain.gain.setTargetAtTime(0.38 + heat * 0.34, now, 3)
      windFilter.frequency.setTargetAtTime(360 + heat * 260, now, 3)
      // Night keeps the drone but loses the gusts, which reads as stillness.
      droneGain.gain.setTargetAtTime(0.14 - heat * 0.05, now, 3)
    },

    stop(): void {
      if (!started) return
      started = false
      try {
        noise.stop()
        lfo.stop()
        drone.stop()
      } catch {
        // Already stopped — nothing to do.
      }
      windGain.disconnect()
      gustGain.disconnect()
      droneGain.disconnect()
    },
  }
}

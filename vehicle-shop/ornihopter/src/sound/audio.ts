// vehicle-shop/ornihopter/src/sound/audio.ts
// What main.ts talks to. Holds the pure clock, gates the AudioContext behind a
// user gesture, and owns the mute.
//
// AUTOPLAY. Every browser refuses to start an AudioContext that no gesture
// asked for, and one created early sits in 'suspended' forever while the frame
// loop happily writes parameters into a graph nobody can hear. So the context
// is not created at load at all: the first keydown, pointerdown or touchstart
// builds it and resumes it. Until then update() still advances the pure clock,
// so when the sound does arrive it arrives at the craft's CURRENT state — mid
// beat, mid throttle — rather than restarting the mix from parked. That is the
// muted-until-gesture fallback: silent, but never out of step.

import { createSoundClock, advanceSound } from './params'
import type { SoundCamera, SoundClock, SoundFlight, SoundParams } from './params'
import { createSoundGraph } from './graph'
import type { AudioReadback, SoundGraph } from './graph'

export interface ThopterAudio {
  update(flight: SoundFlight, camera: SoundCamera, dt: number): void
  /** Returns the new muted state. */
  toggleMute(): boolean
  isMuted(): boolean
  /** Live instrument readback. Before the first gesture the graph half is
   *  null and only the params are meaningful. */
  read(): { params: SoundParams; graph: AudioReadback | null; awaitingGesture: boolean }
  dispose(): void
}

declare global {
  interface Window {
    __THOPTER_AUDIO__?: ThopterAudio
  }
}

const GESTURES: string[] = ['pointerdown', 'touchstart', 'keydown']

export function createThopterAudio(initialCamera: SoundCamera = 'pilot'): ThopterAudio {
  let clock: SoundClock = createSoundClock(initialCamera)
  let params: SoundParams = advanceSound(clock, { throttle: 0, beatPhase: 0, beatHz: 0 }, initialCamera, 0).params
  let ctx: AudioContext | null = null
  let graph: SoundGraph | null = null
  let muted = false

  const start = (): void => {
    if (!ctx) {
      ctx = new AudioContext()
      graph = createSoundGraph(ctx)
      graph.setMuted(muted)
    }
    if (ctx.state !== 'running') void ctx.resume()
  }

  const onGesture = (): void => {
    if (ctx && ctx.state === 'running') return
    start()
  }
  for (const type of GESTURES) window.addEventListener(type, onGesture, { passive: true })

  const audio: ThopterAudio = {
    update(flight, camera, dt) {
      const step = advanceSound(clock, flight, camera, dt)
      clock = step.clock
      params = step.params
      graph?.apply(params)
    },
    toggleMute() {
      muted = !muted
      graph?.setMuted(muted)
      // A mute pressed before the first gesture IS that gesture, so the craft
      // does not go silent and then stay silent for the rest of the session.
      start()
      return muted
    },
    isMuted() {
      return muted
    },
    read() {
      return {
        params,
        graph: graph ? graph.read() : null,
        awaitingGesture: ctx === null || ctx.state !== 'running',
      }
    },
    dispose() {
      for (const type of GESTURES) window.removeEventListener(type, onGesture)
      graph?.dispose()
      void ctx?.close()
      ctx = null
      graph = null
    },
  }

  window.__THOPTER_AUDIO__ = audio
  return audio
}

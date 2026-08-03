// vehicle-shop/ornihopter/src/sound/noise.ts
// The air. One looping buffer of pink-ish noise, generated once and shared by
// every voice that needs texture — the stroke burst and the engine's combustor
// bed. Pink rather than white because white noise reads as a hiss or a cymbal;
// the -3 dB/octave tilt is what makes a burst of it read as MOVING AIR, which
// is the entire point of the wing stroke.
//
// Browser-side: this is the first module in the sound layer that needs an
// AudioContext, so nothing here is reachable from a unit test. See params.ts.

/** Paul Kellet's economy pink filter — six one-poles summed. Cheap, and this
 *  runs once at startup rather than per sample per frame. */
export function fillPink(data: Float32Array): void {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0

  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
}

/**
 * Two seconds is long enough that a looping bed never sounds like a loop, and
 * short enough to build in a couple of milliseconds at boot.
 */
export function createNoiseBuffer(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  fillPink(buffer.getChannelData(0))
  return buffer
}

/** A looping noise source started at a random offset, so two strokes fired
 *  back to back never play the identical slice of buffer. */
export function startNoise(ctx: BaseAudioContext, buffer: AudioBuffer, at: number): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start(at, Math.random() * buffer.duration)
  return source
}

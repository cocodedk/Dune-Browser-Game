// vehicle-shop/ornihopter/src/sound/tuning.ts
// Every number the ornithopter's voice is made of, in one file, for the same
// reason flight/constants.ts exists: a later mix pass gets one file to open.
//
// THE CHARACTER, in one paragraph. A Dune thopter is a heavy machine wearing
// insect wings, so the beat is authored as two things arriving together and
// not as one "whoosh": a broadband noise burst swept DOWN through a band-pass
// (the air being thrown, which is why the band opens high and closes low), and
// a short low body tone under it (the spar taking the load — the woody, leathery
// part). The turbine is a pair of detuned saws with a low-passed grind, plus one
// harmonically-locked partial well up the series for the whine. Locked to the
// same fundamental on purpose: an unrelated whine reads as a second aircraft.

/** The wing-beat stroke. */
export const STROKE = {
  /** Peak envelope gain, idle -> full throttle. */
  gainMin: 0.16,
  gainMax: 0.42,
  /** Band-pass centre at the top of the burst, Hz. Lower = a bigger air mass. */
  bandHi: 900,
  bandLo: 620,
  /** Where the sweep lands by the end of the tail, Hz. */
  endHi: 300,
  endLo: 165,
  /** Attack, seconds. Harder at throttle: the stroke bites sooner. */
  attackIdle: 0.055,
  attackFull: 0.022,
  /** Decay as a fraction of one beat period, so strokes never smear. */
  decayShare: 0.55,
  decayMin: 0.08,
  decayMax: 0.42,
} as const

/** The woody body tone that lands with the stroke. */
export const BODY = {
  hzMin: 58,
  hzMax: 82,
  gainMin: 0.1,
  gainMax: 0.26,
  decayShare: 0.3,
  decayMin: 0.05,
  decayMax: 0.26,
} as const

/** The continuous turbine layer. */
export const ENGINE = {
  /** Throttle below which the machine is shut down rather than idling. */
  runThrottle: 0.05,
  /** Fundamental of the grind, Hz. */
  hzMin: 38,
  hzMax: 92,
  /** Level. gainIdle is the floor a running engine never drops below. */
  gainIdle: 0.03,
  gainMax: 0.115,
  /** Low-pass over the saw pair — this is what keeps it a grind, not a buzz. */
  lowpassMin: 420,
  lowpassMax: 1150,
  /** The whine partial, as a multiple of the fundamental. */
  whineRatioMin: 16,
  whineRatioMax: 23,
  whineGainMin: 0.012,
  whineGainMax: 0.05,
  /** Filtered-noise combustor bed under everything. */
  bedGainMin: 0.008,
  bedGainMax: 0.032,
} as const

/** The listener: open air outside, an armored tub inside. */
export const CABIN = {
  exteriorCutoffHz: 17000,
  cockpitCutoffHz: 620,
  exteriorGain: 0.9,
  cockpitGain: 0.52,
  /** Seconds for the camera crossfade to close most of the gap. */
  crossfadeTau: 0.22,
} as const

/** Guards on the inputs, so one poisoned frame cannot reach an AudioParam. */
export const INPUT_LIMITS = {
  maxDt: 0.1,
  /** Well above BEAT_HZ_MAX; only here to bound a corrupted state. */
  maxBeatHz: 32,
} as const

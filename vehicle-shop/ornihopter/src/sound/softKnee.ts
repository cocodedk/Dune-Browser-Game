// vehicle-shop/ornihopter/src/sound/softKnee.ts
// One shape, reused by both the whine's frequency and its own gain (see
// engineParams in params.ts): bend a value toward a ceiling once it passes a
// knee, softly enough that a throttle sweep leaves nothing for the ear to
// catch on.

/** Below `knee`: the identity, value passes through untouched. Above it:
 *  value bends toward `ceiling`, approaching it asymptotically and never
 *  reaching it. The exponential's rate constant is `ceiling - knee`, which is
 *  exactly what makes this C1-continuous at the knee — the slope just above
 *  matches the identity's slope of 1 just below, so there is no kink for a
 *  throttle sweep to cross. Composed with any strictly increasing input (raw
 *  Hz, raw gain — both rise with throttle) the result stays strictly
 *  increasing too: this softens a curve without ever flattening it. */
export function softKnee(value: number, knee: number, ceiling: number): number {
  if (value <= knee) return value
  const headroom = ceiling - knee
  return ceiling - headroom * Math.exp(-(value - knee) / headroom)
}

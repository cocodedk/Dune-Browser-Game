// vehicle-shop/harvester/src/crawler/constants.ts
// The machine's dynamic limits. Pure numbers, no imports — the same pattern
// as the ornithopter's flight constants, so the crawler core stays free of
// three.js and of spec.ts's geometry.

export const MAX_SPEED = 8
/** Reverse is deliberately slower than forward: a harvester backs with care. */
export const MAX_REVERSE = 3
/** Heavy machine: it takes seconds to reach its crawl. */
export const MAX_ACCEL = 1.5
/** Track-speed difference at full steer, m/s. */
export const STEER_DIFF = 3.5
/** Largest single step main.ts may pass; a background tab cannot fling it. */
export const MAX_DT = 0.1

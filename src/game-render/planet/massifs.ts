// src/game-render/planet/massifs.ts
// PURE: the rock the sietches are cut into.
//
// Fremen sietches are caves in rock — the Shield Wall, Habbanya Ridge, the Red
// Chasm — never open sand, because open sand is where the makers are. Until
// now settlement placement and terrain generation were independent, so a
// sietch could sit in the middle of an erg.
//
// Rock is added where the settlements are, rather than settlements moved to
// where noise happened to put rock. The positions are authored gameplay data
// with four consumers — region adjacency pacing, the surface view's
// neighbourhood radius, travel range, and the spice fields authored beside
// them — and rewriting them to chase a noise field would silently rewrite all
// of it. Data drives terrain, never the reverse. It is also the honest
// direction: the rock is *why* anyone settled there.
//
// The uplift is added to the continental field rather than to the biome
// weights. That is the anti-blob mechanism, not a convenience: the visible
// rock edge is the level set of noise-plus-uplift, so the same fBm that draws
// every other rock province draws these coastlines too. The uplift only
// decides *that* there is rock here, never what shape it is.

export interface Massif {
  lat: number
  lon: number
  /** Angular radius in degrees at which uplift reaches zero. */
  extentDeg: number
  /** Peak addition to the continental field. */
  strength: number
  /** Ridge orientation, radians. */
  bearing: number
  /** Elongation along the ridge. Habbanya *Ridge*, Red *Wall* — lines, not domes. */
  stretch: number
}

export interface MassifSource {
  id: string
  kind: string
  position: { x: number; y: number }
}

/** Inside this fraction of the extent the uplift is flat — a plateau, then a shoulder. */
const PLATEAU = 0.35

/** Settlement kinds that get rock, and how much of it. */
const KIND_STRENGTH: Record<string, number> = {
  sietch: 1,
  // Arrakeen sits against the Shield Wall and Carthag on its own rock, but
  // neither is a cave city, so they get a lower line.
  palace: 0.6,
  station: 0.55,
}

/** Deterministic string hash. Independent of the terrain seed on purpose. */
export function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (h >>> 0) / 0xffffffff
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Build a massif per settlement.
 *
 * @param toLatLon Projection from the authored canvas position to degrees.
 * @param overrides Per-id strength multiplier, for places that should have a
 *   low rock line rather than a mountain.
 */
export function massifsForSettlements(
  sources: readonly MassifSource[],
  toLatLon: (p: { x: number; y: number }) => { lat: number; lon: number },
  overrides: Readonly<Record<string, number>> = {},
): Massif[] {
  const out: Massif[] = []

  for (const source of sources) {
    const kindScale = KIND_STRENGTH[source.kind]
    if (kindScale === undefined) continue

    // Every massif differs in size, shape and orientation, so eleven of them
    // cannot read as a ring of identical circles.
    const h = hashId(source.id)
    const h2 = hashId(`${source.id}:b`)
    const { lat, lon } = toLatLon(source.position)

    out.push({
      lat,
      lon,
      extentDeg: 5.5 + h * 3.5,
      strength: (0.32 + h2 * 0.08) * kindScale * (overrides[source.id] ?? 1),
      bearing: h2 * Math.PI,
      stretch: 1.6 + h * 0.8,
    })
  }
  return out
}

/** Shortest signed longitude difference, in degrees. Longitude wraps. */
function lonDelta(from: number, to: number): number {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/**
 * Uplift to add to the continental field at a point.
 *
 * Massifs compose by maximum, never by sum — the same reasoning the vegetation
 * layer uses. Summing overlapping influences clips them into one featureless
 * plateau.
 */
export function massifUplift(
  latDeg: number,
  lonDeg: number,
  massifs: readonly Massif[],
): number {
  let strongest = 0

  for (const m of massifs) {
    // Tangent-plane offsets, with longitude foreshortened by latitude.
    const east = lonDelta(m.lon, lonDeg) * Math.cos((m.lat * Math.PI) / 180)
    const north = latDeg - m.lat

    // Rotate into the ridge's frame and stretch along it.
    const cos = Math.cos(m.bearing)
    const sin = Math.sin(m.bearing)
    const along = (east * cos + north * sin) / m.stretch
    const across = -east * sin + north * cos

    const d = Math.hypot(along, across) / m.extentDeg
    if (d >= 1) continue

    const lift = m.strength * smoothstep(1, PLATEAU, d)
    if (lift > strongest) strongest = lift
  }
  return strongest
}

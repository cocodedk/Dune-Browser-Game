// src/game-engine/desert/sites.ts
// PURE deep-desert sites: what is out there past the inhabited band.
//
// Measured, the eight sietches occupy 9.9% of the planet's surface. The rest
// had terrain and nothing else, which is honest to the books — Arrakis really
// is almost all empty desert — but reads as unfinished rather than as vast.
//
// These are what a prospecting crew can find out there. Deterministic from a
// seed rather than random at discovery time, so the same game always holds the
// same secrets and a save can be reloaded without the desert reshuffling.

export type SiteKind = 'spice_blow' | 'wreck' | 'outcrop' | 'wormsign' | 'cache'

export interface DesertSite {
  id: string
  kind: SiteKind
  /** Degrees. Negative is south. */
  latitude: number
  /** Degrees. Negative is west of the inhabited meridian. */
  longitude: number
  /** Days of travel from the nearest sietch — the cost of going. */
  distanceDays: number
  discovered: boolean
}

export interface SiteYield {
  spice: number
  /** Equipment salvaged, by kind. */
  salvage: string | null
  /** Whether standing here risks a worm. */
  dangerous: boolean
  /** One line for the event log. */
  message: string
}

/** What each kind is worth, and what it costs to stand there. */
const KIND_YIELD: Record<SiteKind, Omit<SiteYield, 'message'>> = {
  // A fresh blow: the richest thing in the desert, and the loudest. Worms
  // come to a blow, which is the whole reason it is still there to find.
  spice_blow: { spice: 260, salvage: null, dangerous: true },
  // Someone else's harvester, half-swallowed. The Harkonnens lost a great
  // many of these and did not go back for them.
  wreck: { spice: 40, salvage: 'harvester', dangerous: false },
  // Bare rock. Worthless and safe, which on Arrakis makes it valuable: a
  // crew can camp here without drumming the sand.
  outcrop: { spice: 0, salvage: null, dangerous: false },
  // Not a place. A warning, and the desert has plenty.
  wormsign: { spice: 0, salvage: null, dangerous: true },
  // A Fremen water cache. Taking it is a choice with consequences.
  cache: { spice: 90, salvage: 'stilltent', dangerous: false },
}

const MESSAGES: Record<SiteKind, string> = {
  spice_blow: 'A blow, still steaming. Take it fast or not at all.',
  wreck: 'A harvester, half-swallowed. The crew did not get out.',
  outcrop: 'Bare rock in an ocean of sand. A crew can sleep here.',
  wormsign: 'Drum sand, and a track a hundred metres wide. Turn back.',
  cache: 'A sealed cache. Fremen water, and someone will miss it.',
}

export function siteYield(kind: SiteKind): SiteYield {
  return { ...KIND_YIELD[kind], message: MESSAGES[kind] }
}

/** Deterministic hash, so a seed always produces the same desert. */
function hash(seed: number, index: number): number {
  let h = (seed ^ (index * 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

/**
 * Scatter sites across the deep desert.
 *
 * Deliberately outside the inhabited band, which spans roughly 55 degrees of
 * longitude and 32 of latitude either side of zero. Nothing is placed on the
 * polar caps: there is no spice under ice and no reason to walk there.
 */
export function generateSites(seed: number, count = 14): DesertSite[] {
  const kinds: SiteKind[] = [
    'spice_blow', 'wreck', 'outcrop', 'wormsign', 'cache',
    'wreck', 'outcrop', 'spice_blow', 'wormsign', 'outcrop',
  ]

  const sites: DesertSite[] = []
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i * 3)
    const b = hash(seed, i * 3 + 1)
    const c = hash(seed, i * 3 + 2)

    // Longitude anywhere; latitude kept off the caps.
    const longitude = -180 + a * 360
    const latitude = -52 + b * 104

    // Push it clear of the inhabited band, or it is not a deep-desert site.
    const nearHome = Math.abs(longitude) < 60 && Math.abs(latitude) < 36
    const pushed = nearHome ? longitude + (longitude >= 0 ? 62 : -62) : longitude

    sites.push({
      id: `site_${i}`,
      kind: kinds[i % kinds.length],
      latitude,
      longitude: ((pushed + 180) % 360 + 360) % 360 - 180,
      // Farther out costs more to reach. Two days minimum: nothing in the
      // deep desert is a day trip.
      distanceDays: 2 + Math.round(c * 5),
      discovered: false,
    })
  }
  return sites
}

/** Sites a prospecting crew could plausibly reach from a given range. */
export function reachableSites(
  sites: readonly DesertSite[],
  maxDays: number,
): DesertSite[] {
  return sites.filter(s => s.distanceDays <= maxDays)
}

/** The next undiscovered site a crew would find, or null when the desert is bare. */
export function nextFind(
  sites: readonly DesertSite[],
  maxDays: number,
  roll: number,
): DesertSite | null {
  const candidates = reachableSites(sites, maxDays).filter(s => !s.discovered)
  if (candidates.length === 0) return null
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, Math.min(0.999999, roll)) * candidates.length),
  )
  return candidates[index]
}

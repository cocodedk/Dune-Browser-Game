// landscape-shop/sietch/tools/bake/zones.mjs
// WHERE THE FEEDSTOCK COMES FROM, AND WHERE THE DRESSING IS ALLOWED TO BE.
//
// Three zones, no scatter. A hall this size dressed evenly reads as a
// warehouse; dressed in clusters it reads as a place with a routine —
// people sit HERE, water is HERE, goods are stacked THERE — and the floor
// between the clusters stays open, which is the only way R2's desire
// lines survive being walked over by props. src/dressing.test.ts holds
// every piece inside its own zone's radius, so the discipline is a
// measured fact and not a habit a later round can drift out of.
//
// hearthCircle and basinPalmary are CENTRED ON SPEC: their centres are
// DRESSING.hearthAtM and DRESSING.basinAtM, lifted to the middle of the
// objects' own height band so the sphere covers what stands there rather
// than only what touches the floor. Move the spec and the zones move.

const HEARTH_AT = [-6, 0, -20] // MUST equal spec.ts DRESSING.hearthAtM
const BASIN_AT = [10, 0, -12] // MUST equal spec.ts DRESSING.basinAtM

export const SPEC_ANCHORS = { hearthAtM: HEARTH_AT, basinAtM: BASIN_AT }

export const ZONES = [
  {
    name: 'hearthCircle',
    centreM: [HEARTH_AT[0], 0.9, HEARTH_AT[2]],
    radiusM: 7.0,
    reason: 'The fire and the ring of people around it. Mats and bolsters sit in ' +
      'the 2.6-4.6 m gather band surface/floorWear.ts already polishes, and the ' +
      'lane the mouth path arrives on is left bare.',
  },
  {
    name: 'basinPalmary',
    centreM: [BASIN_AT[0] + 0.4, 2.2, BASIN_AT[2] - 0.6],
    radiusM: 6.0,
    reason: 'Water, and the only living things in the hall. Three palms of two ' +
      'species and three scrub tufts, all drinking from a pool small enough to ' +
      'be precious — the water is kerbed, not open ground.',
  },
  {
    name: 'tierStores',
    centreM: [10.6, 4.4, -8.0],
    radiusM: 8.2,
    reason: 'Goods stored high and dry: the raised gallery threshold, its rock ' +
      'ramp, and the walkable tier above. Nothing perishable is on the floor.',
  },
]

const PACK = 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual'

/** Every feedstock file the bake opens. Gitignored by design — the header
 *  of tools/bakeDressing.mjs says why. All plain (un-Draco'd) GLB. */
export const FEEDSTOCK = {
  brazier: `${PACK}/fire_brazier.glb`,
  amphora: `${PACK}/amphora.glb`,
  baskets: `${PACK}/basket_set.glb`,
  sacks: `${PACK}/spice_sacks.glb`,
  carpet: `${PACK}/carpet_roll.glb`,
  urn: `${PACK}/water_urn_trough.glb`,
  datePalm: `${PACK}/date_palm.glb`,
  doumPalm: `${PACK}/doum_palm.glb`,
  scrub: `${PACK}/desert_scrub.glb`,
  seatStone: `${PACK}/sandstone_boulder.glb`,
  doorway: `${PACK}/tomb_entrance.glb`,
}

/** Source URL and licence line per asset, for provenance.ts. */
export const SOURCE_LICENCE =
  'threejsassets.com — Desert Kingdom Complete, Lifetime all-access ' +
  '(purchased 2026-08-09). "You may use, modify and recolor these assets ' +
  'in unlimited personal, client and commercial finished projects. You ' +
  'may not resell, redistribute, sublicense or give away the raw GLB or ' +
  'component files, alone or repackaged as an asset pack or template."'

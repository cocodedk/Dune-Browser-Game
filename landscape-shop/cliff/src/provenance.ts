// landscape-shop/cliff/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the other shops' provenance.ts.

export const PROVENANCE = {
  footprint: 'AUTHORED against the game, not a still: FlightMode ' +
    '(src/game-render/modes/flight/FlightMode.ts) generates dunes at ' +
    'amplitude 70 and flies the arc at altitude 90, so the crest is set ' +
    'at 190 m — 2.7x the tallest dune, above the flight line — and the ' +
    'width at 600 m so the wall fills the approach frame at the spec rig. ' +
    'Skirt 40 m covers the heightfield\'s +-70 variation at the seated ' +
    'destination. Shape language: 2021/24 Villeneuve Arrakis massifs ' +
    '(smooth wind-carved walls, stratified faces), per the loop contract\'s ' +
    'Authority section.',
  entrance: 'AUTHORED: 16 x 12 m gate — reads against the ornithopter ' +
    '(rotor span ~12 m true meters in vehicle-shop/ornihopter) that lands ' +
    'before it, while staying under 7% of the massif\'s height so the rock ' +
    'keeps its scale.',
  cameraRigs: 'MEASURED from FlightMode: cruise altitude 90, FOV 50, ' +
    'FogExp2 0.0009. The approach rig sits on the arc line; the landing ' +
    'rig matches the short-final framing before touchdown.',
  palette: 'AUTHORED from the Villeneuve films\' Arrakis rock (warm ' +
    'neutral basalt-sandstone) with the sand apron pulled toward the ' +
    'game\'s own dune palette so the seated base blends where it meets ' +
    'SandMaterial terrain.',
  sourcedAssets: 'Sanctioned feedstock (free tier, threejsassets.com, ' +
    'Free Commercial License, no redistribution of raw files): ' +
    'sandstone-boulder, cutting-rock-face, rockfall-debris, ' +
    'rubble-scatter, mossy-boulder (de-mossed). Each use records its ' +
    'asset URL here when it lands.',
} as const

// character-shop/stilgar/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the vehicle shops' provenance.ts.

export const PROVENANCE = {
  proportions: 'AUTHORED from the 2021/24 films\' Stilgar (Javier Bardem). ' +
    'heightM 1.81 = the actor\'s publicly listed height; head band raised ' +
    '(0.13-0.14) for the heavy-boned, bearded head; solid build authored ' +
    'from the on-screen presence. Stills in docs/reference/ supersede any ' +
    'of these the moment the user supplies them.',
  palette: 'AUTHORED from the films: weathered olive-tan skin, charcoal ' +
    'stillsuit older and more worn than the young fighters\', drab hood and ' +
    'wrap, dark beard flecked grey. Full-ibad eyes per the loop contract.',
} as const

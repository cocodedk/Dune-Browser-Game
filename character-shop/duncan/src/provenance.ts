// character-shop/duncan/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the vehicle shops' provenance.ts.

export const PROVENANCE = {
  proportions: 'AUTHORED from the 2021 film\'s Duncan Idaho (Jason Momoa). ' +
    'heightM 1.93 = the actor\'s publicly listed 6\'4"; widest shoulder ' +
    'half-width in wave 1 for the on-screen build. Stills in ' +
    'docs/reference/ supersede any of these the moment the user supplies ' +
    'them.',
  palette: 'AUTHORED from the film: Atreides near-black duty fatigues with ' +
    'a green-grey cast, dark leather chest rig, warm tan skin, long dark ' +
    'hair with half-tie topknot and full beard. Natural (non-ibad) eyes ' +
    'per the loop contract — Duncan dies before the desert claims him.',
  costumeRuling: 'Lead ruling at R0: fatigues + chest rig, not a stillsuit, ' +
    'for wave-1 costume range. The user may overrule.',
} as const

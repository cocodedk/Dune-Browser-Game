// character-shop/chani/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the vehicle shops' provenance.ts.

export const PROVENANCE = {
  proportions: 'AUTHORED from the 2021/24 films\' Chani (Zendaya). heightM ' +
    '1.78 = the actor\'s publicly listed 5\'10"; eye line derived as ' +
    '(height - 0.115) / height; shoulder/hip half-widths authored for the ' +
    'on-screen wiry build. Stills in docs/reference/ supersede any of these ' +
    'the moment the user supplies them.',
  palette: 'AUTHORED from the films\' stillsuit look: grey-taupe ribbed ' +
    'rubberized suit, sand dust, warm medium-brown skin, near-black curly ' +
    'hair. Full-ibad eyes per the loop contract\'s default ruling.',
} as const

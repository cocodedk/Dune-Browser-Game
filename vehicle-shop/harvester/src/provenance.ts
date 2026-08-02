// vehicle-shop/harvester/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the ornithopter shop's discipline.
//
// The authority situation changed mid-build: the user supplied
// docs/harvester.3mf, a fan-made "Dune Spice Harvester" model (MakerLab
// "Image to 3D v2", by General_genius, BY-NC-SA, 2025-02-07). It is one
// 499,978-triangle mesh, no named parts. The ornithopter's kit-plate lesson
// applies: a 3D part out-ranks a photograph for SHAPE, but this model is an
// AI reconstruction of a photo, so its absolute fidelity to the film is
// unknown. We use its RATIOS and BLOCK LAYOUT as measured authority, keep
// the film's signatures it lacks (the forward cutter, the cab), and say so.

export const PROVENANCE = {
  overall:
    'MEASURED ratios from docs/harvester.3mf (orientation length=X, width=Y, ' +
    'height=Z: 73.498 x 52.388 x 22.321mm -> 3.29 : 2.35 : 1), ABSOLUTE SCALE ' +
    'AUTHORED at a 48m HULL length (a film harvester is enormous; 48m is twice ' +
    'the ornithopter and dominates the 10m scale posts). OVERALL.length = 60 ' +
    'because the film-derived cutter reaches 12m past the nose — the hull ' +
    'length is the 3MF measure, the boom is the film. The 3MF\'s own X axis is ' +
    'its length; the slicer lay it on its side on the bed.',
  tracks:
    'MEASURED from the 3MF: two full-length track pods, each ~18% of overall ' +
    'width (pod centre ~+-14m at scale), spanning ground-to-deck. The film ' +
    'agrees: the harvester is two massive tracks carrying a platform. ' +
    'Wheel radius AUTHORED (2.2m) — the 3MF has no separate wheels.',
  body:
    'MEASURED block layout from the 3MF: a deck band across the top between ' +
    'the pods, an underframe near the ground, and SOLID END blocks — a tall ' +
    'nose block (x -24..-15.7m at scale) and a tail block (+18.3..+24m), with ' +
    'the mid-section open-framed between them. The film\'s open processing ' +
    'deck is exactly this: a platform you can see under, between the tracks.',
  boom:
    'FILM-DERIVED, not in the 3MF. The 2021 film\'s signature harvester act ' +
    'is the long low cutter arm reaching ahead of the nose with a wide blunt ' +
    'head dipping into the sand — the machine is anchored to the spice bed ' +
    'by it. Added ahead of the measured nose block; the seam test pins it as ' +
    'the frontmost geometry.',
  cab:
    'FILM-DERIVED, not in the 3MF. A low raised control cab at the forward ' +
    'deck, slanted windshield, no interior by design. Kept small and flush ' +
    'so the measured silhouette still reads.',
  palette:
    'AUTHORED from the film\'s desert-industrial look: warm sand body, ' +
    'near-black pods and machinery, rusted-metal accents. Rendered tone is ' +
    'what matters, not albedo — the ornithopter shop paid that lesson twice.',
  crawl:
    'AUTHORED. The film harvester is slow, heavy and unstoppable. MAX_SPEED ' +
    '8 m/s with MAX_ACCEL 1.5 m/s^2 and full-steer yaw rate ~0.25 rad/s read ' +
    'as enormous and deliberate against the ornithopter\'s 82 m/s cruise.',
  round2:
    'RULING, 2026-08-02: the 3MF\'s chunky 1.4:1 plan read as a box to the ' +
    'user\'s eye ("very weird, not clear what it is") and the full-height ' +
    'track pods read as flat walls. The measured model is a stylised AI ' +
    'reconstruction, not a licensed kit; the FILM proportions now win where ' +
    'they conflict. Width over tracks 34.2 -> 29 (span 28 -> 24), deck ' +
    '14.2 -> 12.0, pods rebuilt as running gear (tread band + big wheels + ' +
    'housing), cutter enlarged from a thin stick to a 18m-wide grinder with ' +
    'teeth and a feed hopper, cab given a glass band, deck machinery added. ' +
    'The 3MF ratios remain the record of the model; the eye is the record of ' +
    'the machine. Recorded so a later round does not silently re-assert the ' +
    'measured numbers over the user\'s judgement.',
} as const

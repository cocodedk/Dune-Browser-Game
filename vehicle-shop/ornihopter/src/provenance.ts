// vehicle-shop/ornihopter/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Split out of spec.ts in round 6a: the record grows every
// time something is measured, spec.ts has a 200-line cap like every other
// source file here, and the two have nothing to do with each other beyond
// spec.ts re-exporting this for the callers that cite it by name.

export const PROVENANCE = {
  overall:
    "MENG's licensed 1:72 kit, 720mm span x 318mm long at 1:72 -> 51.84m x 22.896m. " +
    'docs/info.md rates this High confidence.',
  wingCount:
    'MEASURED from the MakerWorld print kit in docs/: the standard kit lays out ' +
    '8 x Wing_full_size.stl, and Wings_Fullscale_Kit.3mf lays out 4 x l1 + 4 x r1. ' +
    'Eight wings, four per side. A top-down photograph reads as three per side ' +
    'because blades overlap at that angle — the kit part count is the primary source.',
  wingPlanform:
    'MEASURED from docs/ Wing_Fullscale_left.stl (197.66 x 12.37 x 2.02mm plate): ' +
    'length/maxChord = 20.69, chord near-constant over the middle 60% of span and ' +
    'tapering only near the tip. This CONTRADICTS docs/info.md maxChord 2.5m / ' +
    'tipChord 0.35m, which came from a University of Leicester actor-comparison ' +
    'estimate, not from the licensed kit. The measured planform also matches the ' +
    'Master Replicas reference photographs, which show very slender blades.',
  wingRoots:
    'MEASURED from the print kit, replacing an authored even 1.6m pitch. ' +
    'Wing_support_front.stl (38.72 x 21.55 x 1.81mm) and Wing_support_back.stl ' +
    '(36.50 x 20.34 x 1.79mm) are TRANSVERSE frames, symmetric about the ' +
    'craft centreline, each with four outstretched arms ending in clevis ' +
    'forks: two reaching up-and-out to the deck edge, two down-and-out to the ' +
    'flank. Their 38.72mm span is the body width (2 x 19.36mm = 5.19m against ' +
    "OVERALL.bodyWidth 5.4m), which is what identifies them as frames rather " +
    'than fore-aft rails. TWO frames therefore carry 2 stations x 2 heights = ' +
    'four roots per side, a 2x2 cluster — exactly what ' +
    'docs/dune_ornihopter_kit-2.png shows on the near flank, two sockets on ' +
    'the deck-edge shelf and two on a proud bracket below and aft. Station ' +
    'spacing 5.30m is docs/profiles/kit-dossier.md section e\'s 39.52mm scaled ' +
    'by Airframe_main.stl 170.80mm = OVERALL.length; CAVEAT, that 39.52mm is a ' +
    'centroid distance in the 3MF\'s PRINT-BED layout, and the bed layout is ' +
    'all those files contain — there is no per-part assembly transform in ' +
    'them, only one <assemble_item> for the whole plate. Treat 5.30m as ' +
    'corroborated by the photograph, not as measured off an assembly.',
  interior:
    'AUTHORED, not sourced. docs/info.md gives only "two pilots in front, larger ' +
    'cabin behind". Seat and eye heights below are ordinary human seated ' +
    'anthropometry fitted to the measured cabin volume. Concept art at ' +
    '.shots/reference/thopter-03.jpg and thopter-04.jpg is the visual reference.',
  landedHeight:
    'RULING: landedHeight is the overall height of the craft parked on its gear, not ' +
    'ground clearance to the hull underside — read either way, the old value (7.2) could ' +
    'not be right: as clearance it implies an 11m leg, as overall height it implies ' +
    '1.81m, under the headroom the gear stance requires. Derived from the landing gear ' +
    'stance module (geometry/gear/stance.ts): the ground plane sits at GROUND_Y = -4.30, ' +
    'chosen so the parked craft clears the deepest point of the belly by about 2.19m, ' +
    'matched to the crew headroom shown on the production ingress/egress reference board ' +
    '(.shots/reference/thopter-05.jpg), where crew walk upright under the fuselage to a ' +
    'rear ramp. MEASURED at 7.582 via the debug measure() harness — the parked Box3 ' +
    'height, wings at rest — which replaces the 7.2 estimate here.',
} as const

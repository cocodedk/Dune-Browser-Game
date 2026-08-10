// landscape-shop/sietch/tools/bake/figureLimbs.mjs
// STRIPS the reference-pose arms off the CC0 figure kit — POST-decimate,
// in WORLD METRES, on the actual built geometry, not a pre-decimate
// source-space guess. That distinction is load-bearing: an earlier attempt
// cropped source vertices by an X (or Y-band) threshold before decimation
// and repeatedly left long single-triangle spikes reaching to the old arm
// tip, because ANY surviving triangle with one corner inside the kept
// region and one corner near — but just outside — the crop box still spans
// the gap. Filtering the FINAL decimated triangle list instead is
// unconditionally clean: a triangle survives only if EVERY corner is
// already within the threshold, so nothing can span across the cut.
//
// Which axis is "the arms" differs PER SOURCE MESH — measured, not
// assumed, after two different wrong guesses:
//   - Evil Wizard's reference pose spreads along its own local X (bounding
//     box 22.3 wide vs 17.2 tall at rotYDeg 0).
//   - The Polygonal Mind kit (Wizard, reused for both hearthElder and
//     basinTender) spreads along its own local Z instead (1.67 m of Z
//     extent against a 1.77 m standing height — X stays a normal 0.22 m
//     shoulder width). A tool built to LOOK at the actual bounding box
//     per axis (not eyeball a render) is what found this; see the R4
//     report for the debugging trail.
//
// `axis` is 0 (X) or 2 (Z) into a decimated [x,y,z] vertex; `thresholdM`
// is measured from `centerM` (world metres, post true-meter scaling).

export function stripWide(vertices, triangles, axis, thresholdM, centerM = 0) {
  return triangles.filter(({ tri }) => tri.every((vi) => Math.abs(vertices[vi][axis] - centerM) <= thresholdM))
}

# Stage 13 — Location dioramas

**Phase:** 2 · **Depends on:** 12 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

Arriving somewhere means seeing it. 2.5D dioramas: one painted backdrop on a curved
plane, two or three real 3D foreground props, slow camera drift for parallax.

This is both the cheapest and the most faithful choice — the original was static
painted scenes.

## Sketch

- `LocationMode.ts` — assembly, drift camera
- `Backdrop.ts` — curved plane, 2–3 parallax layers
- `Hotspots.ts` — clickable zones emitting existing bus events (talk, assign, leave)
- `locationDefs.ts` — per-location backdrop, props, and hotspot data

## Assets

Four backdrops at ~2048×1024 for the slice: sietch interior, palace hall, spice field,
desert camp. All original.

## Open questions for the spec pass

- Do the four backdrops cover seven locations by reuse, or does each need its own?
- Where does task assignment live — a hotspot in the diorama, or the existing React
  panel overlaid? Two competing interfaces for the same action would be worse than
  either alone.

# Stage 20 — Art and audio production

**Phase:** 3 · **Depends on:** 14 · **Est. tasks:** 6 · **Builder:** Claude + user
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

The full original asset set. This is the stage most likely to dominate the schedule, and
the least amenable to delegation — it is taste iteration, and the user is in the loop
for every round.

## Scope

| Asset | Count | Spec |
|---|---|---|
| Character portraits | 14 | 1024², one style bible, one prompt template |
| Location backdrops | ~12 | ~2048×1024, covering 30 locations by reuse |
| Models | 3–4 | Ornithopter, harvester, windtrap — each ≤10k tris |
| Textures | 4–6 | Sand ripple normal, sand albedo, prop textures, 512² tiling |
| Ambient audio | 3–4 | Desert loop, sietch interior, palace, wind |
| Stingers | 6–8 | Quota due, discovery, raid, pledge, ritual, act transition |
| Colour-grade LUT | 1 | 32³, generated |

Target ≤10 MB on disk, KTX2/BasisU for textures, meshopt for models, Opus for audio.

## Ground rule

Everything is original — generated or authored for this project. Nothing is taken from
the original game, and no attempt is made to reproduce its specific art or music.

## The consistency problem

Fourteen portraits generated independently will not look like one game. Write the style
bible **first** — palette, lighting direction, framing, level of stylisation, rendering
medium — and hold every asset to it. Regenerate outliers rather than accepting drift;
one mismatched portrait undermines the other thirteen.

## Open questions for the spec pass

- Ambient score: generated, licensed, or commissioned? This is the one asset class where
  a licensed track may beat anything we can produce.
- Is there a fallback rendering path if an asset is missing, so a gap never blocks a
  build?

# Gauntlet Loop — character-shop: the cast

> **ENDED 2026-08-08 by user verdict.** Wave 1 (chani, stilgar, duncan) is
> settled as-is — "no more work is needed on these figures." All later waves
> are cancelled: the user generates future cast figures as **2D photo-style
> images** (ChatGPT) instead of 3D models. This document stays as the record
> of the loop that built wave 1; nothing below dispatches new work.

Every named character in the game gets a hero-grade full-body 3D model, built in a
standalone workshop and released into the game through the asset-pipeline seam — the same
path both vehicles took (`docs/PRD/dune92/04-asset-pipeline.md`). This document is the
loop contract for all of them. Per-character round logs live in each sub-project's
`progress.md`.

## Roles (user directive, 2026-08-05)

- **Lead / art director / architect / planner — Fable 5.** Decomposes, authors every
  `spec.ts` (nobody else edits it), writes builder and critic prompts, re-runs every gate
  and reproduces every reported number itself, commits, keeps the logs. Never writes
  model code.
- **Builders — Opus and Sonnet subagents, used at full tilt.** Opus takes heads,
  likeness and material rounds (the hard, judgement-heavy ones); Sonnet takes bodies,
  costume massing, infrastructure and mechanical rounds. One builder per sub-project at a
  time; rounds within a sub-project are sequential. Sub-projects are disjoint by design,
  so up to **three character loops run in parallel** — that is the sanctioned fan-out.
- **Critics — fresh-context subagents.** Goal, bar, PNGs. Never the builder's report or
  reasoning. Sonnet per round; 3×Opus panels at each character's two milestones.
- **Final judge — the user.** His eye outranks any critic; a user finding is applied as
  stated, never re-derived. Checkpoint: the loop pauses for his verdict at each
  character's FINAL panel (R3). He may interrupt anywhere.

**Cost, said up front:** hero grade runs ≈300–700k tokens per character; the full
20-character roster is realistically 6–12M tokens. The roster below is value-ordered in
waves. Stopping after any verified round leaves the tree green — stop anywhere.

## Shape

- `character-shop/<name>/` — one sub-project per character, scaffolded by `cast:new`
  (landed in round C0). Public surface, gates, fence, budgets: all identical to
  `vehicle-shop/` semantics, mirrored for this root.
- **Characters stay separate.** No cross-shop imports, ESLint-enforced. Shared DNA
  (proportion spec shape, armature group naming, skin/fabric material starters) lives in
  the SCAFFOLD TEMPLATE — each shop gets its own copy at birth and owns it from then on.
  Duplication is the accepted price of independence.
- Authored in **true meters, Y-up, the face looking toward −Z** (the vehicles' nose
  convention). `seam.test.ts` guards it from day one: the nose tip is the frontmost head
  geometry at −Z, and the eye line sits at the spec'd fraction of spec'd height. The
  ornithopter flew backwards for four rounds; no character will face backwards for one.
- **Characters are STATIC (user directive, 2026-08-05: "I am not interested in animated
  characters. just they look correct.").** No idle, no talking, no animation contract of
  any kind. Public model contract (per-shop `contracts.ts`):
  `CharacterModel { root: Object3DLike, dispose(): void }`. The model never writes its
  root transform. Any motion in evidence renders is CAMERA-ONLY (the harness turntable).
  The dialogue bust is a CAMERA FRAMING of the full body, never a separate asset.

## Authority

**The 2021/2024 Villeneuve films are the sole shape and likeness authority.** Explicitly
demoted, mood-reference only: the Cryo 1992 portraits and the 1984 film. Where a critic
finds the two in conflict, the Villeneuve look wins without discussion.

The primary bar is **blind identification** — critics know the films; no reference
assets are required to run the loop. Side-by-side judging activates per character the
moment the user drops stills into `character-shop/<name>/docs/reference/` (front face,
3/4, full-body costume — three is enough). Characters with NO film incarnation (wave 4)
cannot start until the user either supplies reference art or approves a lead-authored
design sheet at that character's R0.

## Roster and waves

| shop | character | 2021/24 reference | notes |
|---|---|---|---|
| **Wave 1 — proving** | | | |
| `chani` | Chani | Zendaya | proves the release slot (on screen in dialogue today) |
| `stilgar` | Stilgar | Javier Bardem | distinct older bearded face — template range |
| `duncan` | Duncan Idaho | Jason Momoa | big-build warrior — template range |
| **Wave 2** | | | |
| `jessica` | Lady Jessica | Rebecca Ferguson | |
| `leto` | Duke Leto | Oscar Isaac | |
| `gurney` | Gurney Halleck | Josh Brolin | |
| `baron` | Baron Harkonnen | Stellan Skarsgård | non-standard body — template stress test |
| **Wave 3** | | | |
| `thufir` | Thufir Hawat | S. M. Henderson | |
| `kynes` | Liet-Kynes | Sharon Duncan-Brewster | RULING below |
| `rabban` | Glossu Rabban | Dave Bautista | |
| `shishakli` | Shishakli | Souheila Yacoub (P2) | |
| `ramallo` | Rev. Mother Ramallo | Giusi Merli (P2, brief) | weak ref — RULING below |
| **Wave 4 — no film incarnation; blocked on R0 ruling each** | | | |
| `fenring` | Count Fenring | — | |
| `tuek` | Esmar Tuek | — | |
| `harah` | Harah | — | |
| `otheym` | Otheym | — | |
| `krail` | Overseer Krail | — (game-original) | |
| `dessin` | Factor Dessin | — (game-original) | |
| `zurrah` | Zurrah | — (game-original) | |
| `hallock` | Sergeant Hallock | — (game-original) | |

**Rulings the user owns (defaults applied until he overrules):**

1. **Kynes** — film authority says female (Duncan-Brewster); the 1992 game's Kynes was
   male. Default: follow the film. Overrule at `kynes` R0 if wanted.
2. **Ramallo** — P2's Ramallo is barely seen. Default: Merli's look as the seed, lead
   design sheet fills the gaps, user approves at R0.
3. **Eyes** — blue-within-blue (Fremen/spice): default full ibad eyes for Chani,
   Stilgar, Duncan (post-Fremen? No — Duncan dies before; default NO), Shishakli, Harah,
   Otheym, Kynes; everyone else natural. Per-character line item in `spec.ts`; user can
   flip any at that character's R0.

## The bar (global — every critic gets both halves, verbatim)

**The standard is AAA (user directive, 2026-08-05): nothing less is accepted.** A
character that would look out of place in a current AAA title at the game's viewing
distances has not passed, whatever its score history. Concretely: the final-panel bar is
**≥9/10 with zero correctness findings**; 7–8 is a FAILING score that names its gap and
loops. Only the user may settle for less on a given character — the lead may not.

1. **Is this good?** Score 0–10 against the round's destination; name the single biggest
   remaining gap concretely enough to act on. A diplomatic answer is worthless.
2. **Is this correct?** Right way round (face toward −Z — check it explicitly), height
   equal to `spec.ts` within 1%, head-height proportion inside the spec'd band, bilateral
   symmetry where intended, no inside-out normals or holes at bust framing distance, eyes
   per the spec's ibad ruling, stillsuit reading as worn equipment over a body — not as
   skin — with tubes that route somewhere, and `dispose()` complete.

**Uncanny-valley rule:** the bar is *recognition*, not pores. A fresh critic at the
game's two real distances — dialogue-bust framing and full body at 3–8 m — must name the
character (or give an unambiguous description a Dune-literate stranger would resolve to
them). Stylize toward strong authored FORM; never chase photoreal skin. Named forms
beat procedural jitter; noise is not detail.

## Standing boundaries (in every builder prompt)

- **Verification is these four, and the four are not enough:** `npm run lint` ·
  `npm run shop:check` · `npx vitest run character-shop/<name>` ·
  `bash scripts/check-file-length.sh`. Named traps: plain `npx tsc --noEmit` does NOT
  cover shop directories — only `shop:check` does; the pre-commit hook runs the 200-line
  check BEFORE the npm gates, so green npm commands are not a committable tree; the hook
  also runs the full build and Playwright.
- **200 lines per source file.** Split via helpers before, not after.
- Explicit `import { describe, it, expect } from 'vitest'`; tests run in node with no
  DOM, no canvas, no WebGL — all texture work is `DataTexture` (the house
  `hullWeathering.ts` pattern).
- **Builders never commit and never touch `spec.ts`.** The lead commits with the real
  hook. Never `--no-verify`.
- **No imports across shops, no imports from game `src/`** — the fence enforces both;
  a fence error is a design error, not an obstacle.

## C0 — infrastructure round (Sonnet, once, before any character)

Branch `feat/character-shop` off `feat/asset-pipeline`. Generalize the pipeline gates
from one shop root to two:

- `scripts/check-shops.mjs` globs `character-shop/*/tsconfig.json` too.
- `vite.config.ts`: vitest include `character-shop/**/*.test.ts`; manualChunks emits
  `character-<name>` chunks; `@cast` resolve alias → `character-shop/`.
- `tsconfig.json`: `"@cast/*": ["./character-shop/*"]`.
- `scripts/check-bundle-size.mjs`: `{ /^character-.*\.js$/, maxBytes: 150_000 }`.
- `eslint.config.js`: mirror both fence blocks for `character-shop` + `@cast` (same
  ancestor-negation shape; public surface = `model/**`, `contracts`, `spec`).
- `scripts/new-shop.mjs` gains a root/kind flag; `npm run cast:new -- <name>` scaffolds
  a character shop whose seed templates are HUMANOID: `spec.ts` with `PROPORTIONS`
  (height m, head-height fraction band, eye-line fraction, shoulder/hip widths),
  `provenance.ts` naming the film reference and actor height source, an armature-named
  group tree in the model seed (root/pelvis/spine/chest/head/L-R arms/legs), a
  skin+fabric `DataTexture` material starter, and a `seam.test.ts` that already guards
  face-toward-−Z, height-within-1%, and eye-line fraction.
- Verify exactly like the pipeline's own scaffold was verified: generate a throwaway,
  all gates green with it present, remove it cleanly.

**Bar:** mechanical — all gates green before and after; fence red-tested from `src/`
against a `@cast` harness path and green-tested against a public-surface path.

## Per-character loop (R0–R3)

- **R0 — spec and references (lead + user).** `cast:new`, then the lead authors
  `spec.ts` (actor height from provenance, proportion bands, costume palette, ibad
  ruling) and `provenance.ts`. Wave-4 characters: user approves the design sheet here.
  No critic — gates only.
- **R1 — body and silhouette (Sonnet).** Full-body massing in costume, armature groups,
  neutral A-pose. Bar: blind silhouette ID on a black-fill render — "human? build? role?"
  — plus measured height/proportions. Correctness: face −Z, symmetry.
- **R2 — head and likeness (Opus — the hard round). Milestone: bust panel.** Skull and
  face forms, hair mass, authored feature placement. 3×Opus blind panel on bust framing:
  "Who is this?" Bar: at least two of three name the character or give an unambiguous
  descriptor; zero correctness findings (normals, symmetry, eye line).
- **R3 — costume, materials, eyes (Opus). Milestone: FINAL panel + USER VERDICT.**
  Stillsuit/garment detail, `DataTexture` weathering, palette from spec, ibad eyes per
  spec. Correctness: suit worn over a body, tubes route (nose to catchpocket), grime
  where wear happens — authored, not sprayed. 3×Opus panel: blind turntable ID ·
  side-by-side against `docs/reference/` stills if present · full correctness sweep.
  Bar: **≥9/10 (AAA), zero correctness findings.** Then STOP for the user.

## Release rounds (per wave, after its characters pass R3)

The game's conversation figure renderer (`src/game-render/modes/conversation/
drawFigure.ts` and friends) is the existing consumer and therefore the release point,
exactly as `machines/Harvester.ts` was: it becomes an adapter that mounts the shop model
by character id and frames the bust; the 2D drawn figure stays as the fallback for
unreleased characters. Scale and lighting policy live game-side; the mounted model is static.
Measure gate: `renderInfo` draw calls in conversation mode, `character-<name>` chunk
within budget. Look gate: the user, in the game's own dialogue lighting. Location-scene
and deck-crew placements are later applications of the same released models.

## Lead round protocol (every round, in order)

1. Author the round's spec delta, if any. Commit separately.
2. Spawn the builder: destination, standing boundaries, files owned, tests-first.
   Nothing about the route.
3. On "done": check mtimes are quiet — never judge a tree mid-write.
4. Re-run all four gates MYSELF. Builder reports are evidence, not findings — this
   project's history includes a reported 43.2% that reproduced at 8%.
5. Re-shoot MYSELF; reproduce any builder-reported measurement with my own parameters.
6. Spawn the critic (fresh context, PNGs + bar only). If builds landed after capture,
   re-capture — never fix from a stale critique.
7. Bar met → log in the shop's `progress.md` (score, numbers, what did not reproduce),
   commit with the real hook. Bar missed → feed the single biggest gap to the SAME
   builder. Three passes without movement → stop, bring the gap to the user.
8. Final (R3) panels: STOP for the user's verdict before the next wave slot starts.
9. Stop conditions, named honestly: bar met · the next gap needs a human decision ·
   gains not worth the tokens — but under the AAA directive only the USER may invoke
   this third one; the lead's job is to keep looping or escalate, never to settle.

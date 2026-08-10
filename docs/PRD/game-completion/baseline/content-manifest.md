# WP00 baseline — content and asset-key manifest

Recorded against commit `e693ed5` on branch `feat/game-completion` (2026-08-10). One
file was dirty in the working tree at record time — `docs/PRD/game-completion/09-gauntlet-prompt.md`
— not touched by this inventory and not counted in it.

Counting rules are taken verbatim from `docs/PRD/game-completion/05-content-and-narrative.md`
(cited by section/line below). Where 05 states no explicit counting rule for a
sub-question, that gap is named rather than filled with an invented rule. Every count
below is reproducible from the cited file or the cited command, run from the repo root.

This document is evidence for a critic, not a verdict. It does not use `done`,
`green`, `verified`, or `blocked` — those are the pack's status words
(`09-gauntlet-prompt.md` line 106) and belong to the board, not to a count.

---

## 1. Locations (sietches/villages)

**Counting rule applied:** 05's "Location identity contract" (lines 178–193) defines
what a counted location must have — strategic purpose, a resident or explained
absence, a visual identity note, an ambient audio identity, a state-change hook, an
arrival line, and a relationship to another location — but 05 does not give a
membership test for "what is a location" at all (no raw-count formula). Raw count
applied: every entry in the canonical village/location roster.

**Count:** 19 locations defined, all with matching runtime sietch-economy records.

**Reproduced by:**
```
grep -c "id: '" src/data/villages.ts src/data/villages.wider.ts src/data/villages.farside.ts
# 8 + 6 + 5 = 19
grep -c "villageId: '" src/data/sietches.ts   # 19, same id set (verified by diff, see below)
```
The 19 ids are identical across `src/data/villages.ts` (+`villages.wider.ts` +
`villages.farside.ts`) and `src/data/sietches.ts` — confirmed with
`comm -23`/`comm -13` on the sorted id lists (empty both directions). `src/data/regions.json`
also holds 19 entries, one per location id.

**Ids:** arrakeen, bight_of_cliff, carthag, cave_of_birds, cielago_depression,
funeral_plain, gara_kulon, great_flat, habbanya_ridge, hagg, imperial_basin, old_gap,
plaster_basin, red_chasm, red_wall_sietch, sietch_tabr, sihaya_ridge, tsimpo,
wind_pass — full definitions at `src/data/villages.ts:6-119`,
`src/data/villages.wider.ts`, `src/data/villages.farside.ts`.

**Kind distribution** (`grep -oh "kind: '[a-z_]*'" src/data/villages*.ts | sort | uniq -c`):
11 `sietch`, 4 `station`, 1 `palace`, 1 `fort`, 1 `field_camp`, 1 `smuggler_den`.

**Visitable today vs. defined:** 6 of 19 start `discovered: true`; 13 start
`discovered: false` (`grep -oh "discovered: [a-z]*" src/data/villages*.ts | sort | uniq -c`).
The only production writer of village `discovered` is one prospecting outcome branch,
`src/game-engine/economy/prospectRun.ts:79-83`, which reveals `world.villages.find(v
=> !v.discovered)` — the first undiscovered entry in array order, not a chosen or
referred one. `revealLocation` (05 line 169, the dialogue-authored reveal effect) has
zero uses in `src/data` (`grep -rn "revealLocation" src/data` — no hits outside the
type declaration), so dialogue never reveals a location. Net: all 13 hidden locations
are eventually reachable through the single prospecting path, but 05's rule at line
205 ("at least two reachable reveal paths unless it is an explicitly optional secret")
is unmet for all 13 — one path exists, not two.

**Visual identity note:** `src/game-render/modes/location/locationDefs.ts:23-54`
defines exactly 6 `DioramaDef` entries, one per `LocationKind`, not one per location.
19 locations share 6 palettes; only the 11 `kind: 'sietch'` locations additionally
receive the real 3D set (`src/game-render/modes/location/sietchGate.ts:79-90` mounts
`@land/sietch` whenever `place.kind === 'sietch'`, for any of the 11, not a specific
one). 05 line 191 ("Locations that share an environment set still require different
staging... Renaming the same diorama and values is not location content") is directly
addressed by this shared-diorama structure; no per-location staging exists today.

**Gap vs. release floor** (05 line 27, 30 locations): **11 short**, and the 19 that
exist do not yet individually satisfy the identity contract (visual identity and
resident/absence are shared/generic, not per-location).

Desert prospecting sites (`src/game-engine/desert/sites.ts`, 14 procedurally
generated per game) are explicitly **not** counted as locations here: they have no
resident, no authored arrival line, and no relationship-to-another-location field —
none of the identity-contract elements at 05 lines 182–189 apply to them. They are a
yield mechanic, not location content.

---

## 2. Characters

**Counting rule applied:** 05 gives no raw-count formula for "character"; it instead
defines core-vs-supporting by contract (character contract, lines 90–108; required
core-role coverage table, lines 109–132). Raw count applied first (every entry in the
speaking roster), then checked against the contract, since the contract is what 05
actually gates.

**Count:** 20 defined speaking characters, all with a location, role text, and a
procedural portrait; 0 imported into the running dialogue/portrait system are
distinguished as "core" vs. "supporting" in data — that distinction does not exist in
the codebase today.

**Reproduced by:**
```
grep -c "^    id: '" src/data/characters.ts   # 20
```

**Ids:** duke_armand, vell, corvin, shadir, ysane, sova, pell, voss, vast, maren,
varn, baron, meko, sabiha, orrin, krail, dessin, zurrah, hallock, duncan — full
entries at `src/data/characters.ts:11-161`.

**No core/supporting split exists.** `Character` (`src/game-engine/dialogue/types.ts`)
has no role-tier field, and nothing in the tree maps a character id to one of 05's 14
required core-role functions (house leader, steward, imperial envoy, first naib,
scout, reverend mother, prospector, smuggler, military tutor, planetologist,
political parent/adviser, field antagonist, strategic antagonist, far-region witness —
05 lines 114-129). Reading names against roles suggests likely candidates (duke_armand
≈ house leader, vell ≈ steward, corvin ≈ imperial envoy, shadir ≈ first naib, ysane ≈
scout, sova ≈ reverend mother, pell ≈ prospector, meko ≈ smuggler, voss ≈ military
tutor, vast ≈ planetologist, maren ≈ political adviser, varn/baron ≈ antagonists) but
this is this report's inference, not an authored mapping — no file declares it, so it
is reported as absent rather than filled in.

**Portraits wired into dialogue:** 20/20 procedural `PortraitDef` entries
(`src/data/portraits.cast.ts`, 14; `src/data/portraits.fremen.ts`, 6), one per
character id, enforced by `src/data/portraits.test.ts` (`portraitCount() ===
INITIAL_CHARACTERS.length`, and a distinct-identity-tuple check for all 20). Render
seam: `src/game-render/modes/conversation/CharacterCard.ts:14,114` draws the portrait
onto the 3D conversation-mode card; `src/ui/DialoguePanel.tsx:10,42` uses the same
`portraitFor()` for the 2D panel fallback. No character has a 3D figure wired into
dialogue — the three character-shop workshop figures (chani, duncan, stilgar) have
zero imports from `src/` (`grep -rn "@cast" src --include="*.ts*"` returns no
non-comment hits), so they are workshop-only.

**Reachability:** `src/game-engine/dialogue/residents.ts:20-22` (`residentsAt`) is a
static filter — `characters.filter(c => c.locationId === locationId)` — over the
fixed `INITIAL_CHARACTERS.locationId` field. 05 line 104-108's "deterministic
character-state query" that resolves current location, availability, recruited
status, and temporary absence from world flags and act state does not exist; every
character's location is fixed at authoring time for the life of a save.

**Gap vs. release floor** (05 lines 28-29: 14 core + 4-6 supporting = 18-20 total,
each passing its named contract): raw count of 20 already sits inside the 18-20 band,
but the floor is contract-based, not numeric — no character today is confirmed
against the core-role table or the supporting-character contract (introduction, one
evolving state, one system/location perspective, one later acknowledgement), because
no role-tier data exists to check against. **Gap is "contract unverified for all 20,"
not "0 short."**

---

## 3. Dialogue

**Counting rule applied:** 05 gives no single raw-count formula either, but does
define what a countable node/state must do (line 9-10: "counts only when it adds a
new choice, strategic context, relationship response, discovery, or consequence") —
this is a qualitative rule that cannot be checked by a static count; it is named here,
not applied, since no script in the tree evaluates dramatic novelty.

### Dialogue states

**Count:** 37, matching 05's own baseline line ("...37 dialogue states...", line 19).

**Reproduced by:**
```
grep -c "^    id: '" src/data/dialogueStates.ts src/data/dialogueStates.later.ts src/data/dialogueStates.reaches.ts
# 18 + 12 + 7 = 37
```

Distribution across the 20 characters (`grep -oh "characterId: '[a-z_]*'" src/data/dialogueStates*.ts
| sort | uniq -c`): every character has at least 1 state (7 have exactly 1, 10 have
2, corvin has 4, shadir and duke_armand have 3 each) — enforced live by
`src/game-engine/dialogue/roster.test.ts` (`findCharactersWithoutFallback` must be
empty; unconditional fallback required per 05 line 94).

**Gap vs. release floor** (05 line 30, 85 states): **48 short**.

### Dialogue nodes

**Count:** 131 total, across two schemas.

- `STORY_NODES` (the tree the running game actually uses for character-state
  dialogue, `src/data/dialogue/index.ts:20-23`): **96 nodes**.
- Legacy `DIALOGUES` record (7 trees keyed by faction/village-kind ownership,
  `src/data/dialogues.ts:9-17`, routed by `treeForOwner()` in
  `src/runtime/VisitPolicy.ts:34-54` whenever a resident has no dialogue state): **35
  nodes** (atreides 5, emperor 5, fremen 5, neutral 5, smuggler 6, village_leader 5,
  harkonnen_stronghold 4).

**Reproduced by** (every `DialogueNode` has exactly one `speaker:` field; no
`DialogueChoice` does — confirmed against `src/types.dialogue.ts:10-21`):
```
grep -c "speaker:" src/data/dialogue/act1-palace.ts src/data/dialogue/act1-desert.ts \
  src/data/dialogue/act1-desert-b.ts src/data/dialogue/act2.ts src/data/dialogue/act2-b.ts \
  src/data/dialogue/act3.ts src/data/dialogue/reaches-desert.ts src/data/dialogue/reaches-basin.ts \
  src/data/dialogue/duncan.ts
# 16+11+11+6+12+16+7+12+5 = 96
grep -c "speaker:" src/data/dialogues-atreides.ts src/data/dialogues-emperor.ts \
  src/data/dialogues-fremen.ts src/data/dialogues-neutral.ts src/data/dialogues-smuggler.ts \
  src/data/dialogues-core.ts
# 5+5+5+5+6+9 = 35
```
131 is the count this report stands behind; 05's own baseline line ("roughly ... 140
dialogue nodes") is close but not exact against today's tree — reported as the
measured 131, not adjusted toward 140.

**Schema:** `DialogueNode { id, speaker, text, choices: DialogueChoice[] }`,
`DialogueChoice { id, text, nextId: string | null, effect?: DialogueEffect }`
(`src/types.dialogue.ts:10-21`). One schema, shared by both the story tree and the
legacy `DIALOGUES` trees.

**Validation coverage found** (05's "Content validation" list, lines 262-281):
`src/data/dialogue/act1.test.ts` (against `STORY_NODES`) checks unique node ids,
every declared-state root exists, every choice target resolves, every declared-state
root's graph terminates (BFS from each of the 37 roots), every node has non-empty
speaker/text, every choice has non-empty text and a unique id within its node, spice
costs stay affordable, and any spice-costing choice offers a decline option. This
covers 05 rule 1 (roots exist, reachable choices terminate) for graphs reached
**from** a declared root. It does **not** independently confirm 05 rule 2 (every
authored node is reachable from at least one root) — the BFS starts at roots and
never checks for nodes in `STORY_NODES` that no root or choice ever points at, so an
authored-but-orphaned node would not currently be caught. No test enumerates effect
kinds against runtime handlers (05's effect-contract test requirement, line 175-176).

**Effect-kind usage today** (`grep -rn "<kind>" src/data --include="*.ts" | grep -v
.test.ts | wc -l`, informational, not a 05-defined count): `setFlags` 19,
`spiceDelta` 17, `ritual` 7, `loyaltyDelta` 58, `addFlags` 0, `moraleDelta` 0,
`charismaDelta` 0, `revealLocation` 0, `recruitCharacter` 0. Three of the nine
declared effect properties in `DialogueEffect` (`src/types.dialogue.ts:32-43`) are
never authored anywhere in `src/data`.

**Gap vs. release floor** (05 line 31, 500 minimum / 650 target nodes): **369 short
of minimum** (131 vs. 500), **519 short of target**.

---

## 4. Events (scripted + systemic)

**Counting rule applied:** 05's "Scripted campaign events" (lines 208-232) and
"Systemic event templates" (lines 234-242) each define a required schema (stable id,
act window, once/cooldown, trigger/suppression conditions, presentation owner,
world effects — for scripted; 3+ state-selected variants with cooldown/aggregation
for systemic). No matching data structure exists in the tree, so the honest count is
0 against both schemas, not a raw count of something schema-shaped.

**Count:** **0 scripted campaign events, 0 systemic event templates** matching 05's
definitions exist in the codebase today.

**What exists instead:** a runtime toast/log utility, `src/game-engine/EventSystem.ts`
(`pushEvent(type, message)`, 20-entry ring buffer, no id/act-window/cooldown/trigger
fields — `src/types.ts:62-73` shows `GameEvent { id: evt-N (counter), type, message,
timestamp }`). `GameEventType` has 15 literal categories (`src/types.ts:62-66`:
alliance_offer, betrayal, attack, dialogue_start, dialogue_end, village_selected,
travel_start, travel_complete, faction_decision, tribute_refused, poc_goal_achieved,
sietch_pledged, sietch_task_assigned, spice_shipment_received, fedaykin_ready). 59
call sites (`grep -rn "pushEvent(" src --include="*.ts" | grep -v .test.ts | wc -l`)
push one-line strings from mechanics (raid, harvest, tribute, travel, act
transitions) directly — no stable id, no once/cooldown gate, no suppression
condition, no presentation-owner field, no reaction key. `grep -rln
"cooldown\|onceEvent\|triggerCondition\|suppressionCondition" src/game-engine
--include="*.ts" | grep -v .test.ts` returns no hits; `grep -rn
"eventId\|scriptedEvent\|EVENT_TEMPLATES\|eventTemplate" src --include="*.ts"`
returns no hits outside this search itself.

**Gap vs. release floor** (05 line 32, 60 scripted events at ≥10/act; line 33, 15
systemic templates): **60 short / 15 short** — both categories are unauthored as
distinct content, not partially built.

---

## 5. Asset keys

**Counting rule applied:** 05 has no counting rule for asset keys (its scope is
narrative content); this section is a raw inventory per the task brief, keyed to the
shop/chunk seam documented in `vite.config.ts` and referenced by
`docs/PRD/dune92/04-asset-pipeline.md`.

**Shop roots and release status** (`vite.config.ts:14-18` aliases `@shop` →
`vehicle-shop/`, `@cast` → `character-shop/`, `@land` → `landscape-shop/`; a released
asset is one `src/` actually imports through its alias):

| Shop | Workshop assets | Released into `src/` | Import site |
|---|---|---|---|
| `vehicle-shop/` (`@shop`) | harvester, ornihopter (2) | 2/2 | `src/game-render/machines/Harvester.ts:18-19`, `src/game-render/modes/flight/Ornithopter.ts:22-24` |
| `landscape-shop/` (`@land`) | cliff, sietch (2) | 2/2 | `src/game-render/modes/flight/CliffMassif.ts:36-37`, `src/game-render/modes/location/SietchSet.ts:15-16` |
| `character-shop/` (`@cast`) | chani, duncan, stilgar (3) | 0/3 | none — `grep -rn "@cast" src --include="*.ts*"` returns no import outside comments |

**Chunk naming** (`vite.config.ts:38-64`, `manualChunks`): `vehicle-<dirname>`,
`character-<dirname>`, `landscape-<shopname>` (plus `landscape-<shop>-index` /
`landscape-<shop>-geo` split for `BakeIndex.json`/`BakeGeo.json` payloads specifically),
`three-core`/`three-addons`, `react-vendor`, `state-vendor`, `vendor`. Budgets per
prefix are enforced by `scripts/check-bundle-size.mjs:6-14` (vehicle/character/landscape
capped at 150,000 bytes each).

**Binary art assets shipped to the running game: 0.** Full sweep
(`find public src vehicle-shop character-shop landscape-shop -type f \( -iname
'*.png' -o -iname '*.jpg' -o -iname '*.glb' -o -iname '*.gltf' -o -iname '*.hdr' -o
-iname '*.ktx2' -o -iname '*.webp' \)`) finds only: workshop QA screenshots under
`.shots/` (chani, duncan, stilgar, cliff, sietch, ornihopter), doc reference images
under `vehicle-shop/ornihopter/docs/`, and raw `.glb` feedstock under
`landscape-shop/cliff/feedstock/`, `landscape-shop/sietch/feedstock/`, and
`landscape-shop/feedstock-packs/desert-kingdom/`. None of these paths are imported
from `src/` or copied into `public/`. All released 3D content
(harvester, ornithopter, sietch, cliff) is procedural TypeScript geometry, plus two
"baked" static JSON geometry payloads — `landscape-shop/sietch/src/model/dressingBake.json`
and `landscape-shop/cliff/src/model/{massifBake,massifBakeGeo,massifBakeIndex,dressingBake}.json`
— which are the actual committed binary-equivalent asset data and the reason the
`vite.config.ts` chunk split calls them out by name.

**Audio keys: 1 referenced, 0 backed by a file.** `src/ui/ThreeContainer.tsx:89`
calls `audio.playAmbient('ambient_desert')` — the only `playAmbient()` call site in
`src/` (`grep -rn "playAmbient(" src --include="*.ts*" | grep -v .test.ts`).
`public/assets/audio/` contains only `.gitkeep` (`ls public/assets/audio`). At
runtime, `AudioManager.tryPlay()` (`src/game-render/audio/AudioManager.ts:113-135`)
fetches `assets/audio/ambient_desert.ogg`, gets a 404/decode failure, and falls back
to a synthesised noise bed (`startSynthesised`, line 155-161) rather than silence or
a crash. No recorded ambience exists for any of the 6 ambient-audio-identity
categories 05's location identity contract requires per location (line 186).

**Textures/materials:** no image textures. Sand/sky/atmosphere are procedural
(`src/game-render/materials/sandTextures.ts`, `sandShader.glsl.ts`, `SkyDome.ts`,
`skyEquirect.ts`, `Atmosphere.ts` — shader/canvas-generated, no texture files).

---

## 6. Save-relevant content ids

**Counting rule applied:** 05 has no counting rule here (out of its scope); this
section reports which content-id namespaces a save file embeds, per the task brief,
from `src/game-engine/saveMigration.ts` and `src/types.ts`.

**Save version:** `CURRENT_SAVE_VERSION = 2` (`src/game-engine/saveMigration.ts:13`).
`persistence.ts` serializes the entire live `WorldState` object into IndexedDB
verbatim (`src/game-engine/persistence.ts:27-36`) — there is no separate save schema
distinct from the runtime state shape.

**Content-id namespaces embedded in a save**, all found on `WorldState`
(`src/types.ts:81-121`):

- `villages[].id` / `.kind` / `.regionId` — the 19 location ids (section 1). The v1→v2
  migration (`migrateV1ToV2`, `saveMigration.ts:65-91`) derives a missing `kind` for
  an old save by looking up `CURRENT_KIND_BY_ID`, built from
  `INITIAL_VILLAGES.map(v => [v.id, v.kind])` (`saveMigration.ts:26-28`) — so a save
  can only correctly recover a location's kind if that id still exists in the
  shipped roster; renaming a location id silently breaks old saves for that id
  (falls back to the `'sietch' if id.includes('sietch') else 'field_camp'` guess,
  `saveMigration.ts:51-55`).
- `dialogue: { treeId, currentNodeId, villageId } | null` (`src/types.ts:75-79`) — a
  save taken mid-conversation pins a **dialogue node id** (`currentNodeId`) and a
  **tree id** (`treeId`, one of `story` or the 7 legacy `DIALOGUES` keys). Renaming or
  removing a node/tree id breaks any save frozen inside that conversation; no
  migration path exists for this today.
- `flags: Record<string, boolean | number>` — dotted-key story state, documented at
  `src/types.ts:99` with the examples `act`, `met.shadir`, `beat.duke_revelation`,
  `quota.cycle`. `met.*` and `beat.*` keys embed **character ids** (`met.shadir`) and
  **authored beat ids** (`beat.duke_revelation`) as string fragments — there is no
  allowlist enforcing which keys are legal (05 line 165's "allowlisted narrative
  keys" requirement is not implemented as a checked allowlist in this codebase).
- `act: ActId` — 4 values (`'act1' | 'act2' | 'act3' | 'act4'`,
  `src/game-engine/acts/transitions.ts:8`).
- `ending: EndingId | null` — 5 values (`'win_military' | 'win_ecology' |
  'loss_patience' | 'loss_palace' | 'loss_abandoned'`,
  `src/game-engine/acts/transitions.ts:10-12`) — matches the "both victories and all
  three losses" framing used elsewhere in this pack.
- `spiceFields[].id` — 5 authored ids at save-init (section-1-adjacent; see field
  note below), plus any procedurally generated `field_found_<regionId>_<n>` ids
  created by prospecting (`src/game-engine/economy/prospectRun.ts:68-69`).
- `troopGroups[].id` / `.homeSietchId` / `.locationId` / `.equipmentIds` — 1 seed
  group at init (`src/data/troopGroups.ts:8-20`, `group_tabr_1`), more created by
  `groupsForPledgedSietch()` as sietches pledge.
- `forts[].locationId` — 4 fort ids, all tied to location ids (`carthag` is
  `isCapital: true`; `src/data/forts.ts:9-13`).
- `desertSites[].id` — 14 procedural `site_<n>` ids per game
  (`src/game-engine/desert/sites.ts:80-112`), independent of the save-fixed
  location/character content ids above.

**No `characters[]` array exists in `WorldState`.** Character recruitment/state is
not itself a saved record — `INITIAL_CHARACTERS` is static and re-imported fresh on
load; only `flags` (e.g. a `met.<id>`/recruitment-style flag, if authored) carries
any runtime character state into a save. This matches the "no deterministic
character-state query" gap noted in section 2.

**Field content-authoring gap found via this seam:** of the 5 authored `SpiceField`
entries in `src/data/spiceFields.ts`, 2 start `discovered: true`
(`field_tabr_shallows`, `field_red_wall_pan`) and are reachable; the other 3
(`field_cielago_deep`, `field_tsimpo_drift`, `field_hagg_basin`) start `discovered:
false` and their ids appear **nowhere else in `src`** outside their own definition
(`grep -rn "field_cielago_deep\|field_tsimpo_drift\|field_hagg_basin" src --include=
"*.ts" | grep -v .test.ts` returns only the 3 definition lines). Prospecting
(`prospectRun.ts:66-76`) never reveals these; it fabricates a brand-new
`field_found_<regionId>_<n>` entry instead and pushes it already `discovered: true`.
`src/ui/CrewPanel.tsx:50` filters assignable fields to `f.discovered && f.remaining >
0`, so these 3 authored fields are permanently unreachable in the running game — 3
of 5 authored spice fields (60%) are dead content today.

---

## Summary table

| Category | Today | Release floor (05) | Gap |
|---|---:|---:|---|
| Visitable locations | 19 defined, 6 start reachable / 13 reachable via one reveal path each | 30, each meeting the identity contract | 11 short on count; identity contract unverified per-location for all 19 (shared 6-diorama palette) |
| Core speaking characters | 20 total, 0 tagged core/supporting | 14 core | Contract-unverified for all 20 (no role-tier data exists to check) |
| Supporting speaking characters | (same 20, undifferentiated) | 4–6 | Same as above |
| Dialogue states | 37 | 85 | 48 short |
| Dialogue nodes | 131 (96 story + 35 legacy) | 500 min / 650 target | 369 short of min / 519 short of target |
| Scripted campaign events | 0 (matching 05's schema) | 60 (≥10/act) | 60 short |
| Systemic event templates | 0 (matching 05's schema) | 15 | 15 short |
| Authored spice fields | 5 defined, 2 reachable (3 dead — never revealed) | 18 across 6 regions | 13 short on count; 3 of the 5 existing are unreachable |
| Major authored scene families | 0 (act transitions/endings are single-line toasts, `actRun.ts:52-68`; no character/location/camera-directed scene exists) | 8 | 8 short |

---

## Not countable / not verified by this report

- **05's qualitative counting rule** (line 9-10: a node/location/event "counts only
  when it adds a new choice, strategic context, relationship response, discovery, or
  consequence") is not statically checkable. All raw counts above are structural
  (how many entries exist), not a judgment of which entries would survive this
  filter. A human/lead content review (05's authoring workflow step 8, line 292) is
  the named mechanism for that judgment, and none is recorded in the tree.
- **Full node-graph reachability** (05 content-validation rule 2, line 267-268): the
  existing test (`act1.test.ts`) proves termination from each of the 37 declared
  roots but does not check for authored nodes unreachable from any root — this
  report could not determine from static reading alone whether all 96 `STORY_NODES`
  are actually reachable; that requires running the BFS the other direction (root
  set → visited set → diff against all node ids), which this report did not execute
  as a script (out of scope: no file edits or new scripts were part of this task).
  A future package should add that check rather than assume orphan nodes are absent.
- **Core-role → character mapping** (05 lines 109-132): this report names likely
  candidates by reading names/roles but explicitly declines to assert an authored
  mapping, because none exists in code. Confirming role coverage requires a content
  decision, not a count.
- **Consequence matrix** (05 lines 244-260) and **deterministic fixtures table**
  (05 lines 298-309): not inventoried here — out of this task's six named categories
  (locations, characters, dialogue, events, asset keys, save ids) — but a sibling
  WP00 package should confirm whether any of the 8 named fixtures already exist as
  tests; a first pass of this report's own greps did not encounter
  `dialogue-first-pledge`, `dialogue-tribute-bands`, `dialogue-crew-loss`,
  `dialogue-ecology-route`, `dialogue-final-choice`, `location-required-reveals`,
  `event-once-reload`, or `ending-text-matrix` as literal strings anywhere in `src`.

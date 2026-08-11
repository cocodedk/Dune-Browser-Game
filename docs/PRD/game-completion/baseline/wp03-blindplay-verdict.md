# WP03 Blind-Play Verdict — first-time-player critic

**Package:** WP03 "Title, new run, and opening through Q1"
**Contract:** `03-opening-experience.md`; exit proof in `08-execution-plan.md` §WP03
**Critic:** blind-play critic, fresh context. Premise known: strategy-adventure remake of
DUNE (1992), House Atreides on Arrakis, Fremen, spice, tribute. Nothing else.
**Method:** two cold runs in Playwright at `http://localhost:5174/` (plain URL, **no**
`?debug=1`, no `window.__DUNE__`, no source file opened until both runs ended). One tab,
browser closed at each run boundary. Viewport 1600×900.
**Recorded at:** branch `feat/game-completion`, HEAD `9ba9488`.

> **Tree caveat.** At session start this checkout was on `feat/character-shop` with
> `saveMigration.ts` dirty; by write time a concurrent session had moved it to
> `feat/game-completion` @ `9ba9488`. The dev server serves this working tree, so the exact
> commit under my two runs is not pinned. Mitigation: every shared beat produced *identical*
> numbers and text across both runs (90 due / 12 days / 60 stock, same float bug, same copy),
> so the runs were behaviourally consistent with each other. An auditor should re-confirm
> against a pinned commit.

---

## Verdict at a glance

| | |
|---|---|
| **Score — is this opening understandable and correct for a first-time player** | **7 / 10** |
| **Status warranted (blind-play half)** | **`in_progress`** |
| **Biggest gap** | No player pause control anywhere, despite it being a named WP03 scope item |
| **Acceptance criteria I could judge** | 2, 3, 6, 7, 8 pass; **4 fails**; 1 and 5 not testable blind |
| **Exit-proof contribution** | 2 of the 5 required internal dry runs; **both completed Q1 without debug state** |

Comprehension is the strong half and it is genuinely good — I could state my objective, my
deadline, and my next legal action at nearly every moment of both runs, from a cold start,
with no external instruction. The ledger is the best thing here. Correctness is the weak
half: nothing softlocked and no button was dead, but the single most trust-critical screen
in the opening — the Q1 settlement modal — carries three defects at once, and the missing
pause control actively changed my Run 1 outcome.

---

## 1. Run logs

### Run 1 — Reserve line. 13:36:37 → 13:48:24 (**11.8 min**), Normal, Q1 paid 63 of 90

| Wall | Game | Beat |
|---|---|---|
| 13:36:42 | — | Title: `New Campaign` / `Load Campaign` / `Settings`, version `v1.0.0`. No stale save. |
| 13:36:53 | — | Difficulty panel. One plain sentence each, `Internal multipliers` expander, Normal pre-selected. |
| 13:37:10 | day 0, 0:00 | Start. Opens directly into Duke Leto. **Premise understood inside ~20 s** — tribute, Fremen, Red Wall Sietch, all in one paragraph. Objective banner reads "Hear the Duke's briefing". |
| 13:39:40 | day 0, 0:00 | First in-fiction choice (3 replies). Picked "understand the numbers first". |
| 13:40:00 | day 0 | Thufir: deadline = "the twelfth day from now". |
| 13:40:56 | day 0, **0:05** | Thufir ends → **tribute ledger appears**: 90 due / 12 days / in stock 60.0 / projected 60 / "short by 30" / "no crews are harvesting". Objective → "Travel to Red Wall Sietch · Reachable on foot from Arrakeen, by way of Hagg". **The whole 3.8-minute briefing advanced the clock by 5 game-minutes — dialogue holds time.** |
| 13:41:35 | day 0 | Travel to Hagg. Set 5×. |
| 13:42:14 | **day 5** | Inside Hagg. Five days gone to my own reading, because the clock runs at 5× whenever no dialogue is open. |
| 13:44:11 | **day 8** | Red Wall Sietch. Stilgar auto-dialogue with full portrait. Panel: Loyalty 55 / need 60, Pledges 0/2. |
| 13:44:29 | day 8 | Reply "we share the same sand" → loyalty 55 → 60. |
| 13:44:58 | day 8 | **First pledge.** Confirmation explains what a pledge means before committing. |
| 13:45:41 | day 9 | **First crew order** → `red_wall_pan`. Changeover cost disclosed. |
| 13:46:13 | day 9 | Ledger → "short by 27 · 1.6 spice per day at current orders". **Dilemma presented: Reserve vs Invest.** Chose Reserve. |
| 13:47:16 | **day 12** | **Q1 settlement modal.** due 90 / in stock 63 / minimum partial 54. |
| 13:48:24 | day 12 | **Q1 resolved** paying 63. Fenring responds; 33 arrears. Objective → "Act 1 continues". Cycle 2 opens: 183 due / 8 days. |

### Run 2 — Invest line. 13:49:40 → 14:00:57 (**11.3 min**), Normal, Q1 paid 54 (minimum)

| Wall | Game | Beat |
|---|---|---|
| 13:49:15 | — | Title now offers "Continue — Day 12 — saved 1m ago". **Autosave works.** `New Campaign` → "This will replace your existing campaign (Day 12…). This cannot be undone." + `Replace and Start (Normal)`. Good guarding. |
| 13:49:56 | day 0 | Took the *other* Leto reply ("The Fremen won't simply hand it to us") → genuinely different prose, converges on Thufir. Leto: "Trust is earned at **walking distance** from here." |
| 13:50:46 | day 0 | Ledger read. Identical figures to Run 1. |
| 13:51:31 | **day 0** | Red Wall Sietch — still day 0, because I moved fast at 1×. Took the *other* Stilgar reply (transactional "fair exchange") → different prose, **identical loyalty 60**. |
| 13:52:23 | day 1 | First pledge (**2.7 min** from start — the clean measure; Run 1's 8.4 min was inflated by my note-taking). |
| 13:52:44 | day 1 | First crew order. Ledger → short by 14. Dilemma presented. Chose **Invest**. |
| 13:53:17 | day 1 | Sietch Tabr. Chani: "trust is not a thing you win in one conversation… it runs through the same stores the Emperor is already asking you to empty." Tabr Loyalty 45 / need 60, Pledges 1/2, pledge **disabled** with reason + two named recovery routes. |
| 13:54–13:56 | day 2 | Ramallo states the trade numerically: "twenty measures spent for eight measures of loyalty gained… the same spice the ledger is counting toward your tribute." Chani conversation nodes raised loyalty 45 → 50 → 56, **free**. Re-running an exhausted node gives 0 (no exploit) but replays identically with no signal it is spent. |
| 13:56:29 | day 2 | **First costly economic choice:** Gift spice (20) → loyalty 56 → 64. |
| 13:57:21 | day 3 | Second pledge + second crew → `tabr_shallows`. |
| 13:59:48 | **day 12** | **Q1 settlement.** due 90 / in stock 66 / minimum 54. Chose **Minimum (54)**. |
| 14:00:33 | day 12 | **Q1 resolved.** 45 arrears, 12.2 spice left. Cycle 2: 195 due / 8 days. |

---

## 2. Comprehension — could I state objective, deadline, next action?

Yes, at every checkpoint except one. Tested continuously; the acceptance bar (a first-timer
states all three after ten minutes) is **met comfortably** — I could state all three from
minute one.

| Moment | Objective? | Deadline + consequence? | Next legal action? |
|---|---|---|---|
| Day 0, Leto | yes | "first tribute", day not yet given | yes (choose a reply) |
| Day 0, Thufir | yes | **yes — day 12**, and full/partial/short consequences stated | yes |
| Ledger appears | yes | yes, numerically: 90 / 12 days / short by 30 | yes ("Travel to Red Wall Sietch") |
| **Inside Hagg** | yes | yes | **partly — see below** |
| Red Wall, Stilgar | yes | yes | yes (loyalty 55/60 → what to do is explicit) |
| After pledge | yes | yes | yes ("Your new crew stands idle until you assign a field") |
| Before Q1 | yes | yes, with live progress "60 / 90" | yes, **and two named plans** |
| Q1 modal | yes | yes, each option's arrears previewed | yes |

**What made it work.** The persistent objective banner carries a verb-first sentence, at
most two substeps, numeric progress (`60 / 90`), `Show` and `Why?` actions, and a ticked
history of completed steps. That surface alone answers "what now" at a glance, which is
exactly what `03` line 198-207 asks for. The ledger answers "how am I doing" without
arithmetic. Refusals name their own cure ("They do not trust you enough yet. Speak with them
again, or offer a gift"). This is well above the bar for a strategy opening.

**Where I was left guessing.**

1. **Inside Hagg (the one real gap).** The location detail panel stayed pinned to
   **Arrakeen** — Arrakeen's population, stockpile, loyalty, and a "Travel to Arrakeen · 6s"
   button — while the header said "Inside Hagg". There was no Hagg panel, no Hagg stats, and
   no `PEOPLE HERE` list, so the *only* affordance to talk to anyone in Hagg was a
   canvas-drawn `Speak` label. It is not in the DOM and not in the accessibility tree
   (`browser_find` returns nothing; a `text=Speak` locator matches only event-log entries).
   I could not reach it and routed around it. At Red Wall and Tabr the same panel correctly
   showed the current location and its `PEOPLE HERE` list gave a proper DOM path — so the
   root cause is the **stale location panel at Hagg**, not a global absence of DOM speak
   paths. Time lost: ~2 minutes, under the 3-minute stuck threshold.
2. **Thufir's scene is all adjectives, no numbers.** He is introduced as having "the figures
   exactly, to the measure", then says "a smaller number than you would like", "short, yes",
   "the honest gap" — without ever stating one figure. The numbers arrive only when the
   ledger panel appears at the end. It resolves, but the scene's own promise is unmet while
   it plays.
3. **"Watch the pips on the ledger"** — "pips" is never defined and nothing in the ledger is
   labelled a pip. (The `●●●` patience dots are presumably meant.)
4. **Two different spice numbers** sit on screen at once with no explanation: the top-bar
   `spice 60.0` (house stock) and Arrakeen's `Spice stockpile 5.0` (a location's own store).
   The ledger uses the first. I inferred the distinction; it is never stated.
5. **Conversation loyalty is silent.** A gift previews "Costs 20 spice · +8 loyalty". A
   conversation that grants +5 or +6 shows nothing at all — no float, no log line. I only
   discovered talking was worth loyalty by re-reading the panel afterwards, and I briefly
   concluded the gate's "speak with them again" advice was broken before I found it wasn't.

---

## 3. Correctness — what behaved wrongly

Nothing softlocked, no button did nothing, no text named a thing that does not exist, and
the console carries **no functional errors** (6 in Run 1, 5 in Run 2: favicon 404s plus
React "don't mix shorthand and non-shorthand style properties" warnings from
`src/ui/StatusBar.tsx` and `src/ui/PledgePanel.tsx`; one warning fires per speed-button
click). The defects below are real but non-blocking.

**C1 — Raw float in the settlement amount input.** Reproducible in both runs. The custom
amount control pre-fills with unrounded stock: `63.206138100000004` (Run 1) and
`66.1774507469833` (Run 2). Clicking `Minimum` writes a clean `54`, so the bug is specific
to the `Full` prefill. Every other number in the UI is integer or one decimal. This is the
most conspicuous polish failure in the build, on the most important screen.

**C2 — `Full (63)` is the wrong word.** 90 is due; the button labelled "Full" pays 63 and
carries 33 arrears. It means "all you hold", not "the full sum" — and Fenring's reply
immediately afterwards says "**Not the full sum**", contradicting the button the player just
pressed. Note the modal *does* disclose each option's arrears before committing, so this is
a naming defect, not a trap.

**C3 — The ledger contradicts itself at settlement.** In both runs, at the moment the Q1
modal opened, the ledger subtitle read **"no crews are harvesting"** while the crew panel
showed both crews as "Harvesting field_red_wall_pan" / "Harvesting field_tabr_shallows", and
the projection above it was computed *from* that harvest. Reproducible. The same line also
lags: after ordering a second crew it still read "1.6 spice per day at current orders" while
its own projection implied ~2.7/day; it caught up to 2.9/day several days later.

**C4 — The disabled-travel reason is misleading.** From Arrakeen, Red Wall Sietch is
disabled with "**Too far without a long-range ornithopter.**" That reads as an equipment
gate the player cannot pass. The real gate is distance from where you stand: one hop to Hagg
and Red Wall is enabled at 4s. Two other surfaces contradict the reason directly — the
objective banner ("Reachable **on foot** from Arrakeen, by way of Hagg") and Leto himself
("Trust is earned at **walking distance** from here"). A first-timer can reasonably conclude
they are blocked and go hunting for a vehicle.

**C5 — Internal identifiers leak into the UI.** Amid otherwise careful prose, the crew panel
shows crews named `red_wall_sietch` / `sietch_tabr` and fields `red_wall_pan`,
`tabr_shallows`, status "Harvesting `field_red_wall_pan`", and a confirmation titled
"ORDER: HARVEST **FIELD_RED_WALL_PAN**". Also "yield unclear" as a status reads like a
placeholder.

**C6 — Coach marks overlap the content they point at.** The "Assign this crew" mark sat on
top of the order confirmation and hid part of its body text; "Travel here" covered the
Arrakeen destination row; "Check the ledger" covered the sound toggle; "Settle the tribute"
covered a line of the settlement modal. `03` line 211 requires a coach mark to "never block
the rest of the screen".

**C7 — The most expensive action is the least guarded.** Pledging asks for confirmation.
Issuing a crew order asks for confirmation. **Spending 20 spice — a third of the treasury,
straight out of the tribute — applies instantly with no confirmation.**

**C8 — Dialogue choices are cosmetic at Q1.** Both Leto replies and both Stilgar replies
produce genuinely different, well-written prose, then land on **exactly** loyalty 60 either
way. `03` line 128-129 permits this ("not in whether the tutorial can continue") but
requires the two to "differ in later acknowledgement — solidarity versus transaction". I saw
no differing acknowledgement anywhere through Q1.

**C9 — Arrears carry an unnamed 25% surcharge.** Full 66 → 30 arrears (short 24); Minimum 54
→ 45 arrears (short 36); Run 1's 63 → 33 arrears (short 27). All three are exactly
`shortfall × 1.25`. Consistent and correct, and each option's arrears *is* shown before you
commit — but the ledger says "SHORT BY 24" and then charges 30, and the 25% rate is never
named. Fenring's "with its interest" is the only hint.

**C10 — Narrative/mechanics mismatch.** Chani says "You walked here from **the thopter** in
the open", but the travel UI insists I have no long-range ornithopter and I arrived on foot.

**Non-defects I checked and cleared.** Repeating an exhausted dialogue node grants no
further loyalty (no infinite-loyalty exploit — it just replays the text). Autosave restored
correctly. Arrears carried into cycle 2 exactly as stated (33 → 183 = 150 + 33; 45 → 195 =
150 + 45). The HUD clipping I first saw was my own 1568×586 viewport, not a build defect; at
1600×900 the layout is clean.

---

## 4. The dilemma — acceptance 3

**Before Q1 resolved I could name both plans and the case for and against each.** This is
the opening's strongest single design moment.

The game presents them explicitly, as two bullets under the objective, plus live progress:

> **Prepare to meet the first tribute**
> · **Reserve:** keep the field worked, spend nothing further
> · **Invest:** visit Sietch Tabr, build trust, and gain a second crew
> **60 / 90**

- **Reserve — attractive** because every spice stays in the pile the Emperor is counting,
  and one crew already narrows the gap from 30 to 14. **Risky** because one crew at ~1.6/day
  cannot close the gap by day 12 in any case, so you are choosing to arrive short and eat
  arrears, and you enter cycle 2 with a single crew.
- **Invest — attractive** because a second crew roughly doubles daily yield (I measured 1.6
  → 2.9/day), which is what cycle 2's much larger demand needs. **Risky** because Tabr starts
  at loyalty 45, not Red Wall's 55, so the gift is 20 spice a throw out of the exact stock
  the tribute is counting — and it is due in days, while the crew pays back over weeks.

Crucially the fiction says this too, not just the UI. Ramallo gives the exact rate and names
the conflict ("That is the same spice the ledger in Arrakeen is counting toward your
tribute. Spend it here, and you spend it nowhere else"), and Chani refuses to pick for you:
"**Neither road fails you outright — the choice is only ever yours to make.**" Both lines
land. `03` line 174's "must not script the decision" is honoured.

Both lines were viable through Q1 (`03` line 268, acceptance 6): Reserve settled at 63/90
with 33 arrears, Invest reached 66 and settled at 54 with 45 arrears. No softlock either way.

---

## 5. Timing vs the spec's pacing targets

| Beat | `03` target | Run 1 | Run 2 (clean) |
|---|---|---|---|
| 1 — assignment | 0–5 min | ~0.6 min | ~0.3 min |
| 2 — read the pressure | 3–8 min | 4.3 min | 1.1 min |
| 3 — first expedition | 6–12 min | 7.6 min | 1.9 min |
| 4 — earn and verify trust | 9–15 min | 8.4 min | 2.7 min |
| 5 — put people to work | 11–18 min | 9.1 min | 3.1 min |
| 6 — first dilemma | 15–30 min | 9.6 min (declined) | 6.8 min (gift) |
| 7 — settle Q1 | 25–40 min, ceiling 45 | **11.8 min** | **11.3 min** |

In Run 2 — the clean measure, where I was no longer stopping to take notes — every beat lands
**2–3× earlier than target**. Run 1 is less clear-cut: beats 2 (4.3 min) and 3 (7.6 min)
actually sit *inside* their target bands, inflated by my note-taking rather than by content.

The headline that holds for **both** runs is beat 7: **Q1 completes in ~11–12 minutes against
a 25–40 minute window** (`03` line 5, line 179) — about a quarter of the specified duration.

Two caveats, in opposite directions. My agent pace is faster than a human reading every
line — a first-timer who actually reads would be meaningfully slower. But the structural
point survives that: **the opening's length is controlled by the speed button, not by its
content.** Twelve game days at 5× is roughly two minutes of wall-clock; at 1× a day runs
~50 s, so ~10 minutes. There is no path by which this content fills 25–40 minutes unless the
player deliberately dawdles at 1×. Whether that is a defect or a stale target is a design
call, but the spec's pacing table does not describe what the build does.

---

## 6. Emotional read — blunt

**What clicked.** The cold open is excellent. Dropping straight into Leto with no menu
throat-clearing, and having him name the trap, the tribute, and the Fremen in one paragraph,
told me what game I was playing faster than any tutorial would have. The ledger is the star:
watching "short by 30" become "short by 27" become "short by 14" as I pledged and ordered is
the entire economy taught without a single line of instruction. Stilgar's arrival — portrait,
name, "why should Red Wall put its water and its hands behind your name?" — genuinely landed.
And the Tabr scene is the best writing in the build; Chani and Ramallo explain a *mechanic*
in character, with real numbers, without either of them sounding like a tooltip.

**What confused.** Hagg. I walked into a room, was told to click something I could not find,
and read Arrakeen's statistics on a panel headed "Inside Hagg". Also the ornithopter message,
which sent me looking for a vehicle when I needed a walk.

**What dragged.** Nothing dragged in content terms — if anything it is over too fast. What
dragged was *time pressure applied to reading*: in Run 1 I lost eight of twelve days to
thinking, because there is no way to stop the clock. Run 2 finished with 11 days of runway
purely because I clicked faster, not because I played better. That is backwards.

**What deflated.** The settlement. It is the payoff of the whole opening and it shows a
15-decimal float, a button labelled "Full" that isn't, and a line insisting no crews are
harvesting while both of mine were. Then paying the bare minimum (54, 45 arrears) produced
the *word-for-word identical* Fenring speech as Run 1's near-full 63. After ten minutes of
being told this choice matters, the game reacted to both choices the same way.

---

## 7. Spec comparison — `03-opening-experience.md`, clause by clause

### Met

| Clause | Evidence |
|---|---|
| L37-45 title controls | `Continue` (appeared once a save existed), `New Campaign`, `Load Campaign`, `Settings`, `v1.0.0` all present. |
| L47-50 difficulty | Three options, one plain sentence each, `Internal multipliers` expander, Normal default, written once — the overwrite dialog even re-states "(Normal)". |
| L17-30 starting contract | Arrakeen, day 0, spice 60, 0 pledges, 0 crews, Q1 90 on day 12, Normal. Matches exactly. |
| **L20 "simulation paused for the briefing"** | **Met.** The full Leto+Thufir sequence took 3.8 wall-minutes and advanced the clock 0:00 → **0:05**. Dialogue holds time. |
| L32-33 no events before briefing ends | Nothing fired. |
| L56-70 progressive disclosure | Ledger appeared exactly when Thufir explained it; destinations after the briefing; crew panel on first pledge. Market/ecology/training/strongholds never appeared. No faction panel, no "Villages 0/19". |
| L96-106 ledger reveal order | Amount, due day, stock, projection, shortfall, and patience consequences — all present, in order. |
| L104 "60 available; short by 30" not "0 income" | Verbatim: `in stock 60.0 / projected by deadline 60 / short by 30`. |
| L112 accessible destination list | Present, with travel time and who is known there. |
| L127 either reply reaches the threshold | Both do (→ 60). |
| L132-138 pledge presentation | Loyalty numeric **and** a bar; threshold "need 60" visible; capacity "Pledges 0/2"; control enabled only on both checks; confirmation explains responsibility for one crew. Textbook. |
| L146-152 crew presentation | Home, location, 15 hands, morale 55, skill 30, one ★ recommended field, projected range, and the one-day changeover disclosed before confirming. |
| L154 order changes projection immediately | 60 → 76 projected, short by 30 → 14, instantly. |
| L158-163 two valid plans | Presented verbatim as Reserve / Invest. |
| L169-175 Tabr teaches the cost, both plans legal | Chani + Ramallo, previewed gift cost and gain, decline stays viable. |
| L181-187 settlement contents | Due, stock, minimum partial, full result, per-option arrears, custom amount control, consequence before confirming. |
| L191 auto-shipment off by default | `auto-ship in full` appeared unchecked. |
| L193-194 completion behaviour | Objective → "Act 1 continues: strengthen your position before the next tribute", autosaved (Continue — Day 12), no victory overlay. |
| L198-207 objective surface | Verb-first sentence, ≤2 substeps, `Show`, `Why?`, numeric progress, compact ticked history. Never a raw flag or act ID. |
| L221 pledge below 60 | Disabled + "Loyalty 45 / need 60" + two named recovery routes, both of which worked. |
| L224 waits with no crew order | "Put your first crew to work · Your new crew stands idle until you assign a field". Never auto-assigned. |
| L225 cannot fully pay | Partial settlement legal, arrears explained, campaign continued. Both runs. |
| L229 no unrecoverable loss | Confirmed both runs. |

### Failed or unmet

| Clause | What I got |
|---|---|
| **L62 "Position, pause, save, objective"** + **plan L123 "…Continue, load, pause, and opening save behavior"** | **No pause control exists.** Speed offers only `1×` / `2×` / `5×`. See §8. |
| **L266 acceptance 4 — "Every required opening action has a visible legal path without clicking a canvas marker"** | **Fails at Hagg.** `Speak` and `Depart` are canvas-drawn only; the location panel was stale-pinned to Arrakeen, so no `PEOPLE HERE` list and no DOM path existed there. (Passes at Red Wall and Tabr.) |
| **L189 "Count Fenring delivers a state-specific response; Thufir gives a one-paragraph operational summary"** | **Fails twice.** Fenring's line is word-for-word identical for 63/90 (33 arrears) and 54/90 (45 arrears). **Thufir gave no summary at all** in either run. |
| L211 coach mark "never blocks the rest of the screen" | Four separate marks overlapped the content they pointed at, one hiding confirmation-dialog body text. |
| L113-116 travel preview → **confirm** → flight sequence, unskippable 3 s, then a visible `Skip` | **No confirm step** (one click travels) and **no flight sequence or `Skip` control** was ever shown. The row does preview time and residents. |
| L27 known destinations "Arrakeen, Red Wall Sietch, Sietch Tabr" | **Hagg** is a fourth opening destination not in the contract, and it is the mandatory intermediate hop. |
| L128-129 replies "differ in later acknowledgement" | No differing acknowledgement observed through Q1; both land on identical loyalty. |
| L156 "must never claim the crew is already producing while changeover remains" | Inverted failure: at settlement the ledger claimed **"no crews are harvesting"** while both crews were harvesting. |
| L154-155 order shows the cause: "crew name, field, changeover, then expected contribution" | Only a single aggregate line ("1.6 spice per day at current orders"); no per-crew breakdown. |
| L134 "charisma capacity of 2 … visible" | Shown as "Pledges 1/2" — arguably clearer, but the word *charisma* never appears in the UI, and L24 makes charisma the underlying stat. |
| L5 / L179 "25–40 minutes" | 11.8 and 11.3 minutes. See §5. |
| L207 raw flag names | Honoured for objectives, but violated in spirit by `red_wall_pan` / `FIELD_RED_WALL_PAN` in the crew UI. |

### Not testable blind

Acceptance 1 (state matches the simulator — needs engine inspection) and acceptance 5
(idempotency across double-click and reload — needs deliberate abuse I did not perform).

---

## 8. Biggest gap — no pause control

**There is no way to stop the clock.** The speed control offers `1×`, `2×`, `5×` and nothing
else. `03` line 62 lists **pause** among the surfaces present on the initial Arrakeen view,
and `08-execution-plan.md` line 123 names pause as an explicit WP03 build item. It is absent.

This is not cosmetic — it changed my outcome. Dialogue *does* hold time (Run 1's whole
briefing cost 5 game-minutes), so the problem is everything *between* conversations: reading
the ledger, comparing the two plans, choosing a field. In Run 1 I burned **days 0 → 8 of a
12-day deadline** doing exactly that at 5×, which cut my harvest window from ~11 days to 3
and forced a worse Q1 than the design intends. In Run 2 I finished with 11 days of runway
having played no better — only faster. The opening's own acceptance bar asks a first-timer to
*understand* things; the build charges them deadline for the time spent understanding, and at
5× charges roughly a game-day per twelve seconds of thought.

**Concretely actionable:** add a pause (`0×` / spacebar) to the existing speed control in
`src/ui/StatusBar.tsx`, and default the opening to paused whenever a decision surface —
ledger, dilemma, crew assignment, settlement — is the active objective.

Runner-up, if a second is wanted: the **settlement modal cluster** (C1 raw float + C2 "Full"
mislabel + C3 "no crews are harvesting"), because all three land together on the one screen
the entire opening is built to reach.

---

## 9. Not verified by this report

Recorded so the auditor knows the coverage limits:

- Keyboard-only traversal (`03` L255-256) — not attempted, though the canvas-only `Speak`
  makes the Hagg step a likely failure.
- Reload during flight and reload during pending settlement (L254; `opening-reload-pending`).
- Double-click / reload idempotency of pledge and settlement (acceptance 5).
- The custom-amount control's bounds — I used only the `Full` and `Minimum` presets, never
  typed a custom value, so clamping to available spice and total due is unverified.
- The `Why?` and `Show —` buttons — present on every objective, never clicked.
- Guidance-off start (`opening-guidance-off`), charisma cap (`opening-charisma-cap`),
  low-trust refusal at exactly 59 (`opening-low-trust`), and short payment below 54
  (`opening-short-payment`).
- Easy and Hard difficulties.
- Whether Leto's and Thufir's dialogue cards carry finished portraits (L89-90). Stilgar,
  Chani, Ramallo, and Fenring demonstrably do; I failed to capture the Arrakeen scene at
  readable resolution before moving on, so I make no claim either way.

## 10. Handoff to WP04 — not scored here

Cycle 2 opens at **183 spice due in 8 days** (Reserve line) / **195 in 8 days** (Invest line)
against a measured ~2.9 spice/day from two crews — roughly 23 spice of income against a
161-170 shortfall. That looks unreachable, and `03` line 229-230 requires a disastrous
settlement to "lead into a documented recovery state rather than a forced restart". I am
**not scoring this against WP03**: `08-execution-plan.md` line 48 assigns opening balance to
WP04, and line 135 states M1 is reached "only when WP04 also proves the arithmetic". Flagged
for that package.

---

## 11. Exit-proof contribution

`08-execution-plan.md` line 133 requires "Five internal dry runs can complete Q1 without
debug state." These two runs count toward that:

| Run | Line | Q1 outcome | Wall-clock | Debug state used |
|---|---|---|---|---|
| 1 | Reserve | Settled, paid 63 of 90, 33 arrears | 11.8 min | **None** |
| 2 | Invest | Settled, paid 54 of 90 (minimum), 45 arrears | 11.3 min | **None** |

Both runs were played on the plain URL with no `?debug=1`, no `window.__DUNE__` call, no
`browser_evaluate`, and no source file read until both runs had ended and the browser was
closed. **2 of 5 delivered; both pass.**

---

## 12. Verdict

**Score: 7 / 10** for "is this opening understandable and correct for a first-time player."

Understandable: this would score 9 on its own. I arrived knowing one paragraph about the
game and was never once unsure what I was trying to do, when it was due, or what happened if
I missed it — except for two minutes in Hagg. The objective surface, the ledger, and the
refusal copy are all doing real teaching work, and the Reserve/Invest dilemma is presented
better than most shipped strategy games manage.

Correct: this would score 5. Nothing breaks, but the numbers contradict each other at the
settlement screen, internal identifiers are on display, the travel gate lies about why it is
closed, and the game reacts identically to a near-full payment and a bare-minimum one.

**Verdict: `verified` is not warranted on the blind-play half. WP03 remains `in_progress`.**

Three named contract clauses fail — acceptance 4 (L266) at Hagg, the state-specific
settlement response and Thufir summary (L189), and the coach-mark blocking rule (L211) — and
one explicit WP03 scope item, pause, was never built. None of these is deep; every one is a
day's work or less, and the foundation underneath them is genuinely good. I would expect a
delta re-audit after the pause control, the settlement-modal cluster, the Hagg panel, and the
ornithopter copy to clear `verified` comfortably.

*The evidence auditor's verdict is the other half of this decision; this report judges only
what a first-time player can see and do.*

---

## Delta re-check (findings-verifier, HEAD `0a572b1`)

**Method.** Two fresh campaigns played on the plain URL (`http://localhost:5174/`, no
`?debug=1`, no `window.__DUNE__`, no game debug API), one tab, browser closed at each run
boundary, 5× used for waits. `browser_evaluate` was used only twice, both to read rendered
DOM text/attribute values already visible on screen (a settlement input's `.value`, some
button `.textContent`) to settle an ambiguous decimal-formatting question — never to call a
game API or mutate state. Source (`SettlementModal.tsx`, `opening-q1-debrief.ts`) was read
after play to confirm formatting logic and enumerate dialogue variants, not to change the
verdict on anything not independently observed live. Tree note: at review time `git status`
showed only `docs/PRD/game-completion/baseline/wp03-critic-verdict.md` (the sibling evidence
report) modified — nothing under `src/` was dirty, so the dev server was serving `0a572b1`
cleanly for this checkout, unlike the tree caveat on the original report.

The first campaign hit a blocking bug at the very first travel action (see the new finding
below) and was abandoned after confirming the bug did not recover; the second campaign
avoided the trigger and carried through to Q1 settlement and debrief. A third, minimal
campaign isolated the trigger precisely (see below).

### Per-finding results

| # | Finding | Verdict | What I saw |
|---|---|---|---|
| 1 | Pause (0×) + spacebar freezes the day/time readout | **Verified** | `0×` sits beside `1×/2×/5×`. Engaged while the tribute ledger was open: day/time held at `0:09` across two separate 5–6 s real-time waits (10 s total), no drift. Spacebar toggles pause off (clock resumed) and back on (clock re-froze, confirmed with a further 6 s wait) — both the button and the keyboard shortcut work correctly **in isolation**, i.e. when no travel is initiated while paused. See the new regression below for the one way this breaks. |
| 2 | Hagg DOM path — location panel follows arrival | **Verified** | Travelled Arrakeen → Hagg with 5× confirmed active before departure. On arrival the header read "Inside Hagg", and the location panel updated to heading "Hagg", "House Atreides", `PEOPLE HERE`: **Shishakli** and **Liet-Kynes** as real DOM buttons (present in the accessibility tree, clickable), Population 320, Spice stockpile 8.0, Loyalty 60. No canvas-only control was needed to reach either resident. |
| 3 | Settlement modal: one-decimal prefill · honest "Pay all available" label · no duplicate preview rows | **Verified (prefill and label live; duplicate-row guard source-confirmed only)** | At day 12, stock 68 vs due 90: the preset button read **"Pay all available (68)"**, not "Full" — `SettlementModal.tsx` line 73 gates the label on `legalRange.max >= amountDue`, matching Fenring's later "not the full sum" line instead of contradicting it. The custom-amount input's live value was `"68"` — read via `.value` on the DOM element itself, not a rounded display trick; `SettlementModal.tsx` line 144 computes it as `Number(defaultSettleAmount(pending).toFixed(1))`, i.e. genuinely rounded to one decimal (the old bug was 15 raw digits: `63.206138100000004`). The apparent absence of a decimal point is `Number(68.0)` rendering as `68` in a numeric input — normal, not a formatting regression. The **duplicate-preview-row guard** (`minimumOutOfReach`, lines 80/108/118–124: when stock can't cover even the minimum, show one honest row plus an "out of reach" line instead of two identical rows) is implemented correctly and reads exactly to the checklist's spec, but my run's stock (68) exceeded the 54 minimum both times, so this branch was **not triggered live** — confirmed by source reading only. |
| 4 | Debrief cannot be skipped; Fenring reads as "bare minimum"; Thufir's summary follows | **Verified** | Settled at the minimum (54/90, 45 arrears). Fenring's line: *"The bare minimum, my lord, and not a measure more. The Emperor accepts it — this time — but a habit of scraping the floor is not one I would recommend to him. The rest is noted, with its interest."* — visibly distinct from the near-full variant (`q1_debrief_partial_near` in `opening-q1-debrief.ts`: *"Not the full sum, but close enough that I will not trouble the Emperor with the difference…"*), confirming two partial variants exist as claimed. At Fenring's line there was **no `×` in the DOM at all** (searched, zero matches) and **Escape produced no change** — the same dialogue was still showing afterward. Only after clicking through to Thufir's line ("The first tribute is closed, but not cleanly — what we didn't pay is carried forward as arrears, with the usual surcharge added on top…") did a `×` "Close" button and an "…or press Esc to step away" hint appear — i.e. the debrief is un-skippable until Thufir's operational summary has actually been delivered, which is the correct behaviour. |
| 5 | Travel-refusal copy names the real adjacency rule, not just a missing ornithopter | **Verified** | From Arrakeen, both Red Wall Sietch and Sietch Tabr showed: *"Out of walking range from here — travel through a closer place first, or wait for a long-range ornithopter to go directly."* Distance-through-Hagg is now stated as the primary, actionable cause; the ornithopter is offered as an alternative, not the sole blocker — consistent across both destinations, both campaigns, and unchanged from the objective banner's own "Reachable on foot from Arrakeen, by way of Hagg." |
| 6 | Field/crew names read as display names, never raw ids | **Verified** | Crew panel field buttons read "Tabr Shallows" and "Red Wall Pan ★"; the order confirmation read "Order: harvest Red Wall Pan"; the crew status line read "Harvesting Red Wall Pan · yield unclear"; the event log read "Crew ordered to harvest Red Wall Pan." A page-wide regex search for `field_|FIELD_|_pan|_shallows` after assigning a crew and running several ticks returned **zero matches**. |

### New regression found in this session — pause + travel = permanent softlock

Not one of the six named findings, but directly implicates finding 1's own feature, so it
belongs in this delta.

**Reproduction (isolated, minimal):** new campaign → click through to the point the
destinations list unlocks (Hagg enabled, still mid-Thufir dialogue) → click `0×` → **confirm
via snapshot that `0×` shows `[pressed]`** → click **Hagg**. Travel begins (event log logs
"Traveling to Hagg…"), but day/time stay pinned at `0:00`. Waited 8 s: no change. Clicked
`5×` (visually goes `[active]`, `0×` stays `[pressed]` simultaneously — the two controls
disagree with each other): waited 6 s more, no change. Pressed spacebar: waited 5 s more, no
change. **The clock never resumes by any control.** A second, independent reproduction
earlier in the session (travel initiated moments after a `5×` click with no confirming
snapshot in between) produced the identical symptom, then **survived a full page reload** —
the autosave at "Day 0" restored the exact same frozen `under way` state, and 5×/1×/2× clicks
against the reloaded state were equally inert. The only recovery was abandoning that campaign
and starting a new one.

By contrast, when `5×` was confirmed active (via snapshot) *before* clicking a destination,
travel completed normally in both later campaigns (arrival at Hagg, then Red Wall Sietch,
worked cleanly with no stall). So the trigger is specifically: **initiate travel while the
simulation is genuinely paused.** This is a highly reachable sequence for a real player —
pausing to read the ledger (exactly what this checklist's own finding 1 asks a player to do)
and then, still paused, clicking the destination you just decided on, is a natural next
action, not an edge case requiring deliberate abuse.

This is more severe than anything in the original report's correctness section: that report's
explicit floor was "nothing softlocked, no button did nothing." This does soft-lock — the
clock cannot be un-paused once travel starts under it, the broken state is what autosave
persists, and reload does not recover it.

### Also observed, unprompted (not scored, offered for context)

- A **flight sequence with an unskippable beat and a working `Skip` control** now exists on
  travel (event log: "🐪 Traveling to Hagg…" then "✅ Arrived at Hagg"), where the original
  report found neither a confirm step nor a flight sequence at all (its L113-116 finding).
- The ledger's caption no longer contradicts itself at settlement: with a crew actually
  harvesting, it read "1.6 spice per day at current orders" instead of the original "no crews
  are harvesting" bug. One residual nit: at the exact instant Q1 resolved (day 12, 0 days
  left) the caption briefly read "0.0 spice per day at current orders" while the crew was
  still shown "Harvesting" — a minor lag, not the original self-contradiction, and not one of
  the six named findings.

### Revised score — blind-play half

Comprehension is **not re-scored**: the original 9/10 read stands: this delta touched
correctness surfaces only.

**Correctness revises to 4/10** (from the original 5/10). The direction of travel is genuinely
mixed, not uniformly better: the six named findings (Hagg DOM path, the settlement-modal
cluster, the debrief-skip guard, the travel-refusal copy, and raw-id leakage) are all fixed
and confirmed live — a substantial, real body of work. But the correctness floor itself is
now broken in a way it wasn't before: the original report could say "nothing softlocked" as
a baseline true of the whole build; that is no longer true. A save-corrupting, no-recovery
softlock reachable by pausing and then traveling — the exact two actions this very checklist
asked a player to perform in sequence — outweighs the fixes on points, because a single
unrecoverable failure mode matters more than several resolved cosmetic or mislabeling defects.

**Combined blind-play score: 6/10** (down from 7/10; comprehension 9, correctness 4, same
holistic method as the original's 9-and-5).

### Verdict

**`verified` is not warranted on the blind-play half.** The six named findings are genuinely
fixed and should not be reopened — but this session surfaced a new, more severe defect than
the one that originally kept this at `in_progress`. **WP03 remains `in_progress`**, and the
pause + travel softlock replaces "no pause control" as this half's biggest gap: it is a day's
work at most (evidence points at the travel/tick wiring not resuming after a pause-then-travel
state, likely in `TravelSystem.ts` or the speed-control wiring in `StatusBar.tsx`/
`CommandWiring`), but it must close before this half can clear `verified`.

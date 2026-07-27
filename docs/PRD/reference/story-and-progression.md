# Story and Progression Design

## Core Insight

Without solid story and progression systems, the game becomes a sandbox people drop after 10 minutes. The key is to build a system that **produces stories**, not a story-driven game.

## 18.1 Core Story

The player arrives on Arrakis as a newly appointed ruler or agent (not necessarily Paul Atreides).

### Opening Situation

- Emperor demands spice
- Planet is unstable
- Local tribes don't trust you
- Harkonnen forces still operate in the shadows
- Objective is unclear at first

### Four Game Phases

1. **Survival** — barely control anything, villages ignore you, spice production low, AI factions test you
2. **Influence** — gain allies, unlock better tools, factions start reacting to you, game becomes political
3. **Control** — dominate regions, AI factions form alliances against you, large-scale conflicts emerge
4. **Endgame** — defeat Harkonnen (or equivalent rival), or control enough spice, or unite all factions

## 18.2 Progression — Replace Levels

Dune didn't have "levels." It had progression through influence and control.

Replace traditional levels with:

1. **Influence progression** — `player.influence: 0 → 100` — unlocks new dialogue options, better alliances, stronger units
2. **Knowledge progression** — discover regions, learn secrets, unlock abilities
3. **Power progression** — military strength, spice economy, political leverage

## 18.3 Game Structure Options

### Option A — Open Simulation

No fixed levels, world evolves continuously, player creates their own story (Civ-style).

### Option B — Chapter-Based

Arrival → First alliance → First war → Planet control. Each chapter unlocks systems.

### Option C — Hybrid (Recommended)

Open world with milestones:

```ts
if (player.controls >= 3 villages) unlock("diplomacy")
```

Milestones trigger on conditions rather than time:
- Acquiring control of regions unlocks diplomatic systems
- Reaching influence thresholds unlock new unit types
- Strategic objectives trigger major events

## 18.4 Example Progression Timeline

| Time | Player State | Game State |
|------|-------------|-----------|
| **Start (0–10 min)** | 1 village, 0 allies, 1 advisor | Player travels, talks, tries to recruit |
| **Mid-game (30–60 min)** | 3–5 villages, first alliance, small conflicts | Player manages spice, chooses sides |
| **Late game** | Multiple factions, large conflicts | Player decides who survives |

## 18.5 Narrative Delivery

No long cutscenes. Use:

1. **Dialogue events** — "Village refuses your rule", "Smugglers offer deal"
2. **System-driven story** — rebellion happens, alliance forms
3. **AI-driven narrative** — factions speak dynamically, alliances feel alive

## 18.6 Player Role Options

1. **Paul-style hero** — chosen one, narrative-heavy
2. **Neutral governor** — more sandbox, fits Civ-style idea (recommended)
3. **Faction leader** — pick a faction at start, increases replayability

Each role should alter dialogue, available actions, and narrative outcomes.

## 18.7 Win Conditions

Multiple win paths provide replayability:

1. **Military** — defeat rival factions
2. **Economic** — dominate spice production
3. **Political** — control alliances (unified faction consensus)
4. **Ecological (Dune-specific twist)** — transform the planet

## 18.8 What Makes It Interesting

Story emerges from systems, not from scripted narratives:

- Ignore a village → it joins enemy
- Overexploit spice → rebellion
- Ally wrong faction → betrayal
- Neglect military strength → invasion risk

Player decisions have cascading consequences through the simulation.

## 18.9 Minimal PoC Story

**Setup:** You arrive, 3 villages exist, 1 AI faction controls the region

**Goal:** Control all villages OR survive 20 minutes

**Events:**
- 1 alliance offer
- 1 betrayal
- 1 attack

This minimal scope tests whether stories emerge from the system before building a larger world.

## 18.10 Design Summary

### Don't

- Build "levels" as arbitrary progression gates
- Force a single narrative path
- Create cutscenes as primary storytelling

### Do

- Build progression systems (influence, knowledge, power)
- Use milestones triggered by player achievement
- Let AI and systems create emergent stories
- Implement multiple win conditions

## Core Principle

**You're not building a story-driven game — you're building a system that produces stories.**

The game world responds to player actions through faction relationships, economic consequences, and strategic outcomes. Players experience narrative not through scripted scenes, but through the natural evolution of the simulation.

---

# Source

Extracted from `docs/PRD/game-plan.md` (Section 18)

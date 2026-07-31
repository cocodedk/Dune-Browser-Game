# Faction AI Design — Civ-like Political System

## Overview

The faction AI system transforms the game world from a collection of scripted villages into a living political landscape. Factions pursue their own goals, form and break alliances, compete for territory and spice, and respond dynamically to player actions. The design draws directly from Civilization's layered AI architecture: each faction operates across grand strategy, operational, and tactical layers simultaneously.

The goal is emergent storytelling — players should encounter situations that feel unscripted: a surprise alliance between rivals, a faction on the brink of collapse suddenly receiving aid, a smuggler network quietly absorbing territory while two great houses war.

---

## Core Data Model

Every faction in the game is represented by a single typed structure that captures its identity, resources, personality, relationships, and active objectives:

```ts
type FactionId = string

type Resources = {
  spice: number
  solaris: number
  troops: number
  influence: number
}

type Faction = {
  id: FactionId
  name: string
  type: "fremen" | "house" | "empire" | "smuggler"
  resources: Resources
  strategy: StrategyProfile
  relations: Record<FactionId, Relation>
  goals: Goal[]
}
```

The `type` field is not cosmetic — it drives default strategy profiles, AI behavior weights, and how the faction responds to events.

---

## Faction Types

### 1. Fremen Tribes

Decentralized, loyalty-driven, deeply tied to desert regions. Fremen factions do not pursue conventional territorial expansion; they accumulate influence through relationships. A player who helps Fremen villages builds genuine trust that translates into military support, intelligence, and safe passage. Betray them, and they become implacable enemies who know every desert path.

**Behavioral signature:** React strongly and permanently to player actions. Long memory. Do not initiate wars — but prosecute them ruthlessly when provoked.

### 2. House Harkonnen

Aggressive spice extractors. Harkonnen AI prioritizes controlling high-yield spice regions, punishes weak neighbors, and uses fear as a diplomatic tool. It does not value long-term alliances and will break agreements when profitable.

**Behavioral signature:** Maximum aggression. Minimal diplomacy. Exploits instability. Ignores unrest until it erupts.

### 3. House Atreides (player-aligned)

Diplomacy-focused, sustainable growth strategy. Atreides AI — to the extent it operates independently of the player — pursues alliances before expansion, invests in region stability, and avoids unprovoked wars. This faction serves as the player's starting anchor but should not feel like a passive background entity.

**Behavioral signature:** Builds coalitions. Long-term thinking. Responds to perceived injustice.

### 4. Smuggler Networks

Neutral opportunists. Smugglers trade with any faction regardless of alignment, prioritize profit over loyalty, and exploit information asymmetry. They do not hold territory aggressively but accumulate economic power. A wealthy smuggler network becomes a kingmaker — able to tip a war through selective supply.

**Behavioral signature:** Adaptable. No permanent enemies. Economic accumulation. Will ally with anyone if the price is right.

### 5. Emperor / Sardaukar (late-game)

A balance-enforcing faction that enters when one party gains overwhelming dominance. The Emperor does not pursue standard victory conditions — he intervenes to prevent any single faction (including the player) from breaking the political equilibrium. Sardaukar units represent the most powerful military force in the game.

**Behavioral signature:** Dormant unless triggered by imbalance. Overwhelming force when activated. Primarily a pressure valve and difficulty escalator.

---

## AI Architecture: Layered Decision-Making

The faction AI operates across four nested layers, evaluated on each update cycle. This mirrors Civilization's approach: different concerns operate at different time scales and abstraction levels.

```ts
class FactionAI {
  update() {
    this.grandStrategy()   // Win condition — what does this faction want to achieve?
    this.strategy()        // Economy and expansion — how does it grow?
    this.operations()      // Region control — which territories to hold or take?
    this.tactics()         // Units and local actions — immediate moves
  }
}
```

**Grand Strategy** sets the faction's current win condition and priority frame — "dominate spice production," "forge a coalition against Harkonnen," "survive until Emperor intervenes." This layer changes rarely but shapes everything below it.

**Strategy** handles resource allocation and expansion decisions. Should the faction invest in troops or spice extraction? Which region offers the best return on military investment?

**Operations** resolves specific regional decisions: which territory to attack, which to reinforce, which to trade away diplomatically.

**Tactics** executes immediate actions: unit movement, battle initiation, trade offers, diplomacy messages.

This separation prevents AI factions from making locally-optimal moves that undermine their strategic position — a failure mode common in simpler AI systems.

---

## Strategy Profiles

Each faction has a fixed personality expressed as a `StrategyProfile`. These values are not AI difficulty settings — they are personality constants that shape decision weights across all four AI layers. A high-aggression faction will prioritize military moves even when diplomacy would be more efficient; a high-diplomacy faction will seek alliances before conflict even when militarily superior.

```ts
type StrategyProfile = {
  aggression: number    // 0–100: tendency to initiate conflict
  diplomacy: number     // 0–100: preference for negotiation over force
  expansion: number     // 0–100: drive to acquire new territory
  greed: number         // 0–100: priority given to resource accumulation
  loyaltyFocus: number  // 0–100: weight given to maintaining commitments
}
```

**Reference values by faction type:**

| Faction    | Aggression | Diplomacy | Expansion | Greed | Loyalty |
|------------|-----------|-----------|-----------|-------|---------|
| Harkonnen  | 90        | 10        | 70        | 85    | 20      |
| Fremen     | 40        | 60        | 30        | 30    | 90      |
| Atreides   | 25        | 85        | 50        | 40    | 80      |
| Smugglers  | 20        | 80        | 40        | 95    | 30      |
| Emperor    | 60        | 50        | 20        | 50    | 60      |

These are starting values. Future versions may introduce per-instance variation — a "particularly aggressive" Fremen tribe or an unusually diplomatic Harkonnen administrator — to avoid factions feeling identical within their type.

---

## Goals System

Factions pursue concrete, typed objectives. Goals are not permanent — they update in response to world state changes, resource shifts, and relationship events. A faction that achieves a goal generates a new one; a faction that cannot achieve a goal may abandon it and pivot.

```ts
type Goal =
  | { type: "control_spice"; target: RegionId }
  | { type: "ally"; target: FactionId }
  | { type: "destroy"; target: FactionId }
  | { type: "expand"; target: number }          // target = region count threshold
```

Goal generation is driven by the faction's `StrategyProfile` and current world state:

- High-greed factions prioritize `control_spice` goals targeting rich, poorly-defended regions.
- High-aggression factions with sufficient troops generate `destroy` goals against weakened rivals.
- High-diplomacy factions generate `ally` goals, preferring factions with complementary profiles.
- `expand` goals emerge when a faction's region count falls below a strategy-driven threshold.

Goals create the narrative texture of the political simulation. When a player observes two factions suddenly at war, there is always a traceable chain of goal states behind it.

---

## Diplomacy System

Faction relationships are quantified as `Relation` objects. Every faction tracks a separate relation with every other faction, including the player.

```ts
type Relation = {
  trust: number    // -100 to +100
  fear: number     // 0 to 100
  trade: boolean
  war: boolean
}
```

`trust` is the primary relationship axis. High trust enables alliance proposals; deep negative trust leads to war declarations. `fear` is independent of trust — a faction may fear a rival without trusting them, which produces tributary relationships or cold deterrence.

**Available diplomatic actions:**

- **Propose alliance** — requires trust above threshold; produces long-term military and trade cooperation
- **Break alliance** — immediately reduces trust with all factions observing the break (reputation cost)
- **Trade spice** — available when `trade: true`; adjusts trust moderately over time
- **Declare war** — sets `war: true`; reduces trust significantly, may trigger other factions to choose sides
- **Demand tribute** — only viable when fear is high; failure to meet demand triggers war declaration

The player is modeled as a faction for all diplomatic purposes. Player actions feed directly into faction `Relation` objects, making the player's political standing a measurable, persistent game state — not a hidden variable.

---

## Reputation System (Player Impact)

Player behavior has concrete, measurable effects on faction relations. The reputation system translates player actions into trust/fear adjustments across relevant factions:

| Player Action      | Primary Effect              | Secondary Effect              |
|--------------------|-----------------------------|-------------------------------|
| Help a village     | +Fremen trust               | —                             |
| Hoard spice        | +Smuggler interest (trade)  | +Harkonnen attention          |
| Ignore attacks     | -Loyalty (Atreides)         | -Fremen trust                 |
| Attack a faction   | -Trust with target          | +Fear with target, +trust with rivals |
| Honor an agreement | +Trust with partner         | +Loyalty reputation globally  |
| Break an agreement | -Trust with partner         | -Loyalty reputation globally  |

Reputation is not a single number — it is the aggregate of `Relation.trust` values across all factions. Different factions weight the player's actions differently based on their own `StrategyProfile`.

---

## Territory Control

Factions own regions. Ownership is the primary measure of faction power and the primary source of ongoing resource production.

```ts
type Region = {
  id: RegionId
  owner: FactionId
  spice: number       // extraction yield per cycle
  unrest: number      // 0–100: likelihood of rebellion or defection
}
```

Territory changes hands through military conflict, diplomatic transfer, or organic defection (when `unrest` reaches threshold). Unrest accumulates from:

- Heavy extraction without investment
- Military occupation by an enemy faction
- Betrayed alliances
- Player actions that destabilize the region

Spice production is tied directly to territory. A faction that controls more high-yield regions has the resources to pursue more aggressive goals — creating a natural feedback loop where early territorial gains compound.

---

## Conflict Resolution

Combat in this game is abstract. There are no units to micromanage, no RTS battles to fight. Conflict is resolved through a deterministic calculation with a controlled random element:

```ts
function resolveBattle(attacker: Faction, defender: Faction): "attacker_wins" | "defender_wins" {
  const attackPower = attacker.resources.troops * getStrategyModifier(attacker)
  const defendPower = defender.resources.troops * getStrategyModifier(defender)
  const randomFactor = 0.85 + Math.random() * 0.3  // 0.85–1.15
  const result = attackPower * randomFactor - defendPower
  return result > 0 ? "attacker_wins" : "defender_wins"
}
```

`getStrategyModifier` applies the faction's `aggression` and `loyaltyFocus` values as multipliers — an aggressive defender fights harder on home territory; a loyal faction defending an ally fights with additional resolve.

The random factor (±15%) prevents the simulation from becoming fully deterministic while keeping outcomes weighted toward the stronger party. Surprise victories are possible but rare; grinding down a stronger faction requires sustained pressure, not lucky dice.

---

## Difficulty System

Difficulty does not mean "smarter AI." Making AI factions play optimally would make them feel mechanical and unfair. Instead, difficulty is applied through three levers:

**Resource bonuses:** Higher difficulty gives AI factions starting and ongoing resource advantages. They have more troops to deploy and more spice to spend.

**Decision cycle speed:** Higher difficulty reduces the interval between AI updates. Factions react faster to player actions and world events.

**Hidden advantages:** On hard difficulty, AI factions receive intelligence the player does not — they know approximate player resource levels and can coordinate timing of attacks.

```ts
type DifficultyLevel = "easy" | "normal" | "hard" | "custom"

type DifficultyConfig = {
  level: DifficultyLevel
  aiResourceMultiplier: number    // 0.7 (easy) → 1.5 (hard)
  decisionCycleMs: number         // 8000 (easy) → 3000 (hard)
  hiddenAdvantages: boolean
}
```

This approach preserves the quality of AI decision-making at all difficulty levels. On easy, factions are weaker, not stupider. On hard, they are stronger and faster, not omniscient cheaters.

---

## LLM Integration (Optional Layer)

The layered AI architecture is fully functional as a rule-based system. LLM integration is an optional enhancement layer, not a dependency. When an LLM is available, it serves as a strategic advisor to the `grandStrategy()` layer:

```ts
// LLM as strategist — rule engine as executor
const strategicContext = buildWorldStateSnapshot(faction, worldState)
const plan = await llm(strategicContext)
const validatedActions = parse(plan).filter(isAllowedAction)
execute(validatedActions)
```

The LLM never directly controls game state. It produces recommendations; the rule engine validates and executes them. If the LLM is unavailable, the rule-based `grandStrategy()` implementation runs instead. This guarantees the game is playable without any AI infrastructure.

See `llm-integration-strategy.md` for the full provider abstraction design.

---

## Minimal Starting Implementation

The full system described above is an end-state vision. The recommended starting point is deliberately smaller:

- **3 factions**: Fremen, Harkonnen, player (Atreides)
- **1 relationship value**: a single trust score per faction pair
- **2 actions**: ally or attack
- **No LLM**: rule-based strategy only

Build this, make it feel alive, then expand. Adding factions before the core loop is proven is overbuilding.

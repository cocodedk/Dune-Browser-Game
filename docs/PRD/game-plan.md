> Status note: this is the long-form source plan, not the canonical current-state doc.
> For the streamlined, repo-aware entry point, start with `docs/PRD/README.md`.

Here’s a **full, clean spec** for building a *Dune (1992)-style game as a real browser app* using React + TypeScript — without falling into the usual traps.

I’m writing this like something you could hand to a team and actually build from.

---

# 1. Goal

Build a **pure browser game (no emulation)** that recreates:

* world simulation (Arrakis map + villages)
* time-based progression
* dialogue-driven story
* resource economy (spice)
* faction dynamics (Fremen / Harkonnen)

Runs entirely in browser using:

* React (UI only)
* TypeScript (core logic)
* Phaser (rendering + input)

Phaser is used because it’s built for fast 2D browser games using Canvas/WebGL and integrates well with TS ([Phaser Documentation][1])

---

# 2. High-level architecture

## Separation (this is non-negotiable)

```
/game-engine   ← pure TS (no React, no DOM)
/game-render   ← Phaser scenes
/ui            ← React
/data          ← JSON content
```

## Responsibilities

| Layer  | Responsibility              |
| ------ | --------------------------- |
| Engine | rules, simulation, state    |
| Phaser | rendering, input, animation |
| React  | UI panels, menus            |
| Data   | story, villages, config     |

---

# 3. Core principles

### 1. Engine is deterministic

* No React state inside game logic
* No DOM access
* Pure functions + state transitions

### 2. React is a shell

* Renders UI only
* Talks to engine via events

React is declarative and re-renders on state change, which conflicts with real-time game loops ([Generalist Programmer][2])

### 3. Phaser owns the screen

* One canvas
* Handles sprites, map, input

---

# 4. Tech stack

## Required

* TypeScript (strict mode)
* React (Vite setup)
* Phaser 3
* Zustand or simple event bus
* Browser storage for save/resume support

## Optional

* Howler.js (audio)
* Dexie (recommended wrapper if IndexedDB is used)

## Environment

* Node.js
* npm / pnpm

(standard requirement for Phaser + React projects ([GitHub][3]))

---

# 5. Core systems (engine)

This is the real work.

---

## 5.1 Game loop

```ts
function update(delta: number) {
  world.update(delta)
  ai.update(delta)
  events.process()
}
```

Runs at:

* 30–60 FPS

---

## 5.2 World model

```ts
type World = {
  time: number
  villages: Village[]
  characters: Character[]
  player: Player
}
```

---

## 5.3 Time system

* continuous tick (seconds)
* scaled time (fast-forward)
* triggers events

Example:

```ts
if (time % DAY === 0) {
  villages.forEach(updateProduction)
}
```

---

## 5.4 Village system

Each village:

```ts
type Village = {
  id: string
  population: number
  spice: number
  loyalty: number
  status: "neutral" | "friendly" | "rebelling"
}
```

Rules:

* produces spice over time
* loyalty changes based on player actions

---

## 5.5 Travel system

* node-based map (not free movement)
* travel takes time

```ts
travel(player, from, to) {
  player.state = "traveling"
  player.arrivalTime = now + distance * factor
}
```

---

## 5.6 Dialogue system

Tree-based:

```ts
type DialogueNode = {
  id: string
  text: string
  choices: {
    text: string
    next: string
    condition?: Condition
  }[]
}
```

---

## 5.7 Economy

* spice production
* spice transport
* storage

Simple rule:

```ts
village.spice += productionRate * delta
```

---

## 5.8 AI system

* villages react to neglect
* Harkonnen pressure increases over time

```ts
if (loyalty < 30) rebellionChance++
```

---

## 5.9 Event system

Queue-based:

```ts
events.push({
  type: "dialogue",
  target: "stilgar"
})
```

---

## 5.10 Save system

Serialize everything:

```ts
JSON.stringify(world)
```

Store in browser storage so a player can close the browser and resume later.

Preferred order:

* IndexedDB for durable save slots and larger state
* localStorage only for very small fallback metadata

Requirement:

* the game state must be restorable from browser storage into a playable session
* resume must continue from the saved world state, not restart the run

---

# 6. Rendering (Phaser)

## Scene structure

```
BootScene
MainScene
UIScene
```

## Responsibilities

| Scene | Role        |
| ----- | ----------- |
| Boot  | load assets |
| Main  | map + units |
| UI    | overlays    |

---

## Map

* tile-based or static image
* clickable regions

---

## Input

* click to travel
* click village → open UI

---

## Animation

Minimal:

* blinking markers
* simple sprite movement

You do NOT need physics.

---

# 7. React layer

## What React handles

* dialogue panels
* inventory
* village info
* menus
* save/load UI for browser-stored game state

---

## Communication pattern

Phaser → React:

```ts
eventBus.emit("villageSelected", id)
```

React → Engine:

```ts
engine.dispatch({ type: "CHOOSE_DIALOGUE", id })
```

---

# 8. Data design (critical)

Put everything in JSON:

```
/data
  villages.json
  dialogues.json
  events.json
```

Example:

```json
{
  "id": "sietch_tabr",
  "population": 300,
  "production": 5
}
```

---

# 9. Asset requirements

## Graphics

* map background
* village icons
* character portraits

## Audio

* ambient loop
* UI sounds

---

# 10. Performance constraints

Browser limits matter:

* memory leaks → crash tab
* long sessions → degraded performance
* limited background processing ([Wikipedia][4])

So:

* avoid large object churn
* reuse objects
* cap update frequency

---

# 11. Development phases

## Phase 1 — Core loop (1–2 weeks)

* map
* time system
* travel

## Phase 2 — Interaction (2–4 weeks)

* villages
* dialogue
* UI

## Phase 3 — Systems (4–8 weeks)

* economy
* AI
* events

## Phase 4 — Polish (ongoing)

* balancing
* pacing
* UX

---

# 12. Risks (real ones)

### 1. Overusing React

→ kills performance

### 2. No clear state model

→ impossible to debug

### 3. Too much rendering logic in Phaser

→ UI becomes painful

### 4. Content explosion

→ dialogue + balancing takes longer than code

---

# 13. Minimal viable version

Cut scope aggressively:

* 5 villages
* 1 resource (spice)
* 1 faction mechanic
* 1 dialogue chain

If that works → scale.

---

# 14. What success looks like

You should be able to:

* click a village
* travel there
* talk to leader
* influence loyalty
* see time pass
* watch spice accumulate

If that loop feels good, you’ve basically rebuilt Dune.

---

# 15. Straight advice

* Use Phaser. Don’t fight it.
* Keep engine pure TS.
* Keep React out of the loop.
* Ship something ugly early.

---


[1]: https://docs.phaser.io/?utm_source=chatgpt.com "Welcome to Phaser Docs | Phaser Help"
[2]: https://generalistprogrammer.com/tutorials/phaser-react-integration-guide?utm_source=chatgpt.com "Phaser + React Integration Guide: Embed Games in React (2025)"
[3]: https://github.com/phaserjs/template-react-ts?utm_source=chatgpt.com "Phaser React TypeScript Template - GitHub"
[4]: https://en.wikipedia.org/wiki/Browser_game?utm_source=chatgpt.com "Browser game"


Good idea. This is exactly where your game can become something *way more interesting than the original Dune*.

Below is a **drop-in section** for your spec. It extends what you already have with a proper **faction + AI system inspired by Civilization**, but still grounded in Dune.

---

# 16. AI factions, allies, enemies (Dune × Civilization layer)

## Goal

Turn the world into a **living political system**, not just scripted villages.

Instead of:

* static factions (like original Dune)

You get:

* dynamic factions
* shifting alliances
* competing strategies
* emergent stories

This is how Civilization works at a high level:

* multiple AI players grow, expand, negotiate, and fight
* victory is not just military, but economic, diplomatic, etc. ([Wikipedia][1])

---

# 16.1 Core concept

Each faction is:

```ts
type Faction = {
  id: string
  name: string
  type: "fremen" | "house" | "smuggler" | "empire"
  resources: Resources
  strategy: StrategyProfile
  relations: Record<FactionId, Relation>
  goals: Goal[]
}
```

---

# 16.2 Faction types (Dune flavor)

Start simple:

### 1. Fremen tribes

* decentralized
* loyalty-based
* react strongly to player actions

### 2. Harkonnen

* aggressive
* exploit spice
* punish weak regions

### 3. Atreides (player-aligned)

* diplomacy-focused
* long-term growth

### 4. Smugglers

* neutral opportunists
* trade with anyone

### 5. Emperor / Sardaukar (late game)

* balance enforcer
* intervenes if one faction dominates

---

# 16.3 AI architecture (borrow from Civ)

Use layered AI (this is key):

* **tactical AI** → units / local actions
* **operational AI** → region control
* **strategic AI** → economy, expansion
* **grand strategy AI** → win condition

This multi-layer approach is standard in Civ-style AI ([Game Development Stack Exchange][2])

---

## Implementation (clean version)

```ts
class FactionAI {
  update() {
    this.grandStrategy()
    this.strategy()
    this.operations()
    this.tactics()
  }
}
```

---

# 16.4 Strategy profiles (personality system)

Each faction has a “personality”:

```ts
type StrategyProfile = {
  aggression: number
  diplomacy: number
  expansion: number
  greed: number
  loyaltyFocus: number
}
```

Example:

| Faction   | Aggression | Diplomacy |
| --------- | ---------- | --------- |
| Harkonnen | 90         | 10        |
| Fremen    | 40         | 60        |
| Smugglers | 20         | 80        |

---

# 16.5 Goals system (this is the driver)

Each faction always has goals:

```ts
type Goal =
  | { type: "control_spice"; target: RegionId }
  | { type: "ally"; target: FactionId }
  | { type: "destroy"; target: FactionId }
  | { type: "expand"; target: number }
```

Goals change over time.

---

# 16.6 Diplomacy system

Relations are dynamic:

```ts
type Relation = {
  trust: number   // -100 → +100
  fear: number
  trade: boolean
  war: boolean
}
```

---

## Actions

Factions can:

* propose alliance
* break alliance
* trade spice
* declare war
* demand tribute

Modern strategy games increasingly rely on this kind of adaptive diplomacy where factions learn and realign over time ([Yoo ‣ Digital & Real][3])

---

# 16.7 Reputation system (player impact)

Player is not special — just another actor.

Actions affect reputation:

| Action         | Effect             |
| -------------- | ------------------ |
| Help village   | +Fremen trust      |
| Hoard spice    | +Smuggler interest |
| Ignore attacks | -Loyalty           |
| Attack faction | -Trust             |

This feeds into AI decisions.

---

# 16.8 Territory control

Instead of static villages:

* factions “own” regions
* control changes over time

```ts
type Region = {
  owner: FactionId
  spice: number
  unrest: number
}
```

---

# 16.9 Conflict system

No micromanaged RTS combat needed.

Use **abstract combat resolution**:

```ts
resolveBattle(attacker, defender) {
  return attacker.power * randomFactor - defender.power
}
```

---

# 16.10 Emergent behavior (this is the payoff)

When all systems run together, you get:

* Fremen unite without player
* Harkonnen crush weak tribes
* smugglers fund both sides
* alliances shift mid-game

AI-driven ecosystems create these kinds of evolving interactions naturally ([The Design Lab Blog][4])

---

# 16.11 Difficulty system (important)

Do NOT make AI “smarter” only.

Use:

* resource bonuses
* faster decision cycles
* hidden advantages

This is how strategy games scale difficulty in practice ([Wikipedia][5])

---

# 16.12 Optional: LLM-driven faction AI

If you want something modern:

Split AI into:

* **LLM = strategist**
* **code = executor**

Example:

```ts
strategy = llm("What should Harkonnen do?")
execute(strategy)
```

This hybrid approach is already being explored in Civ-like AI systems ([arXiv][6])

---

# 16.13 Minimal version (don’t overbuild)

Start with:

* 3 factions
* simple trust score
* 2 actions (ally / attack)

Then expand.

---

# 16.14 What makes this special

If you do this right, your game becomes:

> Dune storytelling + Civilization systems

Instead of:

* scripted campaign

You get:

* replayable simulation

---

# 16.15 Straight advice

* Don’t start with LLMs
* Don’t simulate everything
* Focus on **relationships + goals**
* Make AI visible (so player understands it)

---


That’s usually the fastest way to validate this idea.

[1]: https://en.wikipedia.org/wiki/Civilization_VI?utm_source=chatgpt.com "Civilization VI"
[2]: https://gamedev.stackexchange.com/questions/21519/complex-game-ai-for-turn-based-strategy-games?utm_source=chatgpt.com "Complex Game AI for Turn-based Strategy Games"
[3]: https://yoo.be/adaptive-diplomacy-ai-driven-factions-strategy-rpgs/?utm_source=chatgpt.com "Adaptive Diplomacy: How AI-Driven Factions Are Rewriting Strategy RPGs ..."
[4]: https://thedesignlab.blog/2024/12/30/ai-driven-game-worlds-enhancing-pacing-and-engagement/?utm_source=chatgpt.com "AI-Driven Game Worlds: Enhancing Pacing and Engagement"
[5]: https://en.wikipedia.org/wiki/Galactic_Civilizations_II%3A_Dread_Lords?utm_source=chatgpt.com "Galactic Civilizations II: Dread Lords"
[6]: https://arxiv.org/pdf/2512.18564?utm_source=chatgpt.com "Vox Deorum: A Hybrid LLM Architecture for 4X / Grand Strategy Game AI ..."

Yes — and you’re thinking about it the right way.

But the clean version is slightly more structured than just “URL + model”.



This is exactly the right instinct.
Before you build “Dune × Civ with AI factions,” you need to prove one thing:

> **Is this actually playable, stable, and worth building?**

That’s what a proof of concept is for.

---

# 17. Proof of concept (micro version)

## What a PoC actually is

A proof of concept is just:

> a small, incomplete version that proves the idea works ([Wikipedia][1])

In games, that means:

* test core mechanics
* ignore everything else
* throw it away if needed

The goal is not to build the game.
The goal is to answer:

* is it fun?
* does the architecture hold?
* does the AI approach make sense?

Game teams do this because it lets them test ideas early and avoid wasting time later ([Game-Ace][2])

---

# 17.1 Why you should absolutely do this first

If you skip this step, you will:

* overbuild systems that don’t matter
* spend months on architecture that breaks
* discover too late that the gameplay loop is weak

Prototyping exists to validate mechanics early and catch problems before they become expensive ([GeeksforGeeks][3])

---

# 17.2 Scope (keep it brutally small)

Your PoC should feel almost stupidly simple.

## World

* 3 villages
* 1 player
* 1 AI faction

## Systems

* time progression
* travel between villages
* simple resource (spice)
* basic dialogue

## AI

* one decision loop:

  * “attack”, “ally”, or “ignore”

## UI

* barebones:

  * text panel
  * map with clickable nodes

---

# 17.3 What you are testing (this is key)

You are not testing content.

You are testing:

### 1. Core loop

```
travel → interact → time passes → world changes
```

If this isn’t engaging, nothing else matters.

---

### 2. Engine architecture

* can your game loop run cleanly?
* can state update without React chaos?

---

### 3. AI integration (critical)

* can you call Ollama and get usable decisions?
* can you convert that into game actions safely?

---

### 4. Latency and pacing

* does AI feel slow?
* does it break flow?

---

# 17.4 Minimal feature list (strict)

Do not go beyond this:

## Engine

* world state
* tick/update loop

## Map

* 3 nodes
* click → travel

## Villages

* produce spice over time
* simple loyalty number

## Dialogue

* 1 conversation tree

## AI

* every 10 seconds:

  * pick one action

## Save

* optional (can skip)

---

# 17.5 Example PoC loop

This is enough:

```ts
loop() {
  updateTime()
  updateVillages()
  maybeRunAI()
  render()
}
```

AI:

```ts
if (time % 10 === 0) {
  decision = await ai("what should faction do?")
  execute(decision)
}
```

---

# 17.6 What to fake (important)

Do NOT build:

* full UI
* animations
* proper art
* full diplomacy system
* complex combat

Use:

* colored circles
* plain text
* hardcoded data

Prototypes are supposed to be rough and disposable ([Toño Game Consultants][4])

---

# 17.7 Success criteria (very concrete)

Your PoC is successful if:

### ✔ You can play 5–10 minutes

* without crashes
* without confusion

### ✔ AI produces believable behavior

* not random nonsense
* not breaking the game

### ✔ The loop feels meaningful

* decisions have visible effects

### ✔ You want to keep playing

If not → stop and rethink.

---

# 17.8 Timebox (don’t overthink this)

* 3–7 days → ideal
* 2 weeks → max

If it takes longer, you’re building too much.

---

# 17.9 What usually breaks (so you know)

From experience, these fail first:

### 1. AI output is unusable

→ fix with strict schema / parsing

### 2. Game loop vs React conflicts

→ fix by isolating engine

### 3. Nothing feels connected

→ fix with stronger feedback (numbers changing, events firing)

### 4. It’s boring

→ this is the real killer

---

# 17.10 After the PoC

If it works, you move to:

### Phase 2: vertical slice

* one polished gameplay path
* proper UI
* better AI

If it fails:

* change the loop
* simplify the idea
* or drop it

---

# 17.11 Straight advice

* keep it ugly
* keep it fast
* cut features aggressively
* test the loop, not the vision

---

If you want, next step is practical:

I can define:

* the exact **PoC repo structure**
* and the **3 core files you need to write first**

That usually gets you from “idea” to something playable in a day.

[1]: https://en.wikipedia.org/wiki/Proof_of_concept?utm_source=chatgpt.com "Proof of concept"
[2]: https://game-ace.com/blog/proof-of-concept-game/?utm_source=chatgpt.com "Proof of Concept Game: The First Step Toward a Full-Scale Game"
[3]: https://www.geeksforgeeks.org/blogs/game-prototyping/?utm_source=chatgpt.com "Game Prototyping : A Beginner's Guide - GeeksforGeeks"
[4]: https://tonogameconsultants.com/prototyping/?utm_source=chatgpt.com "What Is a Game Prototype? How to Test Ideas Fast"


---

# The real answer (what you actually need)

At minimum, your AI provider config looks like:

```ts
type AIProvider = {
  baseUrl: string
  model: string
  apiKey?: string
}
```

That’s the core.

Because almost all modern LLMs are exposed via **HTTP APIs where you send a request with a model name and get a response back** ([llmapi.dev][1])

---

# The important insight

Most providers today follow the same shape:

* endpoint (URL)
* model identifier
* API key
* JSON request/response

And many of them are **OpenAI-compatible**, meaning:

* same endpoints (`/v1/chat/completions`, etc.)
* same request format ([LM Studio][2])

That’s the trick that makes your system simple.

---

# Recommended architecture (don’t skip this)

Instead of tying your game to one provider, define a **provider interface**:

```ts
interface LLMClient {
  chat(messages: Message[]): Promise<string>
}
```

Then implement providers:

```ts
class OpenAIClient implements LLMClient {}
class LocalClient implements LLMClient {}
class ProxyClient implements LLMClient {}
```

---

# Example: generic request (TypeScript)

This works for OpenAI, local models, proxies, etc.

```ts
async function callLLM(config: AIProvider, messages: any[]) {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages
    })
  })

  const data = await res.json()
  return data.choices[0].message.content
}
```

This works because:

* APIs accept JSON payloads with `model` + `messages`
* return structured responses ([llmapi.dev][1])

---

# Types of providers you should support

## 1. Hosted APIs

* OpenAI
* Anthropic
* Google

```ts
baseUrl: "https://api.openai.com/v1"
model: "gpt-4o-mini"
```

---

## 2. Proxy / multi-model APIs

Example:

* one endpoint → many models

```ts
baseUrl: "https://api.llmapi.dev/api"
model: "openai/gpt-4-turbo"
```

These aggregate 100+ models behind one API ([llmapi.dev][1])

---

## 3. Local models (important for your use case)

Example:

```ts
baseUrl: "http://localhost:1234/v1"
model: "mistral"
```

Local servers (LM Studio, vLLM, etc.) expose **OpenAI-compatible endpoints**, so you just swap the URL ([LM Studio][2])

---

# What you should actually design in your game

## Config layer

```ts
type AIConfig = {
  provider: "openai" | "local" | "proxy"
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}
```

---

## AI usage in your game

You don’t call the LLM everywhere.

You call it for:

### 1. Strategic decisions

* “What should Harkonnen do?”

### 2. Dialogue generation

* Fremen responses

### 3. Event generation

* “A rebellion starts in X”

---

# Critical design decision (most important)

## DO NOT let the LLM control the game directly

Instead:

```ts
const plan = await llm("Decide next move")

// then validate + convert to game actions
executePlan(parse(plan))
```

Why:

* LLMs are not deterministic
* can break your game logic

---

# Better pattern (hybrid AI)

Split responsibility:

| Layer  | Role                 |
| ------ | -------------------- |
| LLM    | strategy / narrative |
| Engine | rules / execution    |

This is how serious systems use LLMs today.

---

# Optional: standardization (future-proof)

There’s already movement toward standard protocols like MCP that define how apps talk to LLMs and tools ([Wikipedia][3])

You don’t need it now, but your design should allow:

* swapping providers
* adding tools later

---

# What most people get wrong

They hardcode:

```ts
fetch("https://api.openai.com/...")
```

Bad idea.

You want:

```ts
provider.baseUrl
provider.model
```

So you can:

* switch providers in config
* run local models
* test cheaply

---

# Clean mental model

Think of it like this:

> Your game talks to “an AI endpoint”, not “OpenAI”

---

# Straight answer

Yes — but not just URL + model.

You want:

* baseUrl
* model
* apiKey
* request format (OpenAI-compatible)

Wrap that behind an interface and you’re done.



[1]: https://llmapi.dev/?utm_source=chatgpt.com "LLM API"
[2]: https://lmstudio.ai/docs/developer/openai-compat?utm_source=chatgpt.com "OpenAI Compatibility Endpoints | LM Studio Docs"
[3]: https://en.wikipedia.org/wiki/Model_Context_Protocol?utm_source=chatgpt.com "Model Context Protocol"



Yes — **Ollama is actually the cleanest way to do what you described**.

And more importantly:

> it fits perfectly with your “URL + model” abstraction

---

# What Ollama really gives you

Ollama is:

* a **local LLM runtime**
* exposing a **REST API**
* that is **OpenAI-compatible**

So your earlier design becomes *literally correct*.

---

# The exact config (this is all you need)

```ts
const ai = {
  baseUrl: "http://localhost:11434/v1",
  model: "llama3.2"
}
```

That’s it.

Because Ollama exposes endpoints like:

* `/v1/chat/completions`
* `/v1/models` ([ML Journey][1])

So your app talks to it exactly like OpenAI.

---

# Example request (this will just work)

```ts
await fetch("http://localhost:11434/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "llama3.2",
    messages: [
      { role: "user", content: "What should the Harkonnen do?" }
    ]
  })
})
```

No API key needed.

You can literally pass `"ollama"` or nothing at all. ([ML Journey][1])

---

# Why this is perfect for your game

## 1. Fully local (big deal)

* no latency spikes
* no API costs
* no data leaving the machine

That’s the main reason people use Ollama. ([Inventive HQ][2])

---

## 2. Drop-in replacement

You can:

* develop with OpenAI
* switch to Ollama later

Just change:

```ts
baseUrl + model
```

Nothing else. ([ML Journey][1])

---

## 3. Works with your architecture

Your earlier abstraction:

```ts
type AIProvider = {
  baseUrl: string
  model: string
}
```

is already correct.

Ollama fits perfectly.

---

# Recommended setup for your game

## 1. Provider config

```ts
type AIConfig = {
  baseUrl: string
  model: string
  temperature: number
}
```

---

## 2. Environment switching

```ts
const config = {
  baseUrl: process.env.AI_BASE_URL,
  model: process.env.AI_MODEL
}
```

Examples:

### Local

```bash
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
```

### Cloud

```bash
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Same code. Different backend.

---

# What models to actually use

For your use case (game AI), you want:

### Good default

* `llama3.2`

### Better reasoning

* `qwen2.5`
* `mixtral`

### Lightweight (fast NPCs)

* `phi`
* `gemma:2b`

---

# Important constraints (don’t ignore these)

## 1. Speed matters

Local models are slower than cloud.

So:

* don’t call AI every frame
* cache decisions
* call only on events

---

## 2. Determinism matters more

Set:

```ts
temperature: 0.2
```

Otherwise your factions become chaotic.

---

## 3. Hardware matters

* CPU works → slow
* GPU → much better

Even small models run fine locally, but bigger ones need RAM/GPU. ([Windows Central][3])

---

# Best pattern for your game (important)

## DO THIS

```ts
const plan = await ai.decideFactionMove(state)

engine.execute(plan)
```

## NOT THIS

```ts
ai.directlyModifyGameState()
```

Keep AI advisory only.

---

# Bonus (very useful later)

## Add a proxy layer

Use something like LiteLLM:

* adds logging
* fallback to cloud
* rate limiting

You can run:

```
your game → proxy → ollama / openai
```

---

# Clean mental model

Think of Ollama as:

> “OpenAI API running on localhost”

That’s literally what it is.

---

# Straight answer

Yes — Ollama is exactly what you want.

* URL → `http://localhost:11434/v1`
* model → `llama3.2`
* same API as OpenAI
* no API key needed

And your architecture already supports it without changes.

---

[1]: https://mljourney.com/how-to-use-ollamas-openai-compatible-api/?utm_source=chatgpt.com "How to Use Ollama’s OpenAI-Compatible API - ML Journey"
[2]: https://inventivehq.com/knowledge-base/openai/how-to-use-local-models?utm_source=chatgpt.com "How to Run OpenAI Codex CLI with Local Models (Ollama, LM Studio)"
[3]: https://www.windowscentral.com/software-apps/how-to-install-and-use-ollama-to-run-ai-llms-on-your-windows-11-pc?utm_source=chatgpt.com "How to install and use Ollama to run AI LLMs locally on your Windows 11 PC"


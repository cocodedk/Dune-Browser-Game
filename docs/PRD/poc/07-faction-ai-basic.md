# 07 — Faction AI Basic

## Goal

One AI faction makes a decision every 10 seconds (attack / ally / ignore) via Ollama; the decision executes on world state.

## Input

- Task 02 complete (`World`, `Faction` types exist)
- Task 05 complete (villages have loyalty and spice values to feed into prompt)
- Task 09 complete if using Ollama-backed decisions

If Task 09 is not done yet, use a deterministic stub and keep the engine-side decision execution the same.

## Scope (PoC only — keep it small)

- Implement `decideFactionMove(world: World): Promise<FactionDecision>` in the AI layer used by the PoC
- Call LLM every 10 seconds of game time (not real time):
  ```ts
  // In update()
  if (Math.floor(world.time) % 10 === 0 && !world.faction.deciding) {
    world.faction.deciding = true
    decideFactionMove(world).then(decision => {
      executeFactionDecision(world, decision)
      world.faction.deciding = false
    })
  }
  ```
- Build a minimal world-state prompt — only what the AI needs:
  ```ts
  function buildPrompt(world: World): string {
    return `You are the Harkonnen faction advisor.
  Current game state:
  ${world.villages.map(v =>
    `- ${v.name}: spice=${v.spice}, loyalty=${v.loyalty}, status=${v.status}`
  ).join('\n')}
  
  Choose ONE action: attack <village_name> | ally <village_name> | ignore
  Respond with JSON only: {"action": "attack"|"ally"|"ignore", "target": "<village_name>"|null}
  `
  }
  ```
- Parse response strictly — only 3 valid actions, target must be a known village
- Implement `executeFactionDecision(world, decision)`:
  - `attack`: reduce target village loyalty by 20
  - `ally`: increase target village loyalty by 10 (faction gains influence)
  - `ignore`: no effect
- Record decision in `world.faction.lastDecision` and add to event log
- If LLM response is unparseable → default to `ignore`, log warning

**Critical rule: LLM does not control the engine. Parse and validate before executing.**
```ts
const raw = await llm.chat(messages)
const plan = parse(raw)              // may throw
const decision = validate(plan)      // ensures action + target are valid
engine.execute(decision)             // only valid decisions reach here
```

## Out of Scope (don't build yet)

- Multiple AI factions
- Complex faction strategy (resource accumulation, long-term planning)
- Faction memory / history
- Combat resolution system
- LLM fine-tuning

## Key Types / Interfaces

```ts
type FactionDecision = {
  action: "attack" | "ally" | "ignore"
  target: string | null   // village id, null for "ignore"
}

// Add to Faction type in types.ts
type Faction = {
  id: string
  name: string
  lastDecision: FactionDecision | null
  targetVillageId: string | null
  deciding: boolean       // prevents concurrent AI calls
}
```

## Acceptance Criteria

- [ ] Faction makes a decision approximately every 10 game-seconds
- [ ] Decision appears in event log (e.g. "Harkonnens attack Arrakeen")
- [ ] Village loyalty changes according to the decision
- [ ] Only valid decisions execute — invalid LLM output defaults to `ignore`
- [ ] No concurrent AI calls (guarded by `deciding` flag)
- [ ] Decisions feel like strategy, not random noise (check over 5 minutes of play)

## Note

This task depends on the LLM client only if the PoC is using Ollama.
The core engine-side validation and execution path should still be implementable with a stub provider first.

## Timebox

4–8 hours

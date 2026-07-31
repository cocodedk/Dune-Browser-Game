# LLM Integration Strategy

## Why This Matters

The naive approach to AI in a game like this is to hardcode OpenAI calls wherever intelligence is needed. That creates a tight coupling that makes the game unplayable without a specific external service, makes testing painful, and makes it impossible to swap providers without touching game logic scattered across the codebase.

The design here treats LLM access as a swappable infrastructure concern — like a database driver. The game engine does not know or care whether it is talking to OpenAI, a local Ollama instance, or a mock. It calls a well-defined interface and gets a string back.

---

## Provider Interface

Every LLM provider — hosted, local, or proxy — implements the same interface:

```ts
interface LLMClient {
  chat(messages: Message[]): Promise<string>
}

type Message = {
  role: "system" | "user" | "assistant"
  content: string
}
```

Three concrete implementations cover all current provider categories:

```ts
class OpenAIClient implements LLMClient {
  constructor(private config: AIProvider) {}
  async chat(messages: Message[]): Promise<string> { /* ... */ }
}

class LocalClient implements LLMClient {
  // Targets Ollama's OpenAI-compatible endpoint
  constructor(private config: AIProvider) {}
  async chat(messages: Message[]): Promise<string> { /* ... */ }
}

class ProxyClient implements LLMClient {
  // For LiteLLM, OpenRouter, or similar aggregators
  constructor(private config: AIProvider) {}
  async chat(messages: Message[]): Promise<string> { /* ... */ }
}
```

The provider is selected at startup based on configuration, not hardcoded in game logic:

```ts
type AIProvider = {
  baseUrl: string
  model: string
  apiKey?: string  // undefined for local providers
}

type AIConfig = {
  provider: "openai" | "local" | "proxy"
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

function createLLMClient(config: AIConfig): LLMClient {
  switch (config.provider) {
    case "openai": return new OpenAIClient(config)
    case "local":  return new LocalClient(config)
    case "proxy":  return new ProxyClient(config)
  }
}
```

---

## Configuration via Environment Variables

Provider selection and connection details come from environment variables. No provider details live in source code.

```bash
AI_PROVIDER=local
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=512
```

For OpenAI:

```bash
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...
```

For a proxy aggregator:

```bash
AI_PROVIDER=proxy
AI_BASE_URL=https://your-litellm-instance.example.com
AI_MODEL=claude-3-haiku
AI_API_KEY=...
```

The game reads these at startup, constructs the appropriate client, and injects it into the AI subsystem. Swapping providers is a one-line environment change.

---

## The Critical Design Rule: LLM as Strategist, Engine as Executor

The LLM must never directly control game state. This is the central design constraint, not a nice-to-have.

The failure mode is this:

```ts
// BAD — LLM produces free-form output that bypasses validation
const move = await llm("What should Harkonnen do?")
applyToGameState(move)  // no validation, no bounds checking
```

The correct pattern is:

```ts
// GOOD — LLM produces a plan; engine validates and executes
const worldSnapshot = buildWorldStateSnapshot(faction, worldState)
const rawPlan = await llm(worldSnapshot)
const parsedActions = parse(rawPlan)
const validActions = parsedActions.filter(isAllowedAction)
engine.dispatch(validActions)
```

`isAllowedAction` enforces game rules. The LLM cannot instruct a faction to take resources it does not have, attack a region that does not exist, or violate diplomatic treaties that the engine tracks. The LLM produces intent; the engine enforces reality.

This pattern also means that if the LLM produces malformed output — which it will, especially with smaller local models — the game degrades gracefully. `parse` returns an empty array, `filter` passes nothing, no action is taken, and the rule-based fallback handles the faction's turn.

---

## When to Call the LLM

LLM calls are expensive (latency and, for hosted providers, cost). They should be used for high-value, infrequent decisions — not on every game tick.

**Good use cases:**

1. **Strategic decisions** — "What should Harkonnen's grand strategy be this cycle?" Called once per faction per strategy cycle (every N game turns), not every frame.

2. **Dialogue generation** — "Generate a Fremen elder's response to a player who just helped defend their village." Called on player interaction events, not continuously.

3. **Event generation** — "Based on the current political state, what unexpected event might emerge in this region?" Called to enrich game narrative at key turning points.

**Patterns to avoid:**

- Calling the LLM on every game loop tick
- Calling the LLM for simple decisions that a rule can make (e.g., "should Harkonnen attack a region with 0 defenders?" — the answer is always yes, no LLM needed)
- Letting LLM calls block the game loop — all calls must be async with a timeout

**Caching strategy:** Cache the last LLM decision per faction and reuse it until a significant world event (battle result, alliance change, resource threshold crossed) triggers a re-evaluation.

---

## Fallback Behavior

LLM availability must never be a hard dependency for game function. Every call site that uses the LLM must have a rule-based fallback:

```ts
async function getFactionStrategy(faction: Faction, world: WorldState): Promise<Action[]> {
  try {
    const rawPlan = await llmClient.chat(buildPrompt(faction, world))
    const actions = parse(rawPlan).filter(isAllowedAction)
    if (actions.length > 0) return actions
  } catch (err) {
    // LLM unavailable, timeout, or unparseable output
  }
  return ruleBasedStrategy(faction, world)  // always works
}
```

This means the game ships fully functional with no LLM configured. LLM integration is an enhancement layer, not infrastructure.

---

## Supported Provider Categories

### Hosted APIs

Standard cloud providers accessed via API key. Highest quality, lowest latency for complex reasoning. Requires internet connection and ongoing cost.

- OpenAI: `https://api.openai.com/v1`
- Anthropic: via proxy or compatible endpoint
- Google Gemini: via compatible endpoint

### Proxy / Multi-Model Aggregators

Services that provide a unified OpenAI-compatible API across multiple underlying models. Adds logging, rate limiting, fallback routing, and cost management. LiteLLM is the primary candidate.

- LiteLLM: self-hosted, routes to OpenAI, Anthropic, Cohere, local models
- OpenRouter: cloud-hosted aggregator

### Local Models (Ollama)

Run inference on local hardware. No API key, no internet dependency, no per-call cost. Quality and latency depend on hardware. See `ollama-setup.md` for configuration details.

- Ollama: `http://localhost:11434/v1`
- Any OpenAI-compatible local server

---

## Future-Proofing

The provider interface is intentionally minimal. Adding a new provider requires only a new class that implements `LLMClient`. The game engine never changes.

As the LLM space evolves — new local model architectures, new hosted APIs, function calling becoming standard — the interface can be extended without touching faction AI logic. The game engine dispatches to `llmClient.chat()`; everything else is an implementation detail.

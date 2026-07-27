# 09 — LLM Integration

## Goal

AI provider abstraction with Ollama as the primary connection; decisions are validated before reaching the engine.

## Input

- Task 01 complete (project scaffolded, `.env` loading available via Vite)
- Task 02 complete if prompt building already needs world data

## Scope (PoC only — keep it small)

- Define `LLMClient` interface and `OllamaClient` implementation:
  ```ts
  // src/game-engine/llm.ts

  type Message = {
    role: "system" | "user" | "assistant"
    content: string
  }

  interface LLMClient {
    chat(messages: Message[]): Promise<string>
  }

  type AIProvider = {
    baseUrl: string
    model: string
    apiKey?: string
    temperature?: number
  }

  class OllamaClient implements LLMClient {
    constructor(private config: AIProvider) {}

    async chat(messages: Message[]): Promise<string> {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey ?? "ollama"}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature ?? 0.2
        })
      })
      if (!res.ok) throw new Error(`LLM request failed: ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content
    }
  }
  ```

- Config via Vite env vars (`.env` file):
  ```
  VITE_AI_BASE_URL=http://localhost:11434/v1
  VITE_AI_MODEL=llama3.2
  ```

- Factory function that reads env and returns configured client:
  ```ts
  export function createLLMClient(): LLMClient {
    return new OllamaClient({
      baseUrl: import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:11434/v1",
      model:   import.meta.env.VITE_AI_MODEL   ?? "llama3.2",
      temperature: 0.2
    })
  }
  ```

- Response parser with strict schema validation:
  ```ts
  // src/game-engine/llmParse.ts
  import type { FactionDecision } from './types'

  const VALID_ACTIONS = ["attack", "ally", "ignore"] as const

  export function parseFactionDecision(raw: string, knownVillages: string[]): FactionDecision {
    let parsed: unknown
    try {
      // extract JSON block if LLM wraps it in markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? raw)
    } catch {
      console.warn("[LLM] Failed to parse response, defaulting to ignore:", raw)
      return { action: "ignore", target: null }
    }

    const action = (parsed as any).action
    const target = (parsed as any).target ?? null

    if (!VALID_ACTIONS.includes(action)) {
      console.warn("[LLM] Invalid action:", action)
      return { action: "ignore", target: null }
    }

    if (action !== "ignore" && !knownVillages.includes(target)) {
      console.warn("[LLM] Unknown target village:", target)
      return { action: "ignore", target: null }
    }

    return { action, target: action === "ignore" ? null : target }
  }
  ```

- Temperature: `0.2` (low — deterministic, predictable for PoC)
- Do not call AI every frame — the caller controls call frequency

**Critical architecture rule:**
```ts
// CORRECT: LLM advises, engine executes
const raw    = await llm.chat(messages)
const plan   = parseFactionDecision(raw, villageIds)   // validate
engine.execute(plan)                                    // engine is in control

// WRONG: never do this
engine.eval(raw)  // never trust raw LLM output
```

## Out of Scope (don't build yet)

- OpenAI / Anthropic / other provider implementations (add later if Ollama insufficient)
- Retry logic with exponential backoff
- LLM response caching
- Streaming responses
- Token counting or cost tracking
- Multiple concurrent LLM calls

## Key Types / Interfaces

```ts
type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

interface LLMClient {
  chat(messages: Message[]): Promise<string>
}

type AIProvider = {
  baseUrl: string
  model: string
  apiKey?: string
  temperature?: number
}
```

## Acceptance Criteria

- [ ] `OllamaClient.chat()` returns a string response from Ollama (requires Ollama running locally)
- [ ] Config reads from `VITE_AI_BASE_URL` and `VITE_AI_MODEL` env vars
- [ ] `parseFactionDecision()` returns `{ action: "ignore", target: null }` for invalid/unparseable output
- [ ] Temperature is `0.2` (verify in request body)
- [ ] The client and parser are ready for task 07 to consume
- [ ] All decisions reaching the engine are validated — no raw LLM strings executed
- [ ] Works with Ollama running at `http://localhost:11434` with `llama3.2` model

## Timebox

4–8 hours

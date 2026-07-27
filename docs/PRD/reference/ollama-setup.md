# Ollama Setup Guide

## What Ollama Is

Ollama is a local model runner that exposes an OpenAI-compatible REST API. You run it on your own hardware — no API key required, no internet dependency, no per-call cost. The Dune Browser Game uses Ollama as the default local AI provider for faction decision-making and dialogue generation.

Ollama's compatibility with the OpenAI API format means that switching from Ollama to OpenAI (or vice versa) requires only a `baseUrl` and `model` change in configuration — no code changes.

---

## Installation

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

After installation, Ollama runs as a background service on port 11434.

Pull a model before starting the game:

```bash
ollama pull llama3.2
```

Verify it is running:

```bash
curl http://localhost:11434/v1/models
```

---

## OpenAI-Compatible API

Ollama exposes the same API shape as OpenAI. Any code that works with OpenAI's `/v1/chat/completions` endpoint works with Ollama by changing only the `baseUrl`.

**Available endpoints:**

- `GET  /v1/models` — list available models
- `POST /v1/chat/completions` — chat completion (streaming or blocking)

**Example request:**

```ts
await fetch("http://localhost:11434/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.2",
    messages: [
      { role: "system", content: "You are a Dune faction strategist." },
      { role: "user", content: "What should the Harkonnen do this turn?" }
    ],
    temperature: 0.2,
    max_tokens: 256
  })
})
```

No `Authorization` header is needed. Ollama does not require API keys for local use.

---

## Game Configuration

Set these environment variables to connect the game to Ollama:

```bash
AI_PROVIDER=local
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=512
```

The `AI_BASE_URL` and `AI_MODEL` values are the only things that change when switching providers. The game code does not hardcode any provider details.

---

## Model Recommendations

Not all models are equally suited for game AI tasks. The key tradeoffs are reasoning quality versus speed.

| Model | Use case | Notes |
|-------|----------|-------|
| `llama3.2` | Good default | Balanced quality and speed; works on most hardware |
| `qwen2.5` | Better strategic reasoning | Noticeably stronger at structured decision-making |
| `mixtral` | High-quality reasoning | Requires more RAM; slower on CPU |
| `phi` | Lightweight NPC dialogue | Very fast; lower reasoning quality |
| `gemma:2b` | Fastest option | Minimal RAM; for rapid-fire dialogue generation |

For faction strategic decisions (called infrequently), prefer `qwen2.5` or `llama3.2`. For high-volume NPC dialogue, use `phi` or `gemma:2b`.

---

## Hardware Considerations

### CPU-only

Ollama works on CPU without a GPU. Inference is slower — expect 5–20 seconds per response depending on model size and hardware. For strategic AI decisions called once per faction per game cycle, this is acceptable. For real-time dialogue, it is too slow unless using a lightweight model.

Practical floor: any modern multi-core CPU with 8 GB RAM can run `llama3.2` on CPU.

### GPU (recommended)

GPU inference is 10–50x faster than CPU depending on model size and GPU generation. With a GPU:

- `llama3.2` produces responses in under 1 second
- `qwen2.5` produces responses in 1–3 seconds
- Enables interactive dialogue without noticeable delay

Minimum: NVIDIA GPU with 6 GB VRAM for `llama3.2`. More VRAM enables larger models.

### Apple Silicon

Ollama runs natively on Apple Silicon (M1/M2/M3/M4) using the unified memory architecture. Performance is comparable to a mid-range discrete GPU. `llama3.2` and `qwen2.5` both perform well on M-series chips.

---

## Configuration Pattern: baseUrl + model Swap

The game's LLM integration is designed so that switching from Ollama to any other provider — or switching between local models — requires only two config value changes:

```bash
# Local Ollama with llama3.2
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2

# Local Ollama with qwen2.5 (better reasoning)
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=qwen2.5

# Switch to OpenAI (no code changes)
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

This design choice — treating provider URL and model name as the only required configuration — is intentional. It avoids provider-specific client SDKs and ensures the game works with any OpenAI-compatible endpoint.

---

## Call Frequency and Caching

Ollama should not be called on every game frame. Strategic decisions are expensive — even at GPU speeds, calling the LLM every frame would dominate game performance.

**The caching rule:** Cache the last LLM response per faction. Reuse it until a significant world event triggers re-evaluation:

- A battle was won or lost
- A diplomatic status changed (alliance formed or broken)
- Resource levels crossed a strategy threshold
- A player action directly affected this faction

Between cache invalidation events, factions execute their cached strategy. This means one LLM call per faction per meaningful world event — typically a handful of calls per game minute, not hundreds per second.

**Temperature setting:** Use `temperature: 0.2` for strategic decisions. Low temperature produces consistent, deterministic-leaning output. High temperature produces creative but unpredictable responses that can break structured output parsing.

---

## Troubleshooting

**"Connection refused" on port 11434**
Ollama service is not running. Start it with `ollama serve` or confirm the background service is active.

**Model not found**
Run `ollama pull <model-name>` before starting the game. Check available models with `ollama list`.

**Slow responses**
Normal on CPU-only hardware. Consider switching to a smaller model (`phi`, `gemma:2b`) or enabling GPU if available. The game will function correctly — decisions are just cached longer.

**Unparseable LLM output**
The game's decision pipeline validates all LLM output before applying it to game state. If a response cannot be parsed, the rule-based fallback runs silently. Adjust prompts or switch to a stronger model if fallback activates frequently.

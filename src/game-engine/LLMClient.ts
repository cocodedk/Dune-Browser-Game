import type { AIConfig, AIDecision, LLMMessage, WorldState } from '../types';

// Default: Ollama local
const DEFAULT_CONFIG: AIConfig = {
  baseUrl: import.meta.env.VITE_AI_BASE_URL ?? 'http://localhost:11434/v1',
  model: import.meta.env.VITE_AI_MODEL ?? 'llama3.2',
  temperature: 0.2,
};

const SYSTEM_PROMPT = `You are the strategic AI controller for the Harkonnen faction in a Dune browser game.
Your goal is to dominate Arrakis by controlling villages and their spice production.
Given the world state, decide what the Harkonnen faction should do next.

IMPORTANT: Respond ONLY with valid JSON matching this exact schema:
{"action": "attack" | "ally" | "ignore", "targetVillageId": "<village-id>", "reason": "<short reason>"}

Available village IDs: sietch_tabr, arrakeen, carthag
Available actions:
- "attack": reduce village loyalty and potentially seize it from the player
- "ally": bribe the village to betray the player
- "ignore": do nothing this turn`;

function buildPrompt(state: WorldState): LLMMessage[] {
  const summary = state.villages.map(v =>
    `${v.name} (${v.id}): owner=${v.owner}, loyalty=${v.loyalty}, spice=${v.spice.toFixed(1)}`
  ).join('\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Game time: ${state.time.toFixed(0)}s\nVillages:\n${summary}\nPlayer influence: ${state.player.influence}\n\nWhat should the Harkonnen do?`,
    },
  ];
}

export async function decideFactionMove(state: WorldState): Promise<AIDecision> {
  const messages = buildPrompt(state);

  const response = await fetch(`${DEFAULT_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_AI_API_KEY ?? 'ollama'}`,
    },
    body: JSON.stringify({
      model: DEFAULT_CONFIG.model,
      messages,
      temperature: DEFAULT_CONFIG.temperature,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000), // 30-second timeout (thinking models need more time)
  });

  if (!response.ok) throw new Error(`LLM request failed: ${response.status}`);

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content ?? '';

  return parseDecision(content, state);
}

function parseDecision(raw: string, state: WorldState): AIDecision {
  try {
    // Extract JSON from response (LLM may wrap it in markdown)
    const match = raw.match(/\{[^}]+\}/s);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]) as Partial<AIDecision>;

    const validActions = ['attack', 'ally', 'ignore'] as const;
    const validIds = state.villages.map(v => v.id);

    if (!validActions.includes(parsed.action as never)) throw new Error('Invalid action');
    if (!validIds.includes(parsed.targetVillageId ?? '')) throw new Error('Invalid village');

    return {
      action: parsed.action as AIDecision['action'],
      targetVillageId: parsed.targetVillageId!,
      reason: parsed.reason ?? 'Harkonnen strategy',
    };
  } catch {
    // Fallback: attack first player village
    const target = state.villages.find(v => v.owner === 'player') ?? state.villages[0];
    return { action: 'attack', targetVillageId: target.id, reason: 'Parse fallback' };
  }
}

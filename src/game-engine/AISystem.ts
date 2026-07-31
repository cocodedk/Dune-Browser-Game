import { world } from './GameState';
import { pushEvent } from './EventSystem';
import { harkonnenAttack, harkonnenBribe } from './VillageSystem';
import type { AIDecision, FactionProfile, Goal } from '../types';
import { generateGoals } from './faction/goals';
import { toGoalWorldView } from './faction/adapter';
import { getDifficultyConfig } from './difficulty';

const DECISION_INTERVAL = 10;

/**
 * Harkonnen pressure on the player's holdings.
 *
 * Synchronous, and deliberately so. This used to ask a local Ollama instance to
 * play the Harkonnen and fall back to the rule below whenever that failed —
 * which was always, in any browser without an LLM listening on port 11434. The
 * request fired every DECISION_INTERVAL, so a deployed build spent the whole
 * session making a doomed call every ten game-seconds, and would have reached
 * for whatever Ollama a *player* happened to be running locally. The prompt had
 * also gone stale: it offered the model three village ids from a map that has
 * grown to nineteen, so even a reachable model could only ever act on three.
 *
 * The rule is what actually shipped, so nothing about how the game plays
 * changes here. This is also the only thing in the codebase that mechanically
 * attacks or bribes: updateFactionAI below narrates the other factions but has
 * no effect on the world, so removing this path would leave the player
 * unopposed.
 */
export function updateAI(): void {
  const timer = world.aiTimers.harkonnen;
  if (!timer) return;
  if (world.time < timer.nextDecisionAt) return;

  timer.nextDecisionAt = world.time + DECISION_INTERVAL;

  const decision = harkonnenDecision();
  if (!decision) return;
  timer.lastDecision = decision;
  executeDecision(decision);
}

/** Attack the player's weakest holding; stand down if they hold nothing. */
function harkonnenDecision(): AIDecision | null {
  const playerVillages = world.villages.filter(v => v.owner === 'player');
  if (playerVillages.length === 0) return null;

  const weakest = playerVillages.reduce((a, b) => a.loyalty < b.loyalty ? a : b);
  return {
    action: 'attack',
    targetVillageId: weakest.id,
    reason: 'Targeting weakest player village',
  };
}

function executeDecision(decision: AIDecision): void {
  const target = world.villages.find(v => v.id === decision.targetVillageId);
  if (!target) return;

  pushEvent('faction_decision', `\ud83d\udd34 Harkonnen: ${decision.action} on ${target.name} \u2014 ${decision.reason}`);

  switch (decision.action) {
    case 'attack':
      harkonnenAttack(decision.targetVillageId);
      break;
    case 'ally':
      harkonnenBribe(decision.targetVillageId);
      break;
    case 'ignore':
      break;
  }
}

/** Force a Harkonnen move now, bypassing the interval. Manual testing only. */
export function triggerFallbackDecision(): void {
  const d = harkonnenDecision();
  if (d) executeDecision(d);
}

// ── Multi-faction goal AI (new system) ────────────────────────────────────────

/**
 * Called once per day boundary by GameLoop.
 * Generates goals for each non-player faction profile and emits a single
 * faction_decision event per faction with an actionable top goal.
 * Gates on factionProfiles being populated.
 */
export function updateFactionAI(): void {
  if (world.factionProfiles.length === 0) return;

  const config = getDifficultyConfig(world.difficulty);
  const view = toGoalWorldView(world);

  for (const faction of world.factionProfiles) {
    if (faction.id === 'player') continue;

    const goals = generateGoals(faction, view, config.aiAggressionMultiplier);
    if (goals.length === 0) continue;

    const top = goals[0];
    const label = formatGoal(top, faction);
    if (label) {
      pushEvent('faction_decision', label);
    }
  }
}

function formatGoal(goal: Goal, faction: FactionProfile): string {
  switch (goal.type) {
    case 'control_spice': return `${faction.name} eyes spice at ${goal.target}`;
    case 'ally':          return `${faction.name} seeks alliance with ${goal.target}`;
    case 'destroy':       return `${faction.name} plans to destroy ${goal.target}`;
    case 'expand':        return `${faction.name} seeks to expand (target: ${goal.target} regions)`;
  }
}

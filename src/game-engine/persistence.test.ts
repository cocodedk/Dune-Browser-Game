import { describe, it, expect } from 'vitest';
import { createInitialState } from './GameState';
import { serializeWorld, deserializeWorld } from './persistence';
import type { WorldState } from '../types';

describe('persistence serialization', () => {
  it('round-trips a WorldState via JSON parse/stringify', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.time).toBe(state.time);
    expect(restored.speed).toBe(state.speed);
    expect(restored.villages).toHaveLength(state.villages.length);
    expect(restored.player.location).toBe(state.player.location);
    expect(restored.difficulty).toBe(state.difficulty);
  });

  it('handles empty regions and events', () => {
    const state: WorldState = {
      ...createInitialState(),
      regions: [],
      events: [],
    };
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.regions).toHaveLength(0);
    expect(restored.events).toHaveLength(0);
  });

  it('preserves faction profile structure', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.factionProfiles).toHaveLength(state.factionProfiles.length);
    const original = state.factionProfiles[0];
    const restoredFp = restored.factionProfiles[0];
    expect(restoredFp.id).toBe(original.id);
    expect(restoredFp.name).toBe(original.name);
    expect(restoredFp.type).toBe(original.type);
  });

  it('preserves AI timers and null dialogue', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.aiTimers).toEqual(state.aiTimers);
    expect(restored.dialogue).toBeNull();
  });

  it('round-trips modified WorldState fields', () => {
    const state = createInitialState();
    state.time = 500;
    state.speed = 5;
    state.player.spice = 100;
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.time).toBe(500);
    expect(restored.speed).toBe(5);
    expect(restored.player.spice).toBe(100);
    // docs/PRD/game-completion/02-runtime-consolidation.md "Campaign
    // status": goalAchieved "must not be serialized ... independently" —
    // it is excluded from the canonical save (state/canonical.ts) and
    // re-derived on load from world.ending, not round-tripped. A raw
    // `goalAchieved = true` set here before serializing would NOT survive
    // the trip (ending is still null), which is the point: see the
    // "derives goalAchieved from ending, not from the save" test below.
    expect(restored.goalAchieved).toBe(false);
  });

  it('tolerates unmodeled legacy keys on player (e.g. troops/influence) without stripping them — the v5 migration that removes them off old envelopes is W2f\'s, not this schema version', () => {
    const state = createInitialState();
    (state.player as unknown as Record<string, unknown>).troops = 6;
    (state.player as unknown as Record<string, unknown>).influence = 12;
    const restored = deserializeWorld(serializeWorld(state));
    const rawPlayer = restored.player as unknown as Record<string, unknown>;
    expect(rawPlayer.troops).toBe(6);
    expect(rawPlayer.influence).toBe(12);
  });

  it('derives goalAchieved from ending, not from the save', () => {
    // The positive case for the same rule: an ending DOES survive (it is
    // canonical), and goalAchieved is reconstructed from it on load, not
    // read off whatever the save happened to carry.
    const state = createInitialState();
    state.ending = 'loss_patience';
    const restored = deserializeWorld(serializeWorld(state));
    expect(restored.ending).toBe('loss_patience');
    expect(restored.goalAchieved).toBe(true);
  });
});
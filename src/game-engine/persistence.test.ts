import { describe, it, expect } from 'vitest';
import { createInitialState } from './GameState';
import { saveGame, serializeWorld, deserializeWorld, classifySave } from './persistence';
import { CURRENT_SAVE_VERSION } from './saveMigration';
import type { VersionedSave } from './saveMigration';
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

  it('never restores paused: true — a loaded game never resumes manually paused', () => {
    // W3i: a save taken while paused (e.g. the travel-start autosave) must
    // not restore frozen with the 0x control desynced from the visible
    // controls. paused is excluded from canonical state and forced false on
    // every load, the same "derived, never round-tripped" shape as
    // goalAchieved above (02-runtime-consolidation.md "Campaign status").
    const state = createInitialState();
    state.paused = true;
    const restored = deserializeWorld(serializeWorld(state));
    expect(restored.paused).toBe(false);
  });
});

// The headless persistence-boundary guard (WP04 chunk W4a): vitest's own
// 'node' test environment (vite.config.ts) has no `indexedDB` global, same
// as game-engine/sim/runner.ts's environment — so this exercises the exact
// no-op branch the runner relies on to call the REAL commandHandlers.ts
// functions (onTravel, onSettle) with no headless fork.
describe('saveGame headless no-op', () => {
  it('resolves without throwing when indexedDB is unavailable', async () => {
    expect(typeof indexedDB).toBe('undefined');
    await expect(saveGame(createInitialState())).resolves.toBeUndefined();
  });
});

// classifySave is the title screen's corrupt/absent/valid split (chunk
// W3b) — pure once given a raw envelope, exercised here against REAL
// production envelopes (built via serializeWorld, the same function
// saveGame() calls) rather than hand-shaped fakes, per 03-opening-
// experience.md "Title and run setup": a save that fails migration must
// show an explicit error, never silently read as "no save".
describe('classifySave', () => {
  it('undefined (no envelope in IndexedDB) -> absent', () => {
    expect(classifySave(undefined)).toEqual({ status: 'absent' });
  });

  it('a real envelope -> valid, day derived from lastProcessedDay when present', () => {
    const state = createInitialState(1, 'hard');
    state.lastProcessedDay = 4;
    const raw = JSON.parse(serializeWorld(state)) as VersionedSave;
    expect(classifySave(raw)).toEqual({ status: 'valid', savedAt: raw.savedAt, day: 4 });
  });

  it('a save with no lastProcessedDay yet falls back to elapsed time / 60', () => {
    const state = createInitialState();
    state.time = 185; // day 3, partway through
    state.lastProcessedDay = null;
    const raw = JSON.parse(serializeWorld(state)) as VersionedSave;
    expect(classifySave(raw)).toEqual({ status: 'valid', savedAt: raw.savedAt, day: 3 });
  });

  it('a structurally broken save (no villages/player) -> corrupt, never silently absent', () => {
    const raw: VersionedSave = {
      version: CURRENT_SAVE_VERSION, savedAt: Date.now(), state: { not: 'a world' },
    };
    expect(classifySave(raw)).toEqual({ status: 'corrupt' });
  });

  it('a save from a newer, unrecognised schema version -> corrupt', () => {
    const raw = JSON.parse(serializeWorld(createInitialState())) as VersionedSave;
    raw.version = CURRENT_SAVE_VERSION + 1;
    expect(classifySave(raw)).toEqual({ status: 'corrupt' });
  });

  it('a non-numeric savedAt is corrupt, never formatted downstream as "NaNd ago"', () => {
    const raw = JSON.parse(serializeWorld(createInitialState())) as VersionedSave;
    (raw as unknown as { savedAt: unknown }).savedAt = 'not-a-timestamp';
    expect(classifySave(raw).status).toBe('corrupt');
  });
});
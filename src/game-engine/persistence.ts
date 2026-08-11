import type { WorldState } from '../types';
import { migrateSave, CURRENT_SAVE_VERSION } from './saveMigration';
import type { VersionedSave } from './saveMigration';
import { toCanonicalState } from './state/canonical';
import type { CanonicalSaveEnvelope } from './state/schema';
import { seedFactionProfiles } from '../data/factionProfiles';

const DB_NAME = 'dune-browser-game';
const STORE_NAME = 'world-state';
const KEY = 'current';
const DB_VERSION = 1;

type SaveData = VersionedSave;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Build the on-disk envelope from live world state: the canonical campaign
 * shape (state/canonical.ts — `goalAchieved`/`factionProfiles` excluded,
 * `lastProcessedDay` included), plus schema version and save time as
 * envelope metadata. `savedAt` is display metadata ONLY — never read by
 * simulation, never part of canonical/campaign state — so its `Date.now()`
 * cannot influence engine state (docs/PRD/game-completion/
 * baseline/wp01-critic-verdict.md residue item 7).
 *
 * Typed as `CanonicalSaveEnvelope` (state/schema.ts), not the looser
 * `VersionedSave` — closing the residue item that this exact type was
 * "referenced nowhere at all" (wp01-critic-verdict.md §2d): this is now
 * the shape the production save path actually writes.
 */
function toEnvelope(world: WorldState): CanonicalSaveEnvelope {
  return { version: CURRENT_SAVE_VERSION, savedAt: Date.now(), state: toCanonicalState(world) };
}

/**
 * Migrate an on-disk envelope to a loadable WorldState. `goalAchieved` is a
 * derived compatibility shadow that must never be serialized or trusted
 * independently (02-runtime-consolidation.md "Campaign status") — every
 * load re-derives it from the declared authority, `world.ending`, whatever
 * an old raw-world save happened to carry on disk.
 *
 * `pendingSettlement` defaults to `null` for any save predating this field
 * (chunk W2c; no schema version bump — see state/schema.ts) rather than a
 * migration step: a save from before the field existed could never have
 * serialized a decision, so `null` ("no decision pending") is exactly
 * correct, not just a safe placeholder.
 *
 * `factionProfiles` is always overwritten with a fresh seed (WP02f — see
 * data/factionProfiles.ts and state/schema.ts's v5 note), regardless of
 * schema version: a save at any prior version may still carry a legacy
 * value on disk (nothing ever stripped it before), and a v5+ save never
 * serialized the field at all. Either way `migrated.factionProfiles` is not
 * trustworthy content, so this is an unconditional replace, not a `??`
 * default.
 *
 * `paused` is unconditionally forced to `false` (W3i, same "Campaign status"
 * shape as `goalAchieved` above): a save taken mid-pause must never restore
 * frozen with the 0x control desynced from a clock that never resumes.
 */
function fromEnvelope(save: VersionedSave): WorldState | null {
  const migrated = migrateSave(save);
  if (!migrated) return null;
  return {
    ...migrated,
    goalAchieved: migrated.ending !== null,
    pendingSettlement: migrated.pendingSettlement ?? null,
    factionProfiles: seedFactionProfiles(),
    paused: false,
  };
}

export async function saveGame(world: WorldState): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(toEnvelope(world), KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** The raw envelope read, shared by loadGame() and probeSave() so there is
 * exactly one IndexedDB read path. `undefined` means no save exists. */
function readRaw(): Promise<SaveData | undefined> {
  return openDB().then(db => new Promise<SaveData | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve(req.result as SaveData | undefined);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

export async function loadGame(): Promise<WorldState | null> {
  const result = await readRaw();
  if (!result) return null;
  // A save that cannot be migrated degrades to "no save" — starting a fresh
  // run beats loading a half-populated world that crashes minutes later.
  // (The title screen's Load Campaign path needs the corrupt/absent
  // distinction this collapses — see classifySave/probeSave below, which
  // read the same raw envelope through migrateSave without this fallback.)
  return fromEnvelope(result);
}

/** What the title screen needs to know about the one rolling save, before
 * committing to loading it. Three-way rather than loadGame()'s two-way
 * (null | WorldState): 03-opening-experience.md "Title and run setup"
 * requires a save that fails migration to show an explicit error, never
 * silently read as "no save exists" the way loadGame()'s own fallback does
 * on purpose for the in-game Load button. */
export type SaveProbe =
  | { status: 'absent' }
  | { status: 'corrupt' }
  | { status: 'valid'; savedAt: number; day: number }

/**
 * Pure classification of a raw envelope — no IndexedDB, so ui/title's tests
 * can exercise every branch (absent/corrupt/valid) against real
 * VersionedSave-shaped objects without touching a database. `migrateSave` is
 * already pure; this only adds the display-metadata extraction and the
 * `savedAt` type guard (a hand-edited or pre-versioning save could carry a
 * non-numeric value there, and NaN must never reach the title's "Nd ago"
 * formatting silently).
 */
export function classifySave(raw: SaveData | undefined): SaveProbe {
  if (!raw) return { status: 'absent' };
  const migrated = migrateSave(raw);
  if (!migrated) return { status: 'corrupt' };
  if (typeof raw.savedAt !== 'number' || !Number.isFinite(raw.savedAt)) return { status: 'corrupt' };
  // lastProcessedDay is the canonical day-boundary bookkeeping value
  // (TimeSystem.ts's crossedDays()) and is preferred when present; a save
  // taken before any day boundary ever ran (still possible during the
  // briefing pause) carries `null` there, so fall back to elapsed time.
  // DAY_SECONDS mirrors saveMigration.ts's migrateV3ToV4 (60) rather than
  // importing TimeSystem, which would cycle back through GameState.
  const day = migrated.lastProcessedDay ?? Math.floor(migrated.time / 60);
  return { status: 'valid', savedAt: raw.savedAt, day };
}

/** Read the rolling save and classify it — the title screen's one entry
 * point for Continue/Load Campaign metadata. Never installs the result into
 * live `world` state (see game-engine/GameState.ts): a title-screen probe
 * must not run a campaign before the player has chosen to. */
export async function probeSave(): Promise<SaveProbe> {
  return classifySave(await readRaw());
}

export async function deleteSave(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function hasSave(): Promise<boolean> {
  const db = await openDB();
  const result = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve(req.result !== undefined);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  return result;
}

/**
 * IndexedDB-free stand-ins for saveGame/loadGame, built on the exact same
 * toEnvelope/fromEnvelope logic — production persistence minus the storage
 * transport. Used by tests (vitest's `node` environment has no `indexedDB`)
 * and available to any caller that wants a portable save blob.
 */
export function serializeWorld(w: WorldState): string {
  return JSON.stringify(toEnvelope(w));
}

export function deserializeWorld(json: string): WorldState {
  const save = JSON.parse(json) as VersionedSave;
  const world = fromEnvelope(save);
  if (!world) throw new Error('deserializeWorld: save failed to migrate');
  return world;
}

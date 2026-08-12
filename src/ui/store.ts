import { create } from 'zustand'
import type { WorldState, Village, Region, RegionId, Difficulty } from '../types'
import type { SietchState } from '../game-engine/sietch/types'
import { EventBus } from '../EventBus'
import { createInitialState, setWorld } from '../game-engine/GameState'
import { currentNode } from '../game-engine/DialogueSystem'
import type { DialogueNode } from '../types'
import {
  saveGame as persistSave,
  loadGame as persistLoad,
  deleteSave,
} from '../game-engine/persistence'

/**
 * WP04 chunk W4b's seed evidence affordance (docs/PRD/game-completion/
 * 07-balance-playtest-and-release.md "Every release claim records... seed":
 * e2e/parity.spec.ts needs the browser's New Campaign to start from the
 * EXACT SAME seed its headless twin (game-engine/sim/runner.ts) used,
 * something no other production entry point can express. Read only here, at
 * the one call site that already decides the seed
 * (createInitialState(undefined, difficulty) below) — an absent or
 * malformed `?seed=` leaves the production default (DEFAULT_SEED,
 * GameState.ts) completely unchanged, so an ordinary New Campaign click is
 * unaffected. Same labeled-affordance shape as `?debug=1`
 * (DebugHandle.ts's shouldAttachDebug) — a URL param a browser evidence
 * script sets deliberately, not a hidden default.
 */
function seedFromQuery(): number | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = new URLSearchParams(window.location.search).get('seed')
  if (raw === null) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

interface UIState {
  world: WorldState
  selectedVillage: Village | null
  selectedRegion: Region | null
  /** Which crew the equipment-issue picker targets — see MarketPanel.tsx. */
  selectedGroupId: string | null
  currentDialogueNode: DialogueNode | null
  lastSaveTime: number | null
  /**
   * The top-level app gate (03-opening-experience.md "Title and run
   * setup": "The title screen appears before the renderer begins advancing
   * campaign time"). App.tsx renders TitleScreen while this is 'title' and
   * does not mount ThreeContainer at all — not paused, not constructed —
   * so GameDriver/GameLoop never tick pre-entry. Starts 'title' on every
   * fresh page load, including a mid-run reload: main.tsx no longer
   * auto-installs a save before mount, so a reload always re-shows the
   * title with Continue available, never resumes a run silently (03's
   * chosen reading — Continue is one extra click, not a fast-resume).
   * Flips to 'game' inside loadGame()/newGame() on success — there is no
   * separate 'game' -> 'title' transition in this chunk's scope.
   */
  screen: 'title' | 'game'
  // Actions
  selectVillage: (v: Village | null) => void
  selectGroup: (id: string | null) => void
  refreshDialogueNode: () => void
  saveGame: () => Promise<void>
  loadGame: () => Promise<boolean>
  newGame: (difficulty: Difficulty) => Promise<void>
}

/**
 * Re-derives every selection against a freshly loaded world, dropping any
 * that no longer resolves — the same pattern `selectedVillage`/
 * `selectedRegion` already used, extended to crews so a dissolved/merged
 * crew (troops/casualty.ts) disappears from the equipment-issue picker the
 * instant `world:updated` fires, not just from the crew list itself (02
 * "Crew lifecycle": "A destroyed crew cannot remain selectable").
 */
function refreshSelections(state: UIState, loaded: WorldState) {
  return {
    selectedVillage: state.selectedVillage
      ? loaded.villages.find(v => v.id === state.selectedVillage!.id) ?? null
      : null,
    selectedRegion: state.selectedRegion
      ? loaded.regions.find(r => r.id === state.selectedRegion!.id) ?? null
      : null,
    selectedGroupId: state.selectedGroupId && loaded.troopGroups.some(g => g.id === state.selectedGroupId)
      ? state.selectedGroupId
      : null,
    currentDialogueNode: loaded.dialogue ? currentNode() : null,
  }
}

export const useGameStore = create<UIState>((set, get) => {
  const initialWorld = createInitialState()

  EventBus.on('world:updated', ({ state }) => {
    set(s => ({
      world: state,
      ...refreshSelections(s, state),
    }))
  })

  EventBus.on('village:selected', ({ villageId }) => {
    set(s => ({
      selectedVillage: s.world.villages.find(v => v.id === villageId) ?? null,
    }))
  })

  EventBus.on('dialogue:started', ({ villageId }) => {
    set(s => ({
      selectedVillage: s.world.villages.find(v => v.id === villageId) ?? null,
      currentDialogueNode: currentNode(),
    }))
  })

  EventBus.on('dialogue:ended', () => {
    set({ currentDialogueNode: null })
  })

  EventBus.on('territory:selected', ({ regionId }: { regionId: RegionId }) => {
    set(s => ({
      selectedRegion: s.world.regions.find(r => r.id === regionId) ?? null,
    }))
  })

  return {
    world: initialWorld,
    selectedVillage: null,
    selectedRegion: null,
    selectedGroupId: null,
    currentDialogueNode: null,
    lastSaveTime: null,
    screen: 'title',
    selectVillage: (v) => set({ selectedVillage: v }),
    selectGroup: (id) => set({ selectedGroupId: id }),
    refreshDialogueNode: () => set({ currentDialogueNode: currentNode() }),
    saveGame: async () => {
      await persistSave(get().world)
      set({ lastSaveTime: Date.now() })
    },
    // Continue and Load Campaign (ui/title/) both call this directly — the
    // rolling-save model (WP11 owns multiple slots) means there is only one
    // save to load either way.
    loadGame: async () => {
      const loaded = await persistLoad()
      if (!loaded) return false
      setWorld(loaded)
      const s = get()
      set({ world: loaded, lastSaveTime: Date.now(), screen: 'game', ...refreshSelections(s, loaded) })
      EventBus.emit('world:updated', { state: loaded })
      return true
    },
    // The New Campaign setup panel's one call site for creating a run
    // (03 "Title and run setup": difficulty is written once, here, via
    // createInitialState — never mutated afterward). `resetWorld()` and
    // `setWorld()` both set GameState's module-level `world` binding; using
    // `setWorld` here keeps this store's `world` and GameState's `world` the
    // SAME object reference from the first frame, matching loadGame()'s own
    // pattern instead of building a second, momentarily-divergent copy.
    newGame: async (difficulty) => {
      await deleteSave()
      const fresh = createInitialState(seedFromQuery(), difficulty)
      setWorld(fresh)
      set({
        world: fresh,
        selectedVillage: null,
        selectedRegion: null,
        selectedGroupId: null,
        currentDialogueNode: null,
        lastSaveTime: null,
        screen: 'game',
      })
      EventBus.emit('world:updated', { state: fresh })
    },
  }
})

export function selectSietch(world: WorldState, villageId: string | undefined): SietchState | null {
  if (!villageId) return null
  return world.sietches.find(s => s.villageId === villageId) ?? null
}
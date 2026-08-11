import { create } from 'zustand'
import type { WorldState, Village, Region, RegionId } from '../types'
import type { SietchState } from '../game-engine/sietch/types'
import { EventBus } from '../EventBus'
import { createInitialState, resetWorld, setWorld } from '../game-engine/GameState'
import { currentNode } from '../game-engine/DialogueSystem'
import type { DialogueNode } from '../types'
import {
  saveGame as persistSave,
  loadGame as persistLoad,
  deleteSave,
} from '../game-engine/persistence'

interface UIState {
  world: WorldState
  selectedVillage: Village | null
  selectedRegion: Region | null
  /** Which crew the equipment-issue picker targets — see MarketPanel.tsx. */
  selectedGroupId: string | null
  currentDialogueNode: DialogueNode | null
  lastSaveTime: number | null
  // Actions
  selectVillage: (v: Village | null) => void
  selectGroup: (id: string | null) => void
  refreshDialogueNode: () => void
  saveGame: () => Promise<void>
  loadGame: () => Promise<boolean>
  newGame: () => Promise<void>
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
    selectVillage: (v) => set({ selectedVillage: v }),
    selectGroup: (id) => set({ selectedGroupId: id }),
    refreshDialogueNode: () => set({ currentDialogueNode: currentNode() }),
    saveGame: async () => {
      await persistSave(get().world)
      set({ lastSaveTime: Date.now() })
    },
    loadGame: async () => {
      const loaded = await persistLoad()
      if (!loaded) return false
      setWorld(loaded)
      const s = get()
      set({ world: loaded, lastSaveTime: Date.now(), ...refreshSelections(s, loaded) })
      EventBus.emit('world:updated', { state: loaded })
      return true
    },
    newGame: async () => {
      await deleteSave()
      resetWorld()
      const fresh = createInitialState()
      set({
        world: fresh,
        selectedVillage: null,
        selectedRegion: null,
        selectedGroupId: null,
        currentDialogueNode: null,
        lastSaveTime: null,
      })
      EventBus.emit('world:updated', { state: fresh })
    },
  }
})

export function selectSietch(world: WorldState, villageId: string | undefined): SietchState | null {
  if (!villageId) return null
  return world.sietches.find(s => s.villageId === villageId) ?? null
}
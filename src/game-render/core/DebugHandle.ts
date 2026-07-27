// src/game-render/core/DebugHandle.ts
// window.__DUNE__ — the observation surface for Playwright.
//
// E2E must never assert on pixels: headless WebGL runs through SwiftShader and
// pixel comparison is both slow and flaky. Instead we expose the facts a test
// actually cares about — is it rendering, which mode, how many draw calls —
// and let assertions run against those.

import type { SceneModeId } from '../../types'

export interface DebugHandle {
  mode: SceneModeId
  frame: number
  worldTime: number
  renderInfo: { calls: number; triangles: number }
  pick(id: string): void
}

declare global {
  interface Window {
    __DUNE__?: DebugHandle
  }
}

/**
 * Attach the handle. Enabled in dev, or in any build with `?debug=1`, so a
 * production bundle stays clean unless explicitly asked.
 */
export function shouldAttachDebug(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env?.DEV) return true
  return new URLSearchParams(window.location.search).has('debug')
}

export function attachDebugHandle(pick: (id: string) => void): DebugHandle | null {
  if (!shouldAttachDebug()) return null

  const handle: DebugHandle = {
    mode: 'strategic',
    frame: 0,
    worldTime: 0,
    renderInfo: { calls: 0, triangles: 0 },
    pick,
  }
  window.__DUNE__ = handle
  return handle
}

export function detachDebugHandle(): void {
  if (typeof window !== 'undefined') delete window.__DUNE__
}

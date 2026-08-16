// src/ui/centreBand.test.ts
// The band budget is arithmetic, so it is proven arithmetically rather than
// eyeballed in a screenshot. 1280x720 is the case that matters: it is what
// playwright.config.ts's default viewport gives every e2e run, and it is
// the height at which the old hard-coded 10vh/18vh pair overlapped.

import { describe, it, expect } from 'vitest'
import {
  BANNER_MAX_HEIGHT_PX,
  BAND_CLEARANCE_PX,
  TOAST_MIN_TOP_VH,
  bannerTopPx,
  bannerBottomPx,
  toastTopPx,
  TOAST_TOP_CSS,
  BANNER_TOP_CSS,
} from './centreBand'

const PLAYWRIGHT_HEIGHT = 720

describe('centreBand', () => {
  it('keeps the banner floor clear of the toast band at the Playwright viewport height', () => {
    const bottom = bannerBottomPx(PLAYWRIGHT_HEIGHT)
    const toastTop = toastTopPx(PLAYWRIGHT_HEIGHT)
    expect(bottom).toBeLessThan(toastTop)
    expect(toastTop - bottom).toBeGreaterThanOrEqual(BAND_CLEARANCE_PX)
  })

  it('the 720px case is the one the old literals got wrong', () => {
    // 10vh = 72, 18vh = 129.6 — only 57.6px for a ~104px banner.
    expect(bannerTopPx(PLAYWRIGHT_HEIGHT)).toBe(72)
    expect((PLAYWRIGHT_HEIGHT * TOAST_MIN_TOP_VH) / 100).toBeLessThan(
      bannerBottomPx(PLAYWRIGHT_HEIGHT),
    )
    // ...so the derived top wins there.
    expect(toastTopPx(PLAYWRIGHT_HEIGHT)).toBe(72 + BANNER_MAX_HEIGHT_PX + BAND_CLEARANCE_PX)
  })

  it('holds the clearance at every viewport height, short or tall', () => {
    for (const h of [600, 720, 800, 900, 1080, 1440, 2160]) {
      expect(toastTopPx(h) - bannerBottomPx(h)).toBeGreaterThanOrEqual(BAND_CLEARANCE_PX)
    }
  })

  it('never places toasts above their own 18vh preference', () => {
    for (const h of [600, 720, 1080, 2160]) {
      expect(toastTopPx(h)).toBeGreaterThanOrEqual((h * TOAST_MIN_TOP_VH) / 100)
    }
  })

  it('emits CSS built from the same constants as the pixel maths', () => {
    expect(BANNER_TOP_CSS).toBe('10vh')
    expect(TOAST_TOP_CSS).toBe(
      `max(${TOAST_MIN_TOP_VH}vh, calc(10vh + ${BANNER_MAX_HEIGHT_PX + BAND_CLEARANCE_PX}px))`,
    )
  })
})

// e2e/keyboardHelpers.ts
// Chunk W3g: keyboard-only traversal primitives for browser scenario #6
// (03-opening-experience.md "Browser scenarios" — "Tab/Enter/Escape only"),
// the acceptance-4 proof ("Every required opening action has a visible
// legal path without clicking a canvas marker"). Kept out of e2e/helpers.ts
// (175/200 — no room) and used only by opening8.spec.ts.
//
// Never calls .click(), .focus(), or any locator method that resolves
// through a mouse-shaped action — every step here is a real Tab/Shift+Tab
// keypress (moving actual DOM focus) or a real Enter/Escape keypress
// (activating whatever already has it), the same two primitives a keyboard-
// only player has.

import type { Page } from '@playwright/test'

interface FocusInfo {
  tag: string
  text: string
}

/** What currently has focus, as {tag, text} — never the full page body text,
 * which would false-positive against almost any substring predicate. */
async function activeElementInfo(page: Page): Promise<FocusInfo> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return { tag: el?.tagName ?? '', text: el?.textContent?.trim() ?? '' }
  })
}

/**
 * Presses Tab (checking focus BEFORE each press, so an already-focused
 * match — e.g. a React `autoFocus` button — is found with zero presses)
 * until a focused `<button>`'s trimmed text matches `pattern`, then presses
 * Enter to activate it. Throws with a clear message if `maxTabs` is
 * exhausted — that failure IS the "keyboard-unreachable" finding this
 * scenario exists to surface, not a flake to retry blind.
 *
 * Waits for a matching button to be VISIBLE first (a read-only locator
 * wait, not a click or a focus call) before starting the Tab loop.
 * Measured cause of a real flake without this: the previous step's Enter
 * fires a synchronous handler whose re-render (e.g. a dialogue tree
 * chaining to its next node) has not committed yet — the same class of race
 * e2e/helpers.ts's chooseReply and advanceUntilArrived were already
 * hardened against, here closed the same way rather than retried blind.
 */
export async function tabToButtonAndActivate(
  page: Page,
  pattern: RegExp,
  maxTabs = 60,
): Promise<void> {
  await page.getByRole('button', { name: pattern }).first().waitFor({ state: 'visible' })

  for (let i = 0; i <= maxTabs; i++) {
    const info = await activeElementInfo(page)
    if (info.tag === 'BUTTON' && pattern.test(info.text)) {
      await page.keyboard.press('Enter')
      return
    }
    await page.keyboard.press('Tab')
  }
  throw new Error(`tabToButtonAndActivate: no BUTTON matching ${pattern} was Tab-reachable within ${maxTabs} presses`)
}

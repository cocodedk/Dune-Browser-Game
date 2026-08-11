import { test, expect } from '@playwright/test'
import { chooseReply, enterGame } from './helpers'

// Chunk W3c's own new browser scenario (03-opening-experience.md "Browser
// scenarios" #1's first leg: "New Campaign → ... → briefing → ledger").
// Split into its own file rather than added to game.spec.ts, which the
// repository's 200-line cap left no headroom for after that file's own
// W3c repairs (Tests 5, 7, 8).
//
// Asserts engine-visible state after each meaningful step, not just a final
// screenshot ("a final screenshot without intermediate-state assertions is
// insufficient").
test('entering a new campaign and completing both opening beats reveals the ledger and advances the objective', async ({ page }) => {
  await enterGame(page)

  // Beat 1 is open and named — the auto-open (runtime/openingBriefing.ts).
  await expect(page.locator('text=Duke Leto Atreides').first()).toBeVisible()
  // Progressive disclosure: the tribute ledger has not appeared yet — gated
  // on ledger.read, which Beat 2 has not set.
  await expect(page.locator('text=Imperial Tribute')).toHaveCount(0)

  // ViewHint fix owed from W3c: Beat 1 is mandatory (canCloseDialogue false
  // — DialogueSystem.ts), so the conversation hint must not offer an Escape
  // that does nothing.
  await expect(page.locator('text=Choose a reply').first()).toBeVisible()
  await expect(page.locator('text=/step away/')).toHaveCount(0)

  // Beat 1, walked to its end via its reply buttons.
  await chooseReply(page, /understand the numbers first/i)
  await chooseReply(page, /hear him out/i)

  // Beat 2 (Thufir) auto-chained in the instant Beat 1 closed
  // (DialogueSystem.ts's endDialogue) — an intermediate checkpoint.
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()
  await expect(page.locator('text=Travel to Red Wall Sietch')).toHaveCount(0) // not yet — Beat 2 still open

  // Beat 2, walked to its end.
  await chooseReply(page, /show me the rest/i)
  await chooseReply(page, /what it becomes/i)
  await chooseReply(page, /we are short/i)
  await chooseReply(page, /closes it/i)
  await chooseReply(page, /go earn one/i)

  // Both beats complete: the objective advanced past read_ledger, and the
  // ledger panel (QuotaLedger.tsx) is now mounted (App.tsx gates it on
  // ledger.read).
  await expect(page.locator('text=Travel to Red Wall Sietch')).toBeVisible()
  await expect(page.locator('text=Imperial Tribute')).toBeVisible()
})

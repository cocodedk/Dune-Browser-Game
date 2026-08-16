// src/ui/centreBand.ts
// The vertical budget for the scene-centred overlay bands, in ONE place.
//
// Three things stack over the middle of the scene now: the objective banner
// (ObjectiveBanner.tsx) at the top, the transient message toasts
// (EventToasts.tsx) under it, and the decision card (ActionPrompt.tsx) at
// the bottom. The first two used hard-coded `10vh` / `18vh`, which collide
// on a short viewport: Playwright runs 1280x720, where 10vh is 72px and
// 18vh is only 130px — 58px of room for a banner that is ~100px tall.
//
// So the toast band's top is DERIVED here rather than authored twice:
// whichever is lower of its own 18vh and "the banner's floor plus a
// clearance gap". centreBand.test.ts pins the 720px case arithmetically —
// this is a measured budget, not an eyeballed one.

/** Banner's own top edge, as a share of viewport height. */
export const BANNER_TOP_VH = 10
/**
 * The tallest the banner's always-on block may draw. ObjectiveBanner caps
 * itself here with `overflow: hidden`, so a long authored title (WP05 adds
 * Act 2-4 objectives) can never push its floor past the budget below.
 *
 * Sized for the worst live case today — `act1.prepare_q1`: a title, TWO
 * substeps and a progress line, plus the Show/Why row.
 */
export const BANNER_MAX_HEIGHT_PX = 104
/** Breathing room between the banner's floor and the first toast. */
export const BAND_CLEARANCE_PX = 10
/** The toast band's own preferred top — the value it used before this
 * module existed, kept as the floor on a tall viewport where the banner's
 * fixed pixel budget resolves well above it. */
export const TOAST_MIN_TOP_VH = 18

/** Banner top edge, in px, for a viewport `heightPx` tall. */
export function bannerTopPx(heightPx: number): number {
  return (heightPx * BANNER_TOP_VH) / 100
}

/** Banner floor — the lowest pixel its capped block can reach. */
export function bannerBottomPx(heightPx: number): number {
  return bannerTopPx(heightPx) + BANNER_MAX_HEIGHT_PX
}

/** Toast band top edge, in px — never above the banner's floor + clearance. */
export function toastTopPx(heightPx: number): number {
  return Math.max(
    (heightPx * TOAST_MIN_TOP_VH) / 100,
    bannerBottomPx(heightPx) + BAND_CLEARANCE_PX,
  )
}

/** `top` for ObjectiveBanner's fixed layer. */
export const BANNER_TOP_CSS = `${BANNER_TOP_VH}vh`

/**
 * `top` for EventToasts' fixed layer — the CSS twin of toastTopPx, built
 * from the same constants so the two can never drift.
 */
export const TOAST_TOP_CSS =
  `max(${TOAST_MIN_TOP_VH}vh, calc(${BANNER_TOP_VH}vh + ${BANNER_MAX_HEIGHT_PX + BAND_CLEARANCE_PX}px))`

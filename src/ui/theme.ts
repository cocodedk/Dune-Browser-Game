// src/ui/theme.ts
// Shared visual language for the UI layer.
//
// The panels sit beside a 3D desert with a deliberate palette, and previously
// read as plain dark boxes bolted on next to it. Centralising the tokens means
// the chrome can be tuned as one system rather than per-component, and that
// the UI shares the renderer's colour story instead of fighting it.

export const palette = {
  // Sand and shadow, matched to the terrain shader's ramp.
  sandCrest: '#e3b972',
  sandMid: '#c08a52',
  sandShadow: '#7d3a18',

  // Panel substrate — deep, warm, never neutral grey.
  ink: '#0d0906',
  panel: '#150f09',
  panelRaised: '#1d150c',
  line: '#3d2b10',
  lineSoft: '#241a0c',

  // Type.
  text: '#e0cfa8',
  textDim: '#a3916d',
  textFaint: '#7d6c4d',

  // Accents.
  gold: '#d4a017',
  spiceBlue: '#5aa9c8',
  danger: '#c0392b',
  good: '#5a9e52',
} as const

export const type = {
  // A single display treatment for every panel heading.
  heading: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: 700 as const,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
  },
  label: {
    color: palette.textDim,
    fontSize: 11,
  },
  value: {
    color: palette.text,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  // Numbers that must be scannable at a glance sit larger and lighter.
  figure: {
    color: palette.text,
    fontSize: 15,
    fontWeight: 600 as const,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  note: {
    color: palette.textFaint,
    fontSize: 10,
    fontStyle: 'italic' as const,
  },
} as const

export const space = { xs: 3, sm: 6, md: 10, lg: 16 } as const

/**
 * Width of the floating command column, in pixels.
 *
 * Shared with the renderer, which shifts the camera's optical centre by half
 * of it. The canvas runs full-bleed underneath the panels, so without that
 * shift Arrakis sits centred on the *canvas* and therefore visibly off-centre
 * in the part of the screen you can actually see.
 */
export const COMMAND_COLUMN_WIDTH = 340

/**
 * Standard panel shell. The hairline top edge reads as a carved seam rather
 * than a border, which keeps a stack of panels looking like one instrument
 * panel instead of a pile of boxes.
 */
export const panelShell = {
  padding: `${space.md}px ${space.md + 2}px`,
  background: palette.panel,
  borderTop: `1px solid ${palette.lineSoft}`,
  boxShadow: `inset 0 1px 0 rgba(255, 220, 160, 0.04)`,
} as const

export const button = {
  base: {
    background: palette.panelRaised,
    color: palette.textDim,
    border: `1px solid ${palette.line}`,
    borderRadius: 2,
    fontSize: 10,
    letterSpacing: '0.04em',
    padding: '4px 8px',
    cursor: 'pointer',
    transition: 'background 120ms, color 120ms, border-color 120ms',
  },
  active: {
    background: palette.gold,
    color: palette.ink,
    borderColor: palette.gold,
    fontWeight: 700 as const,
  },
  disabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    borderColor: palette.lineSoft,
  },
} as const

/** Horizontal rule used inside panels to separate repeated rows. */
export const divider = {
  borderBottom: `1px solid ${palette.lineSoft}`,
} as const

/** A labelled figure row — the workhorse layout of every readout panel. */
export const row = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: '2px 0',
} as const

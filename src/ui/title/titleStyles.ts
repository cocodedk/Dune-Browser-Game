// src/ui/title/titleStyles.ts
// Shared style tokens for the title flow's panels — one overlay/box/heading
// language across TitleHome/NewCampaignPanel/LoadCampaignPanel/
// SettingsPanel, the same "centralise, don't repeat per component" call
// theme.ts already made for the in-game panels.

import { palette, space } from '../theme'
import type { CSSProperties } from 'react'

export const titleStyles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: `radial-gradient(ellipse at center, #241a0c 0%, ${palette.ink} 78%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: space.lg,
  },
  panel: {
    background: palette.panel,
    border: `1px solid ${palette.line}`,
    borderRadius: 6,
    padding: space.lg,
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 0 60px rgba(0,0,0,0.5)',
  },
  wordmark: {
    color: palette.gold,
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    marginBottom: space.xs,
    textAlign: 'center',
  },
  tagline: {
    color: palette.textDim,
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: space.lg * 1.5,
    textAlign: 'center',
  },
  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '100%',
  },
  menuButton: {
    background: palette.panelRaised,
    color: palette.text,
    border: `1px solid ${palette.line}`,
    borderRadius: 3,
    padding: '10px 16px',
    fontSize: 13,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textAlign: 'center',
  },
  version: {
    marginTop: space.lg,
    color: palette.textFaint,
    fontSize: 10,
    letterSpacing: '0.06em',
  },
  heading: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  note: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: space.md,
  },
  error: {
    color: palette.danger,
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: space.md,
  },
  backButton: {
    marginTop: space.lg,
    background: 'transparent',
    color: palette.textDim,
    border: `1px solid ${palette.lineSoft}`,
    borderRadius: 3,
    padding: '6px 12px',
    fontSize: 11,
    cursor: 'pointer',
  },
}

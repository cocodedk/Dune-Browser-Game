// src/ui/Ornament.tsx
// Carved framing for the instrument panels.
//
// The interfaces of that era read as *objects* — carved stone, hammered metal,
// panels with weight and edges — rather than as flat rectangles of text. A
// modern flat panel is cleaner but anonymous. This gives each panel a bevelled
// edge and a corner ornament so it reads as a fitting on a wall.
//
// All ornament here is drawn from primitives and is original to this project.

import type { CSSProperties, ReactNode } from 'react'
import { palette } from './theme'

/** Corner flourish: a bracket with an inward spur, mirrored per corner. */
function Corner({ rotate, size = 14 }: { rotate: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{
        position: 'absolute',
        transform: `rotate(${rotate}deg)`,
        pointerEvents: 'none',
        ...cornerOffset(rotate),
      }}
    >
      <path
        d="M0.5 5.5 L0.5 0.5 L5.5 0.5"
        fill="none"
        stroke={palette.gold}
        strokeWidth="1.2"
        opacity="0.75"
      />
      <path
        d="M3 0.5 L3 3 L0.5 3"
        fill="none"
        stroke={palette.gold}
        strokeWidth="0.9"
        opacity="0.45"
      />
      <circle cx="5.6" cy="5.6" r="0.9" fill={palette.gold} opacity="0.55" />
    </svg>
  )
}

function cornerOffset(rotate: number): CSSProperties {
  switch (rotate) {
    case 0: return { top: 3, left: 3 }
    case 90: return { top: 3, right: 3 }
    case 180: return { bottom: 3, right: 3 }
    default: return { bottom: 3, left: 3 }
  }
}

export interface OrnamentFrameProps {
  children: ReactNode
  /** Suppress the corner flourishes on dense, frequently repeated panels. */
  plain?: boolean
  style?: CSSProperties
}

/**
 * A panel that reads as a carved fitting rather than a div.
 *
 * The bevel is two hairlines rather than a border: a light one along the top
 * and left, a dark one along the bottom and right. That is what makes an edge
 * look cut rather than drawn.
 */
export default function OrnamentFrame({ children, plain, style }: OrnamentFrameProps) {
  return (
    <div style={{ ...frame, ...style }}>
      {!plain && (
        <>
          <Corner rotate={0} />
          <Corner rotate={90} />
          <Corner rotate={180} />
          <Corner rotate={270} />
        </>
      )}
      {children}
    </div>
  )
}

const frame: CSSProperties = {
  position: 'relative',
  // Two hairlines: lit from above-left, shadowed below-right.
  boxShadow: [
    'inset 1px 1px 0 rgba(255, 214, 150, 0.10)',
    'inset -1px -1px 0 rgba(0, 0, 0, 0.55)',
  ].join(', '),
  borderTop: `1px solid ${palette.lineSoft}`,
}

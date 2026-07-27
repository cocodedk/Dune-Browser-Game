# 01 — Project Setup

## Goal

Working Vite + React + TypeScript + Phaser 3 dev environment with a canvas visible in the browser.

## Input

- Node.js >= 18 installed
- npm available
- Empty or near-empty project directory

## Scope (PoC only — keep it small)

- Scaffold project with `npm create vite@latest` (React + TypeScript template)
- Install Phaser 3: `npm install phaser`
- Verify Phaser canvas renders in browser (a colored rectangle is enough)
- Create folder structure:
  ```
  src/
    game-engine/   # pure logic, no React, no Phaser rendering
    game-render/   # Phaser scenes and rendering code
    ui/            # React components
    data/          # hardcoded game data (villages, map nodes, dialogue)
  ```
- `npm run dev` starts without errors

## Out of Scope (don't build yet)

- Any game logic
- Any UI components beyond Phaser canvas mount
- Docker / CI / deployment
- Linting or formatting config (add later if needed)
- Tests

## Key Types / Interfaces

None for this task — structure only.

## Acceptance Criteria

- [ ] `npm run dev` runs without errors
- [ ] Browser shows a Phaser canvas (even a blank black rectangle counts)
- [ ] The four `src/` subdirectories exist
- [ ] TypeScript compiles without errors (`npm run build` or `tsc --noEmit`)

## Timebox

2–4 hours

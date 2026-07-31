# Tech Stack

## Current Required Stack

| Technology | Notes |
|------------|-------|
| Node.js 20 | current runtime target |
| TypeScript | strict mode |
| React 18   | UI shell |
| Phaser 3   | game rendering and input |
| Vite 6     | bundler and dev/preview server |
| npm        | package manager |
| Zustand    | local UI store |
| EventBus   | Phaser ↔ React coordination |
| Browser storage | required for save/resume persistence |
| ESLint     | linting |
| Playwright | browser tests |

## Optional

| Technology | Purpose              |
|------------|----------------------|
| Howler.js  | Audio                |
| Dexie      | IndexedDB wrapper     |

## Notes

- `npm run build` includes bundle-budget enforcement
- `.githooks/pre-commit` enforces file length, lint, type-check, build, and tests
- The repo is standardized on npm, not “npm or pnpm”
- Save/resume is expected to use browser storage; IndexedDB is the preferred backing store

---

# Source

Originally derived from `docs/PRD/game-plan.md`, then updated to reflect the live repository.

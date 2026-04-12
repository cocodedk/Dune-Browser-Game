# CLAUDE.md — Dune Browser Game

## Project Overview

A browser-based strategy and adventure game set in Frank Herbert's Dune universe. Players take control of House Atreides, navigate the treacherous politics of Arrakis, harvest the precious spice Melange, forge alliances with the Fremen, and outmanoeuvre rival Houses in a turn-based political simulation.

- **Language / Runtime**: TypeScript 5, Node.js 20
- **Framework**: React 18 + Vite 5
- **Test Runner**: Vitest
- **Architecture**: Feature-based modules with React context for global state
- **Package manager**: npm

---

## Required Skills — ALWAYS Invoke These

These skills **must** be invoked when the relevant situation arises. Never skip them.

| Situation | Skill |
|-----------|-------|
| Before any new feature or screen | `superpowers:brainstorming` |
| Planning multi-step changes | `superpowers:writing-plans` |
| Writing or fixing core logic | `superpowers:test-driven-development` |
| First sign of a bug or failure | `superpowers:systematic-debugging` |
| Before completing a feature branch | `superpowers:requesting-code-review` |
| Before claiming any task done | `superpowers:verification-before-completion` |
| Working on UI / frontend | `frontend-design:frontend-design` |
| After implementing — reviewing quality | `simplify` |

---

## Architecture

```
Dune-Browser-Game/
├── src/
│   ├── features/         ← Feature modules (spice, politics, combat, fremen)
│   │   ├── spice/        ← Spice harvesting mechanics
│   │   ├── politics/     ← Faction relationships and intrigue
│   │   ├── combat/       ← Combat system
│   │   └── fremen/       ← Fremen alliance mechanics
│   ├── components/       ← Shared UI components
│   ├── contexts/         ← React context providers (GameState, PlayerContext)
│   ├── hooks/            ← Custom React hooks
│   ├── types/            ← TypeScript type definitions
│   ├── utils/            ← Pure utility functions
│   ├── assets/           ← Images, fonts, audio
│   ├── App.tsx           ← Root component + routing
│   └── main.tsx          ← Vite entry point
├── public/               ← Static assets (served as-is)
├── website/              ← Static marketing site (GitHub Pages)
├── scripts/              ← Setup and CI helper scripts
├── .github/
│   └── workflows/        ← CI, release, Pages, container workflows
├── .githooks/            ← pre-commit + commit-msg hooks
├── version.txt           ← Semantic version (MAJOR.MINOR.PATCH)
└── CLAUDE.md             ← This file
```

### Layer Rules
- `features/` modules must not import from other feature modules directly — communicate via context/events
- `components/` must not import from `features/` — keep UI generic
- `utils/` must be pure functions with no React dependencies
- `contexts/` holds the single source of truth for game state

---

## Coding Conventions

- [ ] All game state is **immutable** — use spread/Object.assign for updates
- [ ] Components are **pure functional** — no class components
- [ ] Game logic lives in `features/` — not in components
- [ ] No hardcoded strings — use constants in `src/types/`
- [ ] TypeScript strict mode — no `any`, no `@ts-ignore`
- [ ] CSS: CSS Modules or Tailwind — no inline styles except dynamic values

---

## Engineering Principles

### File Size
- **200-line maximum per file** — extract a component, hook, or utility when approaching the limit

### DRY · SOLID · KISS · YAGNI
- Extract shared logic into named utilities in `src/utils/`
- Single Responsibility: one component/hook/function does one thing
- Don't add game mechanics not yet needed
- Delete dead code immediately

### TDD
- Write the failing test first (Vitest), make it pass, then refactor
- Test names describe behaviour: `"should increase spice yield when sandworm is avoided"`
- One assertion per test — keep tests focused

### Commit hygiene
- Follow Conventional Commits: `feat: ...` / `fix: ...` / `chore: ...`
- The `commit-msg` hook enforces this automatically

---

## Build Commands

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Production build → dist/
npm run preview          # Preview production build
npm run lint             # ESLint
npx tsc --noEmit         # Type-check without emitting
npm test                 # Run Vitest tests (interactive)
npm test -- --run        # Run Vitest tests (CI/non-interactive)
npm run lint && npx tsc --noEmit && npm run build   # Full smoke check
```

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file — project conventions and session startup |
| `version.txt` | Semantic version (MAJOR.MINOR.PATCH) |
| `.github/workflows/ci.yml` | CI: lint + type-check + build on every PR |
| `.github/workflows/release.yml` | Release: bump version, build, publish GitHub Release |
| `.github/workflows/deploy-pages.yml` | Deploy marketing site to GitHub Pages |
| `.github/workflows/publish-container.yml` | Publish Docker image to GHCR |
| `.githooks/pre-commit` | Runs smoke check before every commit |
| `.githooks/commit-msg` | Enforces Conventional Commits |
| `scripts/install-hooks.sh` | Run once after cloning to install hooks |
| `scripts/setup-repo.sh` | Run once after first CI to set branch protection |

---

## Starting a New Session

1. Read this file
2. Run `npm run lint && npx tsc --noEmit && npm run build` to confirm everything passes
3. Invoke `superpowers:brainstorming` before touching any feature
4. Follow the Required Skills table — every skill is mandatory, not optional

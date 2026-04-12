# Contributing to Dune Browser Game

## Local Setup
1. Install Node.js 20+ and npm.
2. Clone the repository:
   ```bash
   git clone https://github.com/cocodedk/Dune-Browser-Game.git
   cd Dune-Browser-Game
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Install Git hooks:
   ```bash
   ./scripts/install-hooks.sh
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Local Git Setup

Run these once after cloning:
```bash
git config pull.rebase true
git config core.autocrlf input
git config push.autoSetupRemote true
git config init.defaultBranch main
```

## Build and Test Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit     # Type-check without emitting
npm run preview      # Preview production build
```

Smoke check (runs in CI and pre-commit hook):
```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Branch Naming

| Branch prefix | Conventional Commit type | Example |
|---|---|---|
| `feature/` | `feat:` | `feature/add-spice-harvesting` |
| `fix/` | `fix:` | `fix/fremen-alliance-bug` |
| `chore/` | `chore:` | `chore/update-dependencies` |
| `docs/` | `docs:` | `docs/update-contributing` |
| `refactor/` | `refactor:` | `refactor/game-state-logic` |
| `ci/` | `ci:` | `ci/add-dependabot` |

Branch names use **kebab-case**. Never commit directly to `main` — always open a PR.

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Harkonnen faction
fix: correct spice yield calculation
chore: update vite to v6
```

Types: `feat|fix|chore|docs|style|refactor|test|ci|build|perf|revert`

The `commit-msg` hook enforces this automatically after running `./scripts/install-hooks.sh`.

## Coding Style
- TypeScript strict mode — no `any` unless justified
- Functional React components with hooks
- Keep files under 200 lines — split when approaching the limit
- One component per file

## PR Checklist
- [ ] Smoke check passes: `npm run lint && npx tsc --noEmit && npm run build`
- [ ] Manual test completed for changed functionality
- [ ] No regressions in adjacent features
- [ ] Updated docs if behaviour changed

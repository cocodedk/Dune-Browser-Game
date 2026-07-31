# Performance Constraints

## Browser Limits

- Memory leaks crash the tab
- Long sessions degrade performance
- Background processing is limited

## Rules

- Avoid large object churn
- Reuse objects where possible
- Cap update frequency
- Do not call AI every frame — cache decisions, call only on events

---

# Source

Extracted from `docs/PRD/game-plan.md` (Section 10)

# Claude Code Operating Framework

This file defines how Claude Code should approach ALL tasks in this project.

---

## 1. Plan Mode Default

- **Enter plan mode for ANY non-trivial task** (3+ steps or architectural decisions)
- If something goes sideways, **STOP and re-plan immediately** — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project-Specific Rules

### After Every Build
- Update `SYSTEM_DOCUMENTATION.md` if any of these changed:
  - Database schema (new tables, columns)
  - New pages or routes
  - New AI/chat capabilities
  - Business logic changes

### TechPros Business Rules
- Revenue recognized monthly via `revenue_recognition` table
- HR costs: base + bonus per team member per month
- Software costs: default costs with optional monthly overrides
- Gross Profit = Revenue - HR - Software - Travel
- Profit Pool = Gross Profit - Central Overhead (£4,200)
- Taryn's Share = 12% of Profit Pool (NOT a cost)

### Document Processing Flow
```
Upload → AI Extract → Human Confirms in Chat → Save to Tables → P&L Updates
```

### Key Files
- `SYSTEM_DOCUMENTATION.md` - System design source of truth
- `CLAUDE.md` - This file, operating framework
- `tasks/todo.md` - Current task tracking
- `tasks/lessons.md` - Learned patterns from corrections

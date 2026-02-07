# Lessons Learned

Patterns and rules learned from corrections. Review at session start.

---

## Project Setup

### Lesson: Always check for existing dependencies before installing
- **Trigger**: npm install failing due to permission issues
- **Rule**: Check package.json first, create components manually if npm fails
- **Date**: 2026-02-01

---

## Code Quality

### Lesson: Remove unused imports immediately
- **Trigger**: TypeScript build errors for unused variables
- **Rule**: After editing, scan for unused imports before committing
- **Date**: 2026-02-01

---

## Architecture

### Lesson: Use expandable menus for related pages
- **Trigger**: User requested sub-pages under Costs
- **Rule**: Group related pages under expandable sidebar items
- **Date**: 2026-02-01

---

## Documentation

### Lesson: Update SYSTEM_DOCUMENTATION.md after every build
- **Trigger**: User requested documentation as source of truth
- **Rule**: After any schema/page/capability change, update the doc
- **Date**: 2026-02-01

---

## Communication

### Lesson: Don't ask for permission to run deployments
- **Trigger**: User said "Run the deployment command automatically"
- **Rule**: Just deploy. Don't ask "should I deploy now?"
- **Date**: 2026-02-01

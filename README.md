# FlowGo

**Get in flow, go ship.**

A Claude Code plugin for autonomous, self-correcting development workflows.

## What It Does

FlowGo enforces a deterministic development cycle:

```
PLAN → BUILD → REVIEW → FIX → SHIP
```

It prevents incomplete work, ensures code quality gates pass, and handles 16 edge cases automatically.

## Installation

```bash
claude plugins install github:marcusgollahon/flowgo
```

Or clone directly:

```bash
cd ~/.claude/plugins
git clone https://github.com/marcusgollahon/flowgo
```

## Commands

| Command | Description |
|---------|-------------|
| `/flow <task>` | Start a flow session for the given task |
| `/flow-status` | Show current phase and progress |
| `/cancel-flow` | Cancel an active session |
| `/start-ralph <task>` | Start parallel task execution (Ralph mode) |
| `/cancel-ralph` | Cancel Ralph mode |
| `/flow-cleanup` | Clean up stale temp files |

## How It Works

### 1. Triage
Assesses task complexity:
- **QUICK** (3 iterations): Single file, <30 lines
- **STANDARD** (10 iterations): 2-5 files
- **DEEP** (20 iterations): 6+ files, architectural

### 2. PLAN Phase
Creates `.flow/plan.md` with:
- Problem statement
- Acceptance criteria
- Task breakdown

### 3. BUILD Phase
For each task:
- Implement
- Validate (test, lint, typecheck)
- Commit atomically

### 4. REVIEW Phase
Runs comprehensive validation:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### 5. FIX Phase
Addresses any issues found, then returns to REVIEW.

### 6. SHIP Phase
- Runs E2E verification (browser tests if available)
- Creates PR
- Enables auto-merge

## Edge Case Handling

1. **Infinite Loop Prevention** - Hard iteration limits
2. **Staleness Detection** - 8-hour threshold
3. **Incomplete Work on Exit** - STOP hook blocks until done
4. **Lost Context Recovery** - Persistent task tracking
5. **Over-engineering Prevention** - Code simplifier runs post-BUILD
6. **Clear Definition of Done** - Completion checklist enforced
7. **Git Chaos Prevention** - Atomic commits required
8. **Parallel Task Coordination** - Lock file mechanism
9. **Verification Blindness Fix** - E2E verification mandatory
10. **Stuck Approach Detection** - User escalation after 3 failures
11. **RLM Cost Tracking** - Warns/blocks on excessive sub-calls
12. **Forgotten Git Ops** - SHIP phase enforces PR creation
13. **Merge Conflict Resolution** - AI-powered conflict resolver
14. **Progress Visibility** - Step detection for status updates
15. **Smart App Detection** - Auto-detects app type for verification
16. **Browser E2E Testing** - Chrome automation when available

## Escape Hatches

If you need to exit without completing:

```bash
# Force exit (abandon work)
touch .flow/FORCE_EXIT

# Force complete (mark as done)
echo "reason" > .flow/FORCE_COMPLETE

# Cancel the session
/cancel-flow
```

## Files Created

The plugin creates a `.flow/` directory with:

| File | Purpose |
|------|---------|
| `state.json` | Loop state (phase, iteration, etc.) |
| `task.md` | Original task description |
| `plan.md` | Generated plan |
| `issues.json` | Issues found during REVIEW |
| `test-results.json` | Validation results |
| `git-results.json` | PR/merge status |

## Self-Validating Hooks

The plugin includes PostToolUse hooks that automatically validate files after edits:

- **JSON** - Syntax, trailing commas
- **CSV** - Column consistency
- **SQL** - Dangerous operations warning
- **Markdown** - Frontmatter, broken links
- **ENV** - KEY=value format
- **TypeScript** - tsc --noEmit
- **Python** - py_compile

Validation errors are tracked and block completion until resolved.

## Requirements

- Claude Code CLI
- Node.js 18+
- Git (for commit/PR features)
- GitHub CLI (`gh`) for PR creation

## License

MIT

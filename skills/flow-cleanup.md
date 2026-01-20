# Flow Cleanup

Manually clean up stale files from flow sessions.

## What This Does

1. Removes stale `.flow/` directories older than 7 days
2. Removes stale plan files from `~/.claude/plans/`
3. Cleans up orphaned lock files
4. Resets stuck escalation files

## Usage

```bash
# Remove .flow directories older than 7 days
find . -maxdepth 1 -name ".flow*" -type d -mtime +7 -exec rm -rf {} \;

# Remove stale plans
find ~/.claude/plans -name "*.md" -mtime +7 -delete

# Remove lock files
rm -f .flow/agent.lock

# Remove escalation files
rm -f .flow/NEEDS_USER
```

## When to Use

- After abandoned flow sessions
- When session-start hook reports stale directories
- Before starting a fresh project
- To clear accumulated temp files

## Manual Cleanup Commands

### Reset Everything
```bash
rm -rf .flow
```

### Keep State but Clear Issues
```bash
echo '[]' > .flow/issues.json
```

### Force Exit Stuck Session
```bash
touch .flow/FORCE_EXIT
```

### Skip Verification
```bash
echo "Manual cleanup" > .flow/FORCE_COMPLETE
```

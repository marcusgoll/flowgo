# Cancel Flow

Immediately cancels an active flow session.

## Actions

1. **Update state file**:
   ```bash
   # Read current state
   cat .flow/state.json 2>/dev/null
   ```

2. **Set cancelled state**:
   Write to `.flow/state.json`:
   ```json
   {
     "active": false,
     "complete": true,
     "phase": "CANCELLED",
     "cancelled_at": "<current ISO timestamp>",
     "reason": "User requested cancellation"
   }
   ```

3. **Clean up control files**:
   ```bash
   rm -f .flow/FORCE_EXIT .flow/FORCE_COMPLETE .flow/NEEDS_USER .flow/RALPH_HANDOFF 2>/dev/null
   ```

4. **Report**:
   ```
   Flow session cancelled.
   - State: .flow/state.json updated
   - Control files: cleaned
   ```

## Notes

- Does NOT delete `.flow/` directory (preserves history)
- Does NOT affect git state
- Safe to run even if no session active

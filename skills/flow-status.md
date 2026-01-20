# Flow Status

Display current flow session status.

## Actions

1. **Read state**:
   ```bash
   cat .flow/state.json 2>/dev/null
   ```

2. **Check for control files**:
   ```bash
   ls -la .flow/FORCE_EXIT .flow/FORCE_COMPLETE .flow/NEEDS_USER .flow/RALPH_HANDOFF 2>/dev/null
   ```

3. **Get file timestamps**:
   ```bash
   stat .flow/state.json 2>/dev/null | grep -i modify
   ```

4. **Display status**:

   **If state.json exists**:
   ```
   Flow Status
   ===========
   Phase: [phase from state.json]
   Active: [true/false]
   Complete: [true/false]
   Iteration: [current] / [max]
   Last Update: [timestamp from stat]

   Control Flags:
   - FORCE_EXIT: [yes/no]
   - FORCE_COMPLETE: [yes/no]
   - NEEDS_USER: [yes/no]
   - RALPH_HANDOFF: [yes/no]
   ```

   **If no state.json**:
   ```
   No active flow session.
   Start one with: /flow
   ```

## Notes

- Read-only operation
- Safe to run anytime

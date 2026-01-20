#!/usr/bin/env node

/**
 * Deep Loop Stop Hook v2.1 - Complete Edge Case Coverage
 *
 * Handles all 12 edge cases:
 * 1. Infinite loop prevention - Hard iteration limit with blocking
 * 2. Staleness detection - 8hr threshold, auto-cleanup
 * 3. Incomplete work on exit - Test + Git verification
 * 4. Lost context recovery - Persistent tasks with resume context
 * 5. Over-engineering prevention - Triggers code-simplifier reminder
 * 6. Clear definition of done - Completion checklist
 * 7. Git chaos prevention - Atomic commit + PR verification
 * 8. Parallel task coordination - Lock file mechanism
 * 9. Verification blindness fix - E2E verification reminder
 * 10. Stuck approach detection - User escalation after N failures
 * 11. RLM cost tracking - Sub-call limits and cost warnings
 * 12. Validation error tracking - Block completion on unresolved errors
 */

import fs from 'fs';
import path from 'path';

// File paths
const STATE_FILE = '.deep/state.json';
const PLAN_FILE = '.deep/plan.md';
const ISSUES_FILE = '.deep/issues.json';
const TASK_FILE = '.deep/task.md';
const FORCE_EXIT_FILE = '.deep/FORCE_EXIT';
const FORCE_COMPLETE_FILE = '.deep/FORCE_COMPLETE';
const PERSISTENT_TASKS_FILE = '.deep/persistent-tasks.json';
const TEST_RESULTS_FILE = '.deep/test-results.json';
const GIT_RESULTS_FILE = '.deep/git-results.json';
const LOCK_FILE = '.deep/agent.lock';
const FAILURE_FILE = '.deep/failures.json';
const ESCALATION_FILE = '.deep/NEEDS_USER';
const RALPH_HANDOFF_FILE = '.deep/RALPH_HANDOFF';
const RLM_CONTEXT_FILE = '.deep/rlm-context.json';
const RLM_COSTS_FILE = '.deep/rlm-costs.json';
const VALIDATION_STATE_FILE = '.deep/validation-state.json';

// Configuration
const STALE_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours
const DEFAULT_TASK_STALE_HOURS = 24;
const MAX_CONSECUTIVE_FAILURES = 3;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const RLM_SUB_CALL_WARNING = 30;
const RLM_SUB_CALL_LIMIT = 50;

// ============================================================================
// Edge Case 1: Infinite Loop Prevention
// ============================================================================

function checkIterationLimit(state) {
  if (!state || !state.maxIterations) return { blocked: false };

  const iteration = state.iteration || 0;
  const max = state.maxIterations;

  if (iteration >= max) {
    return {
      blocked: true,
      message: `
## ITERATION LIMIT REACHED (${iteration}/${max})

The deep loop has hit its maximum iteration limit. This prevents infinite loops.

### Options:

1. **Force exit** (abandon work):
   \`\`\`bash
   touch .deep/FORCE_EXIT
   \`\`\`

2. **Force complete** (mark as done despite limit):
   \`\`\`bash
   echo "Reached iteration limit, work is acceptable" > .deep/FORCE_COMPLETE
   \`\`\`

3. **Increase limit** (if more iterations needed):
   Edit \`.deep/state.json\` and increase \`maxIterations\`

4. **Review progress** and decide if task is actually complete
`
    };
  }

  return { blocked: false };
}

// ============================================================================
// Edge Case 2: Staleness Detection
// ============================================================================

function isStateStale() {
  try {
    const stats = fs.statSync(STATE_FILE);
    return Date.now() - stats.mtimeMs > STALE_THRESHOLD_MS;
  } catch {
    return true;
  }
}

// ============================================================================
// Edge Case 3: Incomplete Work on Exit
// ============================================================================

function verifyTestResults() {
  try {
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      return { valid: false, missing: ['test-results.json not found'], failed: [] };
    }

    const results = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    const missing = [];
    const failed = [];

    for (const cat of ['tests', 'types', 'lint', 'build']) {
      const r = results.results?.[cat];
      if (!r) missing.push(`${cat}: no results`);
      else if (!r.ran) missing.push(`${cat}: not run`);
      else if (!r.passed) failed.push(`${cat}: failed`);
    }

    if (!results.allPassed && !missing.length && !failed.length) {
      failed.push('allPassed is false');
    }

    return { valid: !missing.length && !failed.length, missing, failed };
  } catch {
    return { valid: false, missing: ['Cannot read test results'], failed: [] };
  }
}

function verifyGitResults() {
  try {
    if (!fs.existsSync(GIT_RESULTS_FILE)) {
      return { valid: true, skip: true, skipReason: 'No git-results.json' };
    }

    const results = JSON.parse(fs.readFileSync(GIT_RESULTS_FILE, 'utf8'));

    if (!results.repository?.isGitRepo) {
      return { valid: true, skip: true, skipReason: 'Not a git repo' };
    }

    if (!results.repository?.hasGhCli) {
      return { valid: true, skip: true, skipReason: 'No gh CLI' };
    }

    const missing = [];
    const failed = [];
    const enforce = results.enforcement || {};

    if (enforce.requirePR !== false && !results.pr?.created) {
      missing.push('PR not created');
    }

    if (enforce.requireCIPass !== false) {
      if (!results.ci?.checked) missing.push('CI not checked');
      else if (!results.ci?.passed) failed.push('CI failed');
    }

    if (enforce.requireMerge !== false && !results.merge?.merged) {
      missing.push('PR not merged');
    }

    return { valid: !missing.length && !failed.length, skip: false, missing, failed };
  } catch {
    return { valid: true, skip: true, skipReason: 'Cannot read git results' };
  }
}

// ============================================================================
// Edge Case 4: Lost Context Recovery
// ============================================================================

function readPersistentTasks() {
  try {
    if (!fs.existsSync(PERSISTENT_TASKS_FILE)) return null;
    return JSON.parse(fs.readFileSync(PERSISTENT_TASKS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function getPendingTasks(tasksData) {
  if (!tasksData?.tasks?.length) return [];

  const staleMs = (tasksData.config?.staleThresholdHours || DEFAULT_TASK_STALE_HOURS) * 60 * 60 * 1000;
  const now = Date.now();

  return tasksData.tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'blocked') return false;
    const created = new Date(t.createdAt).getTime();
    return now - created <= staleMs;
  });
}

// ============================================================================
// Edge Case 5: Over-engineering Prevention
// ============================================================================

function getSimplificationReminder(phase) {
  if (phase !== 'BUILD') return '';

  return `
### Code Simplification Reminder

After completing BUILD, consider running the code-simplifier:
- Remove unused imports
- Flatten unnecessary nesting
- Delete dead code
- Avoid over-abstraction
`;
}

// ============================================================================
// Edge Case 6: Clear Definition of Done
// ============================================================================

function getCompletionChecklist() {
  return `
### Completion Checklist

Before marking COMPLETE, verify:

- [ ] All acceptance criteria from plan.md are met
- [ ] All tests pass (\`npm test\`)
- [ ] No type errors (\`npm run typecheck\`)
- [ ] No lint errors (\`npm run lint\`)
- [ ] Build succeeds (\`npm run build\`)
- [ ] PR created and merged (if git repo)
- [ ] No blocking issues in issues.json

Only output \`<promise>COMPLETE</promise>\` when ALL items are checked.
`;
}

// ============================================================================
// Edge Case 7: Git Chaos Prevention
// ============================================================================

function getAtomicCommitReminder() {
  return `
### Atomic Commit Protocol

For each task completion:
1. Stage ONLY files for this task
2. Write descriptive commit message
3. Format: \`deep: [task-id] - [brief description]\`

Example:
\`\`\`bash
git add src/specific-file.ts
git commit -m "deep: task-001 - add user validation"
\`\`\`

Do NOT bundle unrelated changes in one commit.
`;
}

// ============================================================================
// Edge Case 8: Parallel Task Coordination
// ============================================================================

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      const age = Date.now() - new Date(lock.acquiredAt).getTime();

      if (age < LOCK_TIMEOUT_MS) {
        return { acquired: false, holder: lock.agentId, age };
      }
      // Lock is stale, can acquire
    }

    const lockData = {
      agentId: process.pid.toString(),
      acquiredAt: new Date().toISOString()
    };

    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
    return { acquired: true };
  } catch {
    return { acquired: true }; // Fail open
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      if (lock.agentId === process.pid.toString()) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {
    // Ignore
  }
}

// ============================================================================
// Edge Case 9: Verification Blindness Fix
// ============================================================================

function getVerificationReminder(state) {
  if (state?.phase !== 'REVIEW') return '';

  return `
### E2E Verification Required

Before completing REVIEW:

1. **If web app**: Use browser tools to test actual UI
   - Take screenshots
   - Click through flows
   - Check for console errors

2. **If API**: Make real HTTP requests
   - Test happy path
   - Test error cases
   - Verify response structure

3. **If CLI**: Run with sample inputs
   - Check output format
   - Test edge cases
   - Verify exit codes

Do NOT rely only on unit tests - verify real behavior.
`;
}

// ============================================================================
// Edge Case 10: Stuck Approach Detection
// ============================================================================

function trackFailure(taskId, error) {
  try {
    let failures = {};
    if (fs.existsSync(FAILURE_FILE)) {
      failures = JSON.parse(fs.readFileSync(FAILURE_FILE, 'utf8'));
    }

    if (!failures[taskId]) {
      failures[taskId] = { count: 0, errors: [] };
    }

    failures[taskId].count++;
    failures[taskId].errors.push({
      error,
      timestamp: new Date().toISOString()
    });
    failures[taskId].lastFailure = new Date().toISOString();

    fs.writeFileSync(FAILURE_FILE, JSON.stringify(failures, null, 2));

    return failures[taskId].count;
  } catch {
    return 0;
  }
}

function checkUserEscalation(taskId) {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return { escalate: false };

    const failures = JSON.parse(fs.readFileSync(FAILURE_FILE, 'utf8'));
    const taskFailures = failures[taskId];

    if (taskFailures && taskFailures.count >= MAX_CONSECUTIVE_FAILURES) {
      // Create escalation file
      const escalation = {
        taskId,
        failures: taskFailures.count,
        errors: taskFailures.errors.slice(-3),
        createdAt: new Date().toISOString(),
        message: 'Task has failed multiple times. User intervention recommended.'
      };

      fs.writeFileSync(ESCALATION_FILE, JSON.stringify(escalation, null, 2));

      return {
        escalate: true,
        message: `
## USER ESCALATION REQUIRED

Task \`${taskId}\` has failed ${taskFailures.count} consecutive times.

### Recent Errors:
${taskFailures.errors.slice(-3).map(e => `- ${e.error}`).join('\n')}

### Options:

1. **Provide guidance** in the chat
2. **Skip this task**:
   Update \`.deep/persistent-tasks.json\`:
   \`"status": "blocked", "blockedReason": "User skipped"\`
3. **Abandon the loop**:
   \`touch .deep/FORCE_EXIT\`

The loop is BLOCKED until you respond.
`
      };
    }

    return { escalate: false };
  } catch {
    return { escalate: false };
  }
}

// ============================================================================
// Edge Case 11: RLM Cost Tracking
// ============================================================================

function checkRlmCosts() {
  try {
    if (!fs.existsSync(RLM_CONTEXT_FILE)) {
      return { ok: true };
    }

    const context = JSON.parse(fs.readFileSync(RLM_CONTEXT_FILE, 'utf8'));
    const subCalls = context.sub_calls || 0;

    // Track cumulative costs
    let costs = { total_sub_calls: 0, sessions: [] };
    if (fs.existsSync(RLM_COSTS_FILE)) {
      costs = JSON.parse(fs.readFileSync(RLM_COSTS_FILE, 'utf8'));
    }

    // Update costs
    costs.total_sub_calls = (costs.total_sub_calls || 0) + subCalls;
    costs.last_updated = new Date().toISOString();
    if (!costs.sessions) costs.sessions = [];
    costs.sessions.push({
      timestamp: new Date().toISOString(),
      sub_calls: subCalls,
      cost_estimate: context.cost_estimate || 'unknown'
    });

    // Keep only last 10 sessions
    if (costs.sessions.length > 10) {
      costs.sessions = costs.sessions.slice(-10);
    }

    fs.writeFileSync(RLM_COSTS_FILE, JSON.stringify(costs, null, 2));

    // Check limits
    if (subCalls >= RLM_SUB_CALL_LIMIT) {
      return {
        ok: false,
        blocked: true,
        message: `
## RLM COST LIMIT REACHED

Sub-LM calls: ${subCalls}/${RLM_SUB_CALL_LIMIT}

The RLM operation has hit the maximum sub-call limit.
This prevents runaway costs.

### Options:

1. **Continue anyway** (acknowledge cost):
   \`\`\`bash
   echo "Acknowledged: RLM costs accepted" >> .deep/rlm-context.json
   \`\`\`

2. **Abort RLM operation**:
   Delete \`.deep/rlm-context.json\` and use standard exploration

3. **Review costs**:
   See \`.deep/rlm-costs.json\` for cumulative tracking
`
      };
    }

    if (subCalls >= RLM_SUB_CALL_WARNING) {
      return {
        ok: true,
        warning: `
### RLM Cost Warning

Sub-LM calls: ${subCalls}/${RLM_SUB_CALL_LIMIT}

Approaching cost limit. Consider:
- Reducing chunk granularity
- Using more targeted filtering
- Stopping exploration early if sufficient data gathered
`
      };
    }

    return { ok: true };
  } catch {
    return { ok: true }; // Fail open
  }
}

function getRlmStatusSummary() {
  try {
    if (!fs.existsSync(RLM_CONTEXT_FILE)) {
      return '';
    }

    const context = JSON.parse(fs.readFileSync(RLM_CONTEXT_FILE, 'utf8'));

    const processedChunks = (context.chunks || []).filter(c => c.processed).length;
    const totalChunks = (context.chunks || []).length;

    return `
### RLM Status
- Chunks: ${processedChunks}/${totalChunks} processed
- Sub-calls: ${context.sub_calls || 0}
- Cost estimate: ${context.cost_estimate || 'unknown'}
`;
  } catch {
    return '';
  }
}

// ============================================================================
// Edge Case 12: Validation Error Tracking
// ============================================================================

function checkValidationErrors() {
  try {
    if (!fs.existsSync(VALIDATION_STATE_FILE)) {
      return { ok: true };
    }

    const state = JSON.parse(fs.readFileSync(VALIDATION_STATE_FILE, 'utf8'));
    const errors = state.errors || [];

    // Filter to recent errors (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentErrors = errors.filter(e =>
      new Date(e.timestamp).getTime() > oneHourAgo
    );

    if (recentErrors.length === 0) {
      return { ok: true };
    }

    // Group errors by file
    const byFile = {};
    for (const err of recentErrors) {
      const file = err.file || 'unknown';
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push(err);
    }

    return {
      ok: false,
      errorCount: recentErrors.length,
      byFile,
      message: formatValidationErrors(byFile)
    };
  } catch {
    return { ok: true };
  }
}

function formatValidationErrors(byFile) {
  const lines = [
    '',
    '## Validation Errors',
    '',
    'The following files have unresolved validation errors:',
    ''
  ];

  for (const [file, errors] of Object.entries(byFile)) {
    lines.push(`### ${file}`);
    for (const err of errors.slice(0, 5)) {
      const loc = err.line ? `L${err.line}: ` : '';
      lines.push(`- ${loc}${err.message}`);
    }
    if (errors.length > 5) {
      lines.push(`- ... and ${errors.length - 5} more`);
    }
    lines.push('');
  }

  lines.push('Fix these errors before completing the task.');
  lines.push('');

  return lines.join('\n');
}

function getValidationSummary() {
  try {
    if (!fs.existsSync(VALIDATION_STATE_FILE)) {
      return '';
    }

    const state = JSON.parse(fs.readFileSync(VALIDATION_STATE_FILE, 'utf8'));

    if (!state.filesValidated) {
      return '';
    }

    const errorCount = (state.errors || []).length;

    if (errorCount === 0) {
      return `\n### Validation: ${state.filesValidated} files validated, no errors`;
    }

    return `\n### Validation: ${state.filesValidated} files validated, ${errorCount} errors pending`;
  } catch {
    return '';
  }
}

// ============================================================================
// Main Hook Logic
// ============================================================================

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function shouldForceExit() {
  if (fs.existsSync(FORCE_EXIT_FILE)) {
    try { fs.unlinkSync(FORCE_EXIT_FILE); } catch {}
    return true;
  }
  return false;
}

function shouldForceComplete() {
  if (fs.existsSync(FORCE_COMPLETE_FILE)) {
    try {
      const reason = fs.readFileSync(FORCE_COMPLETE_FILE, 'utf8').trim();
      console.log(`## Force complete: ${reason || 'No reason given'}`);
      fs.unlinkSync(FORCE_COMPLETE_FILE);
    } catch {}
    return true;
  }
  return false;
}

function shouldRalphHandoff() {
  if (fs.existsSync(RALPH_HANDOFF_FILE)) {
    try { fs.unlinkSync(RALPH_HANDOFF_FILE); } catch {}
    return true;
  }
  return false;
}

function getPhasePrompt(state, tasksData = null) {
  const { phase, iteration, maxIterations, task } = state;

  const rlmStatus = getRlmStatusSummary();
  const validationStatus = getValidationSummary();

  const header = `
## Deep Loop - Iteration ${iteration}/${maxIterations}
**Phase:** ${phase}
**Task:** ${task || 'See .deep/task.md'}
${rlmStatus}${validationStatus}`;

  const prompts = {
    'PLAN': `${header}
### PLAN Phase

Create \`.deep/plan.md\` with:
1. Problem statement
2. Acceptance criteria (testable)
3. Task breakdown (atomic)
4. Risks

When done: Update state.json to \`"phase": "BUILD"\`
`,
    'BUILD': `${header}
### BUILD Phase

Execute tasks from plan.md:
1. Work through tasks in order
2. Run validation after each (test, lint, types)
3. Commit atomically per task
4. Log failures to issues.json
${getAtomicCommitReminder()}
${getSimplificationReminder('BUILD')}

When done: Update state.json to \`"phase": "REVIEW"\`
`,
    'REVIEW': `${header}
### REVIEW Phase

Run comprehensive review:
1. Code review patterns
2. Security audit
3. Test coverage
4. E2E verification
${getVerificationReminder(state)}
${getCompletionChecklist()}

If issues: Update to \`"phase": "FIX"\`
If clean: Update to \`"phase": "SHIP"\`, \`"complete": true\`
`,
    'FIX': `${header}
### FIX Phase

Address issues from issues.json:
1. Fix each issue
2. Commit atomically
3. Run validation

When done: Clear issues.json, update to \`"phase": "REVIEW"\`
`,
    'SHIP': `${header}
### SHIP Phase

**MANDATORY: Invoke verify-app subagent via Task tool before completing.**

Git Integration (if in repo):
1. Push branch
2. Create PR
3. Wait for CI
4. Merge

When ALL gates pass: Update state.json \`"phase": "SHIP", "complete": true\`
Output: \`<promise>COMPLETE</promise>\`
`,
    'COMPLETE': null
  };

  return prompts[phase] || null;
}

function main() {
  // Force exit check
  if (shouldForceExit()) {
    console.log('## Deep Loop - Force exit');
    process.exit(0);
  }

  // Force complete check
  if (shouldForceComplete()) {
    process.exit(0);
  }

  // Ralph handoff check
  if (shouldRalphHandoff()) {
    console.log('## Deep Loop - Ralph handoff');
    process.exit(0);
  }

  // User escalation check
  if (fs.existsSync(ESCALATION_FILE)) {
    try {
      const esc = JSON.parse(fs.readFileSync(ESCALATION_FILE, 'utf8'));
      console.log(`
## BLOCKED - User Escalation Pending

Task \`${esc.taskId}\` needs your attention.
See \`.deep/NEEDS_USER\` for details.

To continue: Delete \`.deep/NEEDS_USER\` after addressing the issue.
`);
      console.error('[BLOCKED] User escalation pending');
      process.exit(2);
    } catch {}
  }

  const state = readState();
  const tasksData = readPersistentTasks();

  // RLM cost check (Edge Case 11)
  const rlmCheck = checkRlmCosts();
  if (rlmCheck.blocked) {
    console.log(rlmCheck.message);
    console.error('[BLOCKED] RLM cost limit reached');
    process.exit(2);
  }
  if (rlmCheck.warning) {
    console.log(rlmCheck.warning);
  }

  // Check deep loop state
  if (state && state.complete !== true && state.phase !== 'COMPLETE' && state.phase !== 'SHIP') {
    // Staleness check
    if (isStateStale()) {
      console.log('## Deep Loop - Stale state (>8hrs), allowing exit');
    }
    // Iteration limit check (Edge Case 1)
    else {
      const iterCheck = checkIterationLimit(state);
      if (iterCheck.blocked) {
        console.log(iterCheck.message);
        console.error('[BLOCKED] Iteration limit reached');
        process.exit(2);
      }

      // Active loop - block and continue
      state.iteration = (state.iteration || 0) + 1;
      state.lastActivity = new Date().toISOString();
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

      const prompt = getPhasePrompt(state, tasksData);
      if (prompt) {
        console.log(prompt);
        console.error('[BLOCKED] Deep Loop phase: ' + state.phase);
        process.exit(2);
      }
    }
  }

  // Verify completion (Edge Cases 3, 7, 12)
  if (state && (state.complete === true || state.phase === 'COMPLETE' || state.phase === 'SHIP')) {
    // Check validation errors first (Edge Case 12)
    const validationCheck = checkValidationErrors();
    if (!validationCheck.ok) {
      console.log(validationCheck.message);
      console.log('\nFix validation errors before completing.');
      state.phase = 'FIX';
      state.complete = false;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.error('[BLOCKED] Validation errors pending');
      process.exit(2);
    }

    const testV = verifyTestResults();
    if (!testV.valid) {
      console.log(`
## BLOCKED - Tests Not Verified

${testV.missing.length ? '**Missing:** ' + testV.missing.join(', ') : ''}
${testV.failed.length ? '**Failed:** ' + testV.failed.join(', ') : ''}

Run all validations and update test-results.json.
`);
      state.phase = 'REVIEW';
      state.complete = false;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.error('[BLOCKED] Test verification failed');
      process.exit(2);
    }

    const gitV = verifyGitResults();
    if (!gitV.skip && !gitV.valid) {
      console.log(`
## BLOCKED - Git Workflow Incomplete

${gitV.missing.length ? '**Missing:** ' + gitV.missing.join(', ') : ''}
${gitV.failed.length ? '**Failed:** ' + gitV.failed.join(', ') : ''}

Complete the git workflow:
1. Create PR: \`gh pr create\`
2. Wait for CI: \`gh pr checks --watch\`
3. Merge: \`gh pr merge --squash\`
`);
      state.phase = 'REVIEW';
      state.complete = false;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.error('[BLOCKED] Git verification failed');
      process.exit(2);
    }
  }

  // Check persistent tasks (Edge Case 4)
  const pendingTasks = getPendingTasks(tasksData);
  if (pendingTasks.length > 0) {
    const current = pendingTasks.find(t => t.status === 'in_progress') || pendingTasks[0];

    // Check for stuck task (Edge Case 10)
    const escCheck = checkUserEscalation(current.id);
    if (escCheck.escalate) {
      console.log(escCheck.message);
      console.error('[BLOCKED] User escalation required');
      process.exit(2);
    }

    console.log(`
## Persistent Tasks - ${pendingTasks.length} remaining

**Next:** ${current.content}
**ID:** ${current.id}
**Iteration:** ${current.iteration || 1}

Continue working. Update persistent-tasks.json when complete.
`);
    console.error('[BLOCKED] ' + pendingTasks.length + ' tasks remaining');
    process.exit(2);
  }

  // Cleanup on success
  releaseLock();

  console.log('[OK] Deep Loop: Exit allowed');
  process.exit(0);
}

main();

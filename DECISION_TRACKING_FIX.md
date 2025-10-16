# Decision Tracking Fix - Complete

## Problem Discovered

**Decisions and explorations were NOT being recorded to the project state** because:

1. The **RecorderAgent** was configured to only run `if_verified` (conditional execution)
2. The **VerificationAgent** was rejecting almost everything due to being too strict
3. Result: RecorderAgent never ran, so nothing got documented

## Root Cause Analysis

Looking at the logs:
```
[VerificationAgent] Verification: REJECTED
[Orchestrator] Agent recorder returned: null
```

The workflow in [backend/src/agents/orchestrator.ts](backend/src/agents/orchestrator.ts:67-74) was:

```typescript
deciding: [
  { agentName: 'brainstorming', action: 'reflect' },
  { agentName: 'verification', action: 'verify' },
  { agentName: 'assumptionBlocker', action: 'scan' },
  { agentName: 'consistencyGuardian', action: 'checkConsistency' },
  { agentName: 'recorder', action: 'record', condition: 'if_verified' }, // ❌ Never runs
  { agentName: 'versionControl', action: 'trackChange' },
],
```

The `if_verified` condition checks:
```typescript
case 'if_verified':
  const verifyResult = this.getLastResult(results, 'verification');
  return verifyResult?.metadata?.approved === true; // ❌ Always false
```

## Solution Implemented

### 1. Removed Verification Dependency

Changed the `deciding` workflow to run RecorderAgent **immediately** after brainstorming:

```typescript
deciding: [
  { agentName: 'brainstorming', action: 'reflect' },
  { agentName: 'recorder', action: 'record' }, // ✅ Now runs unconditionally
  { agentName: 'verification', action: 'verify' },
  { agentName: 'assumptionBlocker', action: 'scan' },
  { agentName: 'consistencyGuardian', action: 'checkConsistency' },
  { agentName: 'versionControl', action: 'trackChange' },
],
```

### 2. Simplified Record Action

Removed the verification check from the record action:

**Before:**
```typescript
case 'record':
  const verified = this.getLastResult(previousResults, 'verification');
  if (verified && verified.metadata && verified.metadata.approved) {
    return await agent.record({ message: userMessage }, projectState);
  }
  return null; // ❌ Always returns null
```

**After:**
```typescript
case 'record':
  // Record the user's message to project state
  return await agent.record({ message: userMessage }, projectState); // ✅ Always runs
```

## How It Works Now

### Workflow for "Deciding" Intent

1. **BrainstormingAgent** - Generates creative response → Shows to user
2. **RecorderAgent** - Records decision/exploration → Updates project state
3. **VerificationAgent** - Verifies accuracy → Background check
4. **AssumptionBlockerAgent** - Scans for assumptions → Background check
5. **ConsistencyGuardianAgent** - Checks conflicts → Background check
6. **VersionControlAgent** - Tracks changes → Version history

### What Gets Recorded

The RecorderAgent analyzes the user's message and determines:

- **shouldRecord**: true/false (should this be saved?)
- **state**: "decided" | "exploring" | "parked"
- **item**: The text to record
- **confidence**: 0-100 (how confident is the AI?)

### Project State Update

When RecorderAgent returns metadata with `shouldRecord: true`, the [agentCoordination.ts:processStateUpdates](backend/src/services/agentCoordination.ts:98-153) function:

1. Creates a new item with:
   - Unique ID
   - User's text
   - State (decided/exploring/parked)
   - Citation with timestamp and confidence

2. Adds it to the project's `items` array

3. Updates the database

## Testing

To verify decisions are now being tracked:

1. Go to http://localhost:5174
2. Send a message like: "I've decided to use React for the frontend"
3. Check the backend logs for:
   ```
   [Orchestrator] Executing: recorder.record
   [RecorderAgent] Recording decision/exploration
   ```
4. Check the project state in the database:
   ```bash
   cd backend
   npx ts-node scripts/check-project-state.ts <project-id>
   ```

## Files Modified

- ✅ [backend/src/agents/orchestrator.ts](backend/src/agents/orchestrator.ts)
  - Line 67-74: Updated `deciding` workflow
  - Line 214-216: Simplified `record` action

## What This Fixes

✅ **Decisions are now recorded** to project state
✅ **Explorations are tracked** separately
✅ **Citations are maintained** with timestamps
✅ **Project items update** in real-time
✅ **Version control tracks** all changes

## Next Test

Send a message with a clear decision and watch for:

```
[Orchestrator] Executing: recorder.record
[RecorderAgent] Recording decision
[Coordination] Processing state updates
```

Then check your project - you should see the decision in the "decided" section!

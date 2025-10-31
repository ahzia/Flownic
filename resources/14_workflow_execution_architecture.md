# Workflow Execution Architecture & Data Point Handling

## Overview

There are **TWO separate workflow execution systems** in the codebase, but only **ONE is currently active**:

1. **`serviceWorker.ts`** ✅ **ACTIVE** - Currently used for all workflow execution
2. **`WorkflowExecutor.ts`** ❌ **UNUSED** - Legacy/alternative implementation, not currently called anywhere

## Active Execution Path: `serviceWorker.ts`

### Flow Diagram

```
User Triggers Workflow (keyboard shortcut, etc.)
    ↓
WorkflowTriggerManager (content script)
    ↓
chrome.runtime.sendMessage('EXECUTE_WORKFLOW')
    ↓
serviceWorker.ts: executeWorkflow()
    ├─→ Step 1: Gather context data (selected_text, extracted_text, page_content)
    ├─→ Step 1.5: Load KB entries from chrome.storage.local
    ├─→ Step 2: For each workflow step:
    │   ├─→ resolveDataPointReferences() - Resolves data points & tokens
    │   ├─→ If task: executeTaskInContent() → TaskExecutor (content script)
    │   └─→ If handler: executeHandlerInContent() → HandlerExecutor (content script)
    └─→ Return results
```

### Key Functions

#### `executeWorkflow(workflow, tabId)`
- Main entry point for workflow execution
- Runs in **background service worker** (has access to chrome.storage, chrome.tabs.sendMessage)
- Gathers context, loads KB entries, orchestrates step execution

#### `resolveDataPointReferences(input, dataPoints)`
**Handles BOTH old and new formats:**

1. **Old Format** (object-based):
   ```json
   {
     "type": "data_point",
     "dataPointId": "selected_text",
     "field": "text"
   }
   ```
   - Checks `if (input.type === 'data_point')`
   - Looks up data point by ID
   - Extracts field value

2. **New Format** (token-based):
   ```json
   "The text is: ${selected_text.text}"
   ```
   - Checks `if (typeof input === 'string')`
   - Calls `interpolateTextWithDataPoints(text, dataPoints)`
   - Replaces `${dataPointId.field}` tokens with actual values

3. **Recursive Resolution**:
   - Recursively processes nested objects
   - Interpolates strings found at any level

#### `interpolateTextWithDataPoints(text, dataPoints)`
- Finds all `${...}` tokens using regex
- Resolves each token:
  - Tries exact data point ID match
  - Falls back to normalized formats (removes timestamps)
  - Supports: `${dataPointId}`, `${dataPointId.field}`, `${dataPointId.__raw__}`

#### `loadKBDataPoints()`
- Loads KB entries from `chrome.storage.local['kbEntries']`
- Converts to data points with ID format: `kb_${entry.id}`
- Adds them to the data points array before execution

### Data Point Sources

When `executeWorkflow()` runs, it combines data points from:

1. **Context Data** (from `ContextGatherer`):
   - `selected_text` - Currently selected text on page
   - `extracted_text` - Full page text (no HTML)
   - `page_content` - Full HTML content

2. **KB Entries** (from `loadKBDataPoints()`):
   - `kb_${entryId}` - Each knowledge base entry

3. **Task Outputs** (added during execution):
   - `${stepId}_output` - Output from each completed task step

## Unused Execution Path: `WorkflowExecutor.ts`

### Why It Exists
- Appears to be an **older design** or **alternative implementation**
- Uses OOP pattern with `DataPointManager`, `TaskRegistry`, `HandlerRegistry`
- **Not imported or used anywhere** in the active codebase
- Only handles **old format** data points (`DataPointReference` objects)

### Key Differences

| Feature | serviceWorker.ts | WorkflowExecutor.ts |
|---------|------------------|---------------------|
| **Location** | Background worker | Could run anywhere |
| **Data Point Format** | ✅ Old + ✅ New tokens | ❌ Only old format |
| **KB Loading** | ✅ Built-in | ❌ Not implemented |
| **Context Gathering** | ✅ Via content script | ❌ Requires separate setup |
| **Chrome AI APIs** | ✅ Via content script | ❌ Would need refactoring |
| **Currently Used** | ✅ YES | ❌ NO |

## Data Point Format Handling

### Old Format (Still Supported)

```json
{
  "input": {
    "text": {
      "type": "data_point",
      "dataPointId": "selected_text",
      "field": "text"
    }
  }
}
```

**Resolution in `resolveDataPointReferences()`:**
```typescript
if (input.type === 'data_point') {
  const dataPoint = dataPoints.find(dp => dp.id === input.dataPointId)
  // Extract field value...
}
```

### New Format (Token-based)

```json
{
  "input": {
    "prompt": "Create a cover letter using: ${kb_kb_1761853737960.text} for job: ${extracted_text.text}"
  }
}
```

**Resolution in `resolveDataPointReferences()`:**
```typescript
if (typeof input === 'string') {
  return interpolateTextWithDataPoints(input, dataPoints)
  // Finds ${...} tokens and replaces them
}
```

### Mixed Format Support

Both formats work in the same workflow:

```json
{
  "input": {
    "text": {
      "type": "data_point",  // Old format
      "dataPointId": "selected_text",
      "field": "text"
    },
    "prompt": "Translate: ${selected_text.text}"  // New format in same object
  }
}
```

## Where Resolution Happens

### Timeline During Execution

1. **Before Task/Handler Execution** (in `serviceWorker.ts`):
   ```typescript
   // Line 94: Resolve all inputs BEFORE sending to content script
   const resolvedInput = resolveDataPointReferences(step.input, dataPoints)
   ```

2. **Task/Handler Receive Resolved Values**:
   - Tasks and handlers receive **already-resolved** values
   - They don't need to know about data points or tokens
   - They just work with the actual data (strings, objects, etc.)

### Example Flow

**Input (workflow JSON):**
```json
{
  "prompt": "Translate: ${selected_text.text} to ${target_lang}"
}
```

**After `resolveDataPointReferences()`:**
```json
{
  "prompt": "Translate: Hello world to German"
}
```

**Sent to TaskExecutor:**
- Task receives the resolved string directly
- No knowledge of `${...}` tokens

## ID Normalization

The system handles ID mismatches between UI and execution:

### UI-Generated IDs (with timestamps)
- Task outputs: `step_1761863701123_output_1761863705878`
- Context providers: `extracted_text_1761863695732`
- KB entries: `kb_kb_1761853737960`

### Execution IDs (simplified)
- Task outputs: `step_1761863701123_output`
- Context providers: `extracted_text`
- KB entries: `kb_kb_1761853737960`

**Normalization happens in `interpolateTextWithDataPoints()`:**
- Tries exact match first
- Falls back to normalized format (strips timestamps)
- For outputs: `step_xxx_output_timestamp` → `step_xxx_output`
- For context: `extracted_text_timestamp` → `extracted_text`

## Summary

- **Active System**: `serviceWorker.ts` handles all workflow execution
- **Legacy System**: `WorkflowExecutor.ts` is not used
- **Data Points**: Both old (object) and new (token) formats are supported
- **Resolution**: Happens in background worker before tasks/handlers execute
- **Backward Compatible**: Old workflows continue to work


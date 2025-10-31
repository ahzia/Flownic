# Step Conditions: Design Options and Recommended Implementation

Generated: Oct 2025  
**Status**: ✅ IMPLEMENTED

## Goals
- Add per-step conditions to control whether a step runs.
- Minimize changes across the codebase; no large refactors.
- Keep backward compatibility with existing workflows and UI patterns.
- Ensure conditions can reference data points (context, KB, prior task outputs).

## Where to integrate (current codebase)
- Runtime execution is centralized in `extension/src/background/serviceWorker.ts` — function `executeWorkflow()` iterates steps and already resolves inputs using `resolveDataPointReferences(...)`.
- Step type is already typed with `condition?: string` in `extension/src/common/types.ts` (available for use).
- UI (`PlaygroundApp.tsx`) already surfaces a text field per step (we can add a simple optional text input for condition without complex builders).

This means we can add condition evaluation in ONE place: before executing each step in `executeWorkflow()`.

## Option A (Recommended): Expression string with token interpolation
- **Condition format**: a string expression that evaluates to boolean, with access to resolved values via interpolation and a small set of helpers.
- Example expressions:
  - `"${selected_text.text}".length > 0`
  - `"${step_translate_output.confidence}" >= 0.8`
  - `"${page_content.text}".includes("Software Engineer")`

### How it works
1. Before a step runs, build a lightweight evaluation context:
   - Provide helper functions: `len(s)`, `includes(haystack, needle)`, `eq(a,b)`, `gt(a,b)`, `lt(a,b)`, `regex(h, r)`.
   - Provide a function `val(idOrToken)` to fetch a data point quickly (optional; tokens already cover it).
2. Resolve tokens in the condition string using the existing `interpolateTextWithDataPoints(text, dataPoints)` so `${...}` references become concrete values.
3. Safely evaluate the resulting condition string:
   - Disallow arbitrary JS. Use a tiny expression evaluator (own parser of a subset or a safe-eval wrapper that only exposes the helpers). Keep it minimal: comparisons, logical AND/OR, string ops.
   - If expression is empty or invalid → default to true (skip failure), but log a warning.
4. Only if the condition evaluates to true, execute the step. Otherwise, skip and push a result entry `{ stepId, skipped: true, reason: 'condition_false' }`.

### Pros
- Minimal surface area: mainly changes in `serviceWorker.ts`.
- Reuses existing token interpolation, no new JSON schema needed.
- Backward compatible (steps with no `condition` behave as before).

### Cons
- Strings can be error-prone for complex logic. Mitigate with helpers and examples.

## Option B: JSON rule object (rule builder)
- **Condition format**: structured JSON, e.g. `{ "all": [ {"gt": [ {"var": "${score}" }, 0.8 ]}, {"includes": [ {"var": "${text}" }, "engineer" ]} ] }`.
- Evaluate with a small rules engine (e.g., json-logic-like).

### Pros
- Safer and more explicit; easier to build UI later.

### Cons
- Heavier to implement now; requires new schema, more code, and UI changes.

## Option C: Condition as a dedicated task/handler
- Insert a special `condition_check` task that outputs a boolean, and use it to gate a following step.

### Pros
- No evaluator needed.

### Cons
- Adds extra steps per condition; clutters workflows; less ergonomic.

## Recommended Plan (Option A)
### Execution flow (service worker)
- In `executeWorkflow()` right before resolving input:
  1) If `step.condition` exists:
     - Compute `const cond = evaluateCondition(step.condition, dataPoints)`.
     - If `cond === false`, push a skipped result and `continue`.
  2) Proceed with existing resolution and execution.

### Pseudocode
```ts
for (const step of workflow.steps || []) {
  try {
    if (step.condition) {
      const shouldRun = evaluateCondition(step.condition, dataPoints)
      if (!shouldRun) {
        results.push({ stepId: step.id, type: step.type, result: { success: true }, skipped: true, reason: 'condition_false' })
        continue
      }
    }
    const resolvedInput = resolveDataPointReferences(step.input, dataPoints)
    // existing task/handler execution...
  } catch (e) { /* existing error handling */ }
}
```

### `evaluateCondition` design
- Steps:
  - `textWithValues = interpolateTextWithDataPoints(condition, dataPoints)`
  - Evaluate `textWithValues` with a tiny expression evaluator that supports:
    - Literals: strings, numbers, booleans
    - Operators: `&&`, `||`, `!`, `==`, `!=`, `>`, `>=`, `<`, `<=`
    - Helper functions: `len(s)`, `includes(haystack, needle)`, `regex(h, pattern)`
  - Return boolean; on error: warn and default to false or true based on a setting (default true to avoid breaking flows).

### Data accessible to conditions
- All `dataPoints` (context, KB entries, prior task outputs) via `${...}` tokens.
- Example: `${step_detect_output.languageCode} == "de" && len("${selected_text.text}") > 0`

## UI changes (minimal)
- In `PlaygroundApp.tsx` step editor, add an optional text input labeled “Condition (optional)” mapped to `step.condition`.
- Tooltip with examples and available helpers.
- No blocking validation; save as-is.

## Telemetry & UX
- Log when a step is skipped due to condition.
- Show skipped steps in any execution results viewer with reason.

## Testing plan
- Unit tests for `evaluateCondition()` covering:
  - String/number/boolean comparisons
  - Includes/regex and length checks
  - Token resolution for context, KB, task outputs
  - Error handling behavior
- E2E: import a workflow with conditional step; verify skip/execute paths.

## Future extensions
- Add a simple JSON-rule mode (Option B) once we want a no-code rule builder.
- Add a Condition Library with snippets (common checks).
- Add per-step `onFalse` actions (e.g., notify, jump-to-step) later.

## Impact summary
- **Files touched** (minimal):
  - ✅ `extension/src/background/serviceWorker.ts`: Added condition check and delay execution before each step.
  - ✅ `extension/src/ui/components/StepsEditor.tsx`: Added condition input field with hints and examples.
  - ✅ `extension/src/core/utils/ConditionEvaluator.ts`: Created shared utility for safe expression evaluation.
- **No registry changes**; no changes to tasks/handlers APIs.
- **Backward compatible**; existing workflows unaffected.

## Implementation Details

### ConditionEvaluator.ts
- Implements safe boolean expression evaluation
- Supports: comparisons (==, !=, >, >=, <, <=), logical operators (&&, ||, !), string operations (.length, .includes(), .startsWith(), .endsWith())
- Handles token interpolation via existing `interpolateTextWithDataPoints()` utility
- Defaults to `false` on error (safer - prevents unintended execution)
- Handles empty/whitespace conditions as `true` (always execute)

### serviceWorker.ts Changes
- Condition evaluation happens before step execution
- Steps with false conditions are skipped and logged
- Delay execution also implemented (was in design but not enforced)
- Skipped steps are recorded in results with `skipped: true` flag

### UI Changes
- Added condition input field in StepsEditor component
- Includes helpful placeholder and hint text with examples
- Shows supported operators and functions

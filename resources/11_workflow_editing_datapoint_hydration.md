# Workflow Editing: Data Point Hydration, Safety, and UX

Generated: Oct 2025

## Summary
When importing/editing workflows, some step inputs reference data points (e.g., task outputs) that don’t yet exist in the editor session. This leads to confusing UI (empty selectors) and potential risk when re-saving. We recently added an “Unresolved” display to preserve the reference, but we should proactively hydrate missing data points and clearly show selected fields.

## Current Behavior
- Data point references are stored as:
  ```json
  { "type": "data_point", "dataPointId": "step_123_output", "field": "translatedText" }
  ```
- On edit/import, the editor’s dataPoints are populated with context providers only; task output points may be missing.
- UI now shows an "Unresolved" chip if a referenced dataPointId isn’t found (prevents accidental loss), but it’s not ideal UX.
- Trigger shortcut now hydrates correctly from workflow JSON.

## Risks If We Save Immediately
- With the current change, saving preserves the original DataPointReference object (good). However, the UX is ambiguous and users could modify/delete by mistake.

## Proposed Improvements
### 1) Hydrate Missing Data Points On Edit
- On `editWorkflow(workflow)`:
  - Scan all steps; collect every referenced dataPointId and field.
  - For context providers (`selected_text`, `page_content`, `extracted_text`) ensure a minimal placeholder data point is present.
  - For task outputs: synthesize deterministic display-only data points using step metadata:
    - id: `${step.id}_output`
    - name: `${taskName} Output`
    - type: `task_output`
    - value: use `TaskRegistry.getTask(step.taskId).generateMockOutput()` (same mechanism we already use on task add) to build a realistic shape for field dropdowns.
  - This mirrors our task output simulation and makes field pickers accurate.

Benefits:
- Resolves UI immediately; field dropdown can enumerate actual fields.
- Keeps references stable and avoids accidental data loss.

### 2) Always Show Selected Field For a Data Point
- In the selector area, show:
  - Data point name (or Unresolved + raw id)
  - The selected field value (e.g., `field: translatedText` or `field: (Original JSON)`).
- We can add a small line under the selector like: “Field: translatedText” for clarity.

### 3) Debounce/Guard Saving
- If there are unresolved data point references (ids that do not match any dataPoints after hydration attempt), show a non-blocking warning and let users proceed or fix.
- Optionally block save only if references are clearly broken (e.g., missing dataPointId entirely).

### 4) Deterministic Task Output IDs
- Continue using `${step.id}_output` as the canonical id for runtime and for editor hydration. Avoid timestamp postfixes in editor-only data points.

## Naming Convention for Inline References
### Proposal
- Allow template placeholders in free-text fields using the syntax: `{$<dataPointId>[.<field>]}`
  - Examples:
    - `{$selected_text.text}`
    - `{$page_content.title}`
    - `{$step_translate_output.translatedText}`
    - `{$step_summarize_output.__raw__}` for full JSON

### Resolution
- At runtime (and optional preview), parse text fields and replace tokens by calling the same `resolveDataPointReferences` mechanics for each token.
- Add a small parser that:
  - Finds tokens with `/\{\$([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g`
  - Builds temporary DataPointReference objects and resolves them against current dataPoints.

### Complexity & Value
- Complexity: Moderate. The parser is small; reuse of existing resolver keeps it safe.
- Value: High. Greatly improves authoring flexibility; users can reference dynamic data directly in prompts and other text areas.
- Safety: Token resolution happens only at execution/preview. Editor can optionally show a preview under the input.

## Best Practices (from ecosystem)
- Provide deterministic, human-readable IDs for dynamic outputs (we do via `${step.id}_output`).
- Hydrate editor with realistic mock shapes to enable safe editing and prevent hidden breakage.
- Separate storage-level references from display-level hydration: never rewrite logical references based on editor state.
- Make unresolved references explicit and explain how they resolve at runtime.
- Support lightweight templating for dynamic insertion; avoid complex DSLs.

## Implementation Plan
1. Edit Hydration
   - In `editWorkflow`:
     - Build a map of stepId → task template.
     - For each step with `type: 'task'`, synthesize a data point:
       - `id: ${step.id}_output`, `value: task.generateMockOutput()`
     - For context providers, ensure minimal placeholders exist if referenced.
     - Merge these with current `dataPoints` before rendering steps.

2. UI Enhancements
   - `DataPointSelector`: under the chip, show “Field: <value>” if any.
   - Keep the Unresolved state for unknown ids, but after hydration this should rarely occur.

3. Save Guardrails
   - On save, warn if any references are still unresolved (ids not present in dataPoints). Allow override.

4. Inline Token Support (Phase 2)
   - Create a small `interpolateTextWithDataPoints(text, dataPoints)` utility.
   - Use it in preview and at execution-time (service worker) where applicable.
   - Document the feature in the Playground help.

## Conclusion
Hydrating missing data points during edit, clearly showing selected fields, and optionally supporting inline data tokens will eliminate edit/import pitfalls, reduce user confusion, and improve reliability—while keeping architecture clean and future-proof.

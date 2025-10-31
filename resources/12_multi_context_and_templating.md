# Multi-Context Inputs and Lightweight Templating (Proposal)

Generated: Oct 2025

## Goals
- Allow adding multiple context sources to tasks (e.g., KB entry + extracted page text) without major refactors.
- Allow composing static text with dynamic data-point values (e.g., in modal body, prompts).
- Minimal surface-area changes; reuse existing data point system and UI patterns.

## Current Constraints
- Most inputs are a single `DataPointReference | string` via `data_point_selector`.
- Users want to provide more than one context and/or mix with static text.

## Proposal A: Data Point Lists (Low-risk extension)
### Summary
Introduce a new input field type `data_point_list` that captures an ordered list of `DataPointReference` values. Tasks that support multi-context can accept either a `string`, a `DataPointReference`, or a `DataPointReference[]` and internally concatenate/format.

### UI
- Add `type: 'data_point_list'` to `InputFieldConfig`.
- Render in `TaskInputUI` as:
  - Repeated `DataPointSelector` rows with Add/Remove buttons.
  - Optional order drag/drop (future).

### Task Input Handling
- For tasks like Prompt/Writer/Summarizer:
  - Accept `context?: string | DataPointReference | DataPointReference[]`.
  - Resolve to string as:
    1) If string → use directly
    2) If DataPointReference → use resolved value
    3) If array → resolve each and join with two newlines (or task-specific separator)

### Pros
- Minimal impact; largely additive.
- Reuses existing resolver and DataPointSelector.

### Cons
- Basic formatting (join). For richer control, see Proposal B.

## Proposal B: Lightweight Token Templating (Recommended)
### Summary
Enable tokens like `{$<dataPointId>[.<field>]}` inside any text input. At execution/preview time, interpolate tokens using the existing resolver so users can mix static text and dynamic values seamlessly.

### Examples
- Prompt context: `My info: {$kb_123.text}\n\nJob: {$selected_text.text}`
- Modal body: `the translated text is : {$step_translate_selection_output.translatedText}`

### Implementation
- Utility: `interpolateTextWithDataPoints(text: string, dataPoints: DataPoint[]): string`
  - Regex: `/\{\$([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g`
  - For each token, build a temporary `DataPointReference` and resolve with `resolveDataPointReferences` (already in service worker).
- Apply at:
  - Task execution (for Prompt/Writer/etc.) on fields that support free text.
  - Handlers like `show_modal` on the `content` field.
- UI (optional but nice): show a tiny preview under the input after interpolation when possible.

### Pros
- Powerful and flexible with little UI complexity.
- Zero additional schema changes needed.

### Cons
- Requires clear docs/help tooltip for token syntax.

## Minimal Changeset (that won’t break existing flows)
1) Add `data_point_list` to `InputFieldConfig` and support it in `TaskInputUI`.
   - Store as `DataPointReference[]` in the step input.
2) Update Prompt-like tasks to normalize `context` into a single string:
   - If array, resolve & join with `\n\n`.
3) Add `interpolateTextWithDataPoints` utility in a small module (e.g., `@ui/utils/interpolation.ts` or shared util) and reuse in:
   - PromptTask (prompt text)
   - ShowModal handler (content)
   - Any other task/handler with free-text inputs
4) Documentation: short help on token syntax in the editor (question-mark tooltip).

## Future Enhancements (optional)
- Rich templates: allow per-item prefixes (e.g., `Title: {$dp.title}`). Can be done with tokens already.
- Conditional tokens: out of scope for now.
- Preview mode toggle in editor: see interpolated value.

## Why This Matches Our Architecture
- DataPoints: we continue to use `DataPointReference` and runtime resolution.
- Registries & UI patterns: `TaskInputUI` is extended minimally; no rework of registries.
- Service worker resolver: reused for interpolation.
- Handlers: `show_modal` benefits immediately from token support.

## Suggested Rollout Order
1) Implement token templating utility + apply to ShowModal `content` (quick win).
2) Extend PromptTask to run interpolation on `prompt` and combine multiple contexts (if provided) using Proposal A.
3) Add `data_point_list` UI (optional if templating covers immediate needs).

## Conclusion
Start with lightweight token templating for immediate flexibility and minimal surface area, then add `data_point_list` for cases where users prefer structured multi-select over typing tokens. Both are low-risk, align with current patterns, and significantly improve UX.

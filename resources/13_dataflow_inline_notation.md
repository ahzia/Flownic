# Inline Dataflow Notation (${...}) – Feasibility & Design Notes

Generated: Oct 2025

## Idea (recap)
- In any free-text field, typing `${` opens a dataflow autocomplete (data points). Selecting one inserts `${dataPointId}`; typing `.` lists fields → `${dataPointId.field}` → close with `}`.
- One unified UI for text: mix literals and dataflow tokens anywhere.
- Standardize JSON so pure text stays a string; advanced cases can optionally be structured objects if needed.

## Fit with Current Architecture
- We already resolve data points at runtime in `serviceWorker.resolveDataPointReferences`.
- We proposed token templating in `12_multi_context_and_templating.md`. This `${dp.field}` format is a natural variant of the earlier `{$...}` tokens.
- Tasks/handlers with free-text inputs (Prompt, ShowModal, Writer, Rewriter) can run a lightweight interpolation step before execution, reusing the existing resolver.
- No need to change registries or the workflow execution graph.

## Suggested Minimal Implementation
1) Token syntax
   - Use `${dataPointId}` or `${dataPointId.field}`; support `${....__raw__}` for the whole object (stringified) when needed.
   - Regex: `/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g`.
2) Interpolation utility
   - `interpolateTextWithDataPoints(text: string, dataPoints: DataPoint[]): string`.
   - For each token, build a temporary `DataPointReference` and resolve via the same logic used in `resolveDataPointReferences`.
3) Apply sites
   - Task inputs: Prompt (`prompt`), Writer/Proofreader/Rewriter contexts where free text exists.
   - Handlers: `show_modal.content` (and later others with free text).
4) Editor UX
   - Autocomplete overlay in `UniversalInput` when `${` typed:
     - List available data points; after selecting, if structured, support `.` to list fields.
     - Keyboard navigation (Up/Down/Enter), click to insert.
   - Optional preview line under the input (live interpolation) for user confidence.

## JSON Representation Options
- Keep simple fields as strings (backwards compatible):
  ```json
  {
    "content": "The translated text is: ${step_translate_output.translatedText}"
  }
  ```
- For advanced cases (optional), allow a structured variant with a stable schema that captures a list of segments:
  ```json
  {
    "content": {
      "type": "template",
      "segments": [
        { "type": "text", "value": "The translated text is: " },
        { "type": "data_point", "dataPointId": "step_translate_output", "field": "translatedText" }
      ]
    }
  }
  ```
- Resolution: the executor accepts both; if object `type: template`, it builds the final string from segments; otherwise, it interpolates tokens in the string.
- Recommendation: start with strings + token interpolation (least disruptive). Add segment schema later only if needed (e.g., for i18n or strict validation).

## Impact on Current Code
- Tasks/Handlers: add a small pre-processing step (interpolation) in a handful of places.
- UI: add autocomplete to `UniversalInput` and/or a small helper overlay component; no changes to `DataPointSelector`-based flows needed (they continue to work).
- Execution: no change to the graph; all tokens get resolved at the same time we already resolve `data_point` objects.
- Storage: workflows remain backward compatible; older JSON with plain strings still valid.

## Complexity & Risks
- Low to moderate. Most of the work is in the editor input (autocomplete UX). Interpolation itself is small and reuses current resolver.
- Escaping: if end-users need literal `${`, we can support `\${` or `\` escaping. Start simple, document it.
- Performance: token scan is linear; negligible for typical lengths.

## UX Benefits
- One consistent input experience for all text fields.
- Users can mix and match multiple data sources + static text without jumping between fields.
- Reduces need for additional specialized UI per field.

## Compatibility with Current Templates & Handlers
- CustomPromptTask: interpolate `prompt` and optionally `context` before API call.
- ShowModal: interpolate `content` before render.
- Translator/Detector: typically rely on selectors for inputs; no change required.
- No breaking changes expected.

## Recommendations
- Phase 1 (quick win):
  - Implement interpolation utility and apply it in `show_modal.content` and `custom_prompt.prompt`.
  - Add a minimal autocomplete (list data points after `${`).
- Phase 2:
  - Enhance autocomplete to support field selection after `.`.
  - Optional: add `data_point_list` for multi-context builder UI (if users want pickers instead of typing).
- Phase 3 (optional):
  - Add structured `template` segments schema for stricter validation or i18n scenarios.

## Conclusion
Adopting `${...}` inline notation provides a powerful, low-friction way to use multiple data sources and static text anywhere, with minimal changes and excellent UX alignment with the current architecture. Start with interpolation + lightweight autocomplete; expand only if needed.

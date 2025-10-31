# Data Flow Notation Standardization Plan

**Date:** 2025-01-15  
**Status:** Proposal  
**Priority:** High

---

## Executive Summary

Currently, workflows use two different patterns for referencing data points:
1. **Token notation** (string): `"${selected_text.text}"` - Used in conditions and prompt text
2. **Object notation**: `{ type: 'data_point', dataPointId: 'selected_text', field: 'text' }` - Used in step inputs when using UI selector

This dual format creates inconsistency, complexity, and maintenance overhead. This document proposes standardizing on token notation (`${...}`) for all data point references while maintaining a seamless UI experience.

---

## Current State Analysis

### Current Usage Patterns

#### Pattern 1: Token Notation (String)
**Where used:**
- Step conditions: `"${selected_text.text}" != ""`
- Prompt text: `"Extract key info from: ${selected_text.text}"`
- Any text field with token interpolation

**Example:**
```json
{
  "condition": "\"${selected_text.text}\" != \"\"",
  "input": {
    "prompt": "Summarize: ${selected_text.text}"
  }
}
```

#### Pattern 2: Object Notation
**Where used:**
- Step inputs when using DataPointSelector UI component
- Fields with `type: 'data_point_selector'` in task/handler templates
- Language selector in data point mode

**Example:**
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

### Current Resolution Flow

**File:** `extension/src/core/utils/DataPointResolver.ts`

The resolver currently handles both formats:
1. **String format**: Calls `interpolateTextWithDataPoints()` 
2. **Object format**: Directly accesses `dataPoint.value[field]`

```typescript
export function resolveDataPointReferences(input: any, dataPoints: DataPoint[]): any {
  // Handle strings - interpolate tokens if present
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
  // Handle old format: { type: 'data_point', dataPointId: '...', field: '...' }
  if (input.type === 'data_point') {
    // Direct resolution logic...
  }
  
  // Recursively resolve nested objects...
}
```

### Current UI Components

1. **UniversalInput** (`extension/src/ui/components/UniversalInput.tsx`)
   - Has "Manual" and "Data Point" tabs
   - Manual tab: text/textarea with optional TokenAutocomplete
   - Data Point tab: DataPointSelector component
   - **Problem**: Stores different formats based on which tab is used

2. **TaskInputUI** (`extension/src/ui/components/TaskInputUI.tsx`)
   - Uses UniversalInput for text/textarea fields
   - Uses DataPointSelector directly for `data_point_selector` type fields
   - **Problem**: `data_point_selector` fields always store object format

3. **DataPointSelector** (`extension/src/ui/components/DataPointSelector.tsx`)
   - Visual selector for choosing data point and field
   - Always returns `{ type: 'data_point', dataPointId, field }`
   - **Problem**: Doesn't integrate with token notation

---

## Proposed Solution

### Goal

**Standardize on token notation (`${...}`) for ALL data point references in JSON**, while maintaining a user-friendly UI that supports both selection methods.

### Key Requirements

1. ✅ **JSON Storage**: Always store as token string (e.g., `"${selected_text.text}"`)
2. ✅ **UI Flexibility**: Keep Manual/Data Point tabs for user convenience
3. ✅ **Two-way Sync**: 
   - Selecting datapoint → Shows `${...}` in manual tab
   - Typing `${...}` → Shows selected datapoint/field in datapoint tab
4. ✅ **Backward Compatibility**: Migrate existing workflows gracefully
5. ✅ **Functionality Preservation**: All existing features work the same

---

## Implementation Plan

### Phase 1: Core Resolution Changes

#### 1.1 Simplify DataPointResolver
**File:** `extension/src/core/utils/DataPointResolver.ts`

**Changes:**
- Remove object format handling
- Only handle token string interpolation
- Simplify logic significantly

**Before:**
```typescript
export function resolveDataPointReferences(input: any, dataPoints: DataPoint[]): any {
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
  if (input.type === 'data_point') {
    // Complex object resolution logic...
  }
  
  // Recursive handling...
}
```

**After:**
```typescript
export function resolveDataPointReferences(input: any, dataPoints: DataPoint[]): any {
  // Handle strings - interpolate tokens
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
  // Handle primitives
  if (input === null || typeof input !== 'object') {
    return input
  }
  
  // Recursively resolve nested objects/arrays
  if (Array.isArray(input)) {
    return input.map(item => resolveDataPointReferences(item, dataPoints))
  }
  
  const resolved: any = {}
  for (const [key, value] of Object.entries(input)) {
    resolved[key] = resolveDataPointReferences(value, dataPoints)
  }
  
  return resolved
}
```

**Impact:** ✅ Low risk - TokenInterpolation already handles all cases

---

#### 1.2 Update Type Definitions
**File:** `extension/src/common/types.ts`

**Changes:**
- Update `StepInput` to only allow strings (or keep flexible for numbers/booleans)
- Mark `DataPointReference` as deprecated (keep for migration)

**Current:**
```typescript
export interface StepInput {
  [key: string]: DataPointReference | string | number | boolean
}

export interface DataPointReference {
  type: 'data_point'
  dataPointId: string
  field?: string
}
```

**Proposed:**
```typescript
export interface StepInput {
  [key: string]: string | number | boolean  // Only primitives, strings contain tokens
}

// @deprecated - Use token notation instead: "${dataPointId.field}"
export interface DataPointReference {
  type: 'data_point'
  dataPointId: string
  field?: string
}
```

**Impact:** ⚠️ Medium risk - Need to update all UI components that use DataPointReference

---

### Phase 2: UI Component Updates

#### 2.1 Create Token Utilities
**New File:** `extension/src/utils/tokenUtils.ts`

**Purpose:** Helper functions for converting between token strings and data point references

```typescript
/**
 * Extracts data point ID and field from token string
 * @example "${selected_text.text}" => { dataPointId: "selected_text", field: "text" }
 */
export function parseToken(token: string): { dataPointId: string; field?: string } | null {
  const match = token.match(/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/)
  if (!match) return null
  
  const [, dataPointId, field] = match
  return { dataPointId, field }
}

/**
 * Converts data point reference to token string
 * @example { dataPointId: "selected_text", field: "text" } => "${selected_text.text}"
 */
export function createToken(dataPointId: string, field?: string): string {
  if (field) {
    return `\${${dataPointId}.${field}}`
  }
  return `\${${dataPointId}}`
}

/**
 * Checks if a string is a pure token (no other text)
 * @example "${selected_text.text}" => true
 * @example "Text: ${selected_text.text}" => false
 */
export function isPureToken(value: string): boolean {
  const trimmed = value.trim()
  const tokenMatch = trimmed.match(/^\$\{[^}]+\}$/)
  return !!tokenMatch
}
```

**Impact:** ✅ Low risk - Pure utility functions, well-tested

---

#### 2.2 Update UniversalInput Component
**File:** `extension/src/ui/components/UniversalInput.tsx`

**Changes:**
- Always store as token string in JSON
- Add two-way conversion between tabs
- Detect token in manual input and sync to data point tab

**Key Logic:**

```typescript
// When switching tabs or value changes
const syncValueToTabs = (newValue: string) => {
  // Store as token string
  onChange(newValue)
  
  // If pure token, sync to data point tab
  if (isPureToken(newValue)) {
    const parsed = parseToken(newValue)
    if (parsed) {
      // Set selected data point in UI state (for display only)
      setSelectedDataPointId(parsed.dataPointId)
      setSelectedField(parsed.field)
    }
  }
}

// When data point selected
const handleDataPointSelect = (dataPointId: string, field?: string) => {
  const token = createToken(dataPointId, field)
  onChange(token)  // Store as token string
  
  // Switch to manual tab to show token
  setIsDataPointMode(false)
}
```

**Impact:** ⚠️ Medium risk - Need careful state management, testing edge cases

---

#### 2.3 Update TaskInputUI Component
**File:** `extension/src/ui/components/TaskInputUI.tsx`

**Changes:**
- Remove `data_point_selector` field type special handling
- Convert all `data_point_selector` fields to use `UniversalInput` with token support
- Update field type definitions in task/handler templates

**Before:**
```typescript
{field.type === 'data_point_selector' && (
  <DataPointSelector
    onSelect={(dataPointId, fieldName) => {
      const dataPointRef: DataPointReference = {
        type: 'data_point',
        dataPointId,
        field: fieldName
      }
      handleFieldChange(field.name, dataPointRef)
    }}
  />
)}
```

**After:**
```typescript
{field.type === 'data_point_selector' && (
  <UniversalInput
    value={input[field.name] || ''}
    onChange={(value) => handleFieldChange(field.name, value)}
    type="text"
    dataPoints={dataPoints}
    enableTokenAutocomplete={true}
  />
)}
```

**Impact:** ⚠️ Medium risk - Need to update all task/handler templates that use `data_point_selector`

---

#### 2.4 Update StepsEditor Component
**File:** `extension/src/ui/components/StepsEditor.tsx`

**Changes:**
- Condition input already uses token notation ✅
- Ensure step input editing works with token strings
- Verify TokenAutocomplete works correctly

**Impact:** ✅ Low risk - Condition field already uses tokens

---

### Phase 3: Workflow Migration

#### 3.1 Create Migration Utility
**New File:** `extension/src/utils/workflowMigration.ts`

**Purpose:** Convert existing workflows from object notation to token notation

```typescript
/**
 * Migrates workflow from object notation to token notation
 */
export function migrateWorkflowToTokenNotation(workflow: any): any {
  const migrated = { ...workflow }
  
  if (migrated.steps) {
    migrated.steps = migrated.steps.map((step: any) => {
      if (step.input) {
        step.input = migrateInputToTokenNotation(step.input)
      }
      return step
    })
  }
  
  return migrated
}

function migrateInputToTokenNotation(input: any): any {
  if (typeof input === 'object' && input !== null) {
    // Check if it's a data point reference
    if (input.type === 'data_point') {
      return createToken(input.dataPointId, input.field)
    }
    
    // Recursively migrate nested objects
    const migrated: any = {}
    for (const [key, value] of Object.entries(input)) {
      migrated[key] = migrateInputToTokenNotation(value)
    }
    return migrated
  }
  
  return input
}
```

**Impact:** ✅ Low risk - One-time migration, can be tested thoroughly

---

#### 3.2 Update Example Workflows
**Directory:** `example_prompts/`

**Files to update:**
- `translate_selected_text_replace.json`
- Any other workflows using object notation

**Before:**
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

**After:**
```json
{
  "input": {
    "text": "${selected_text.text}"
  }
}
```

**Impact:** ✅ Low risk - Simple find/replace, easy to verify

---

#### 3.3 Migration on Load
**File:** `extension/src/ui/PlaygroundApp.tsx`

**Changes:**
- Detect old format workflows on load
- Auto-migrate to new format
- Save migrated version back

**Implementation:**
```typescript
useEffect(() => {
  const loadWorkflows = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
    if (response.success) {
      const workflows = (response.data || []).map((w: any) => {
        // Check if migration needed
        if (needsMigration(w)) {
          const migrated = migrateWorkflowToTokenNotation(w)
          // Save migrated version
          chrome.runtime.sendMessage({
            type: 'SAVE_WORKFLOW',
            data: { workflow: migrated }
          })
          return migrated
        }
        return w
      })
      setWorkflows(workflows)
    }
  }
  loadWorkflows()
}, [])

function needsMigration(workflow: any): boolean {
  // Check if any step input uses object notation
  return workflow.steps?.some((step: any) => 
    containsDataPointReference(step.input)
  )
}
```

**Impact:** ⚠️ Medium risk - Need to ensure migration is idempotent, test edge cases

---

### Phase 4: Cleanup and Documentation

#### 4.1 Remove Deprecated Code
- Remove `isDataPointReference()` from WorkflowExecutor
- Remove object format handling from DataPointResolver (already done in Phase 1)
- Remove `normalizeDataPointReferences()` from PlaygroundApp (no longer needed)

**Impact:** ✅ Low risk - Code removal, improves maintainability

---

#### 4.2 Update Documentation
- Update README with token notation examples
- Update architecture docs
- Add migration guide for developers

**Impact:** ✅ Low risk - Documentation only

---

## Risk Assessment

### High Risk Areas

1. **UI State Synchronization** (UniversalInput)
   - Risk: Complex state management between tabs could cause bugs
   - Mitigation: 
     - Thorough testing of all tab switching scenarios
     - Clear state management with useEffect hooks
     - User testing before release

2. **Workflow Migration**
   - Risk: Existing workflows might break during migration
   - Mitigation:
     - Create backup before migration
     - Test migration on all example workflows
     - Provide rollback mechanism
     - Test with real user workflows

3. **Task/Handler Template Updates**
   - Risk: Need to update all templates that use `data_point_selector`
   - Mitigation:
     - List all affected templates first
     - Update systematically
     - Test each template after update

### Medium Risk Areas

1. **Token Parsing Edge Cases**
   - Risk: Complex tokens or nested references might not parse correctly
   - Mitigation:
     - Comprehensive test suite for token parsing
     - Handle edge cases explicitly
     - Good error messages

2. **Backward Compatibility**
   - Risk: Existing workflows using object notation might not work
   - Mitigation:
     - Auto-migration on load
     - Support both formats temporarily during transition
     - Clear migration path

### Low Risk Areas

1. **DataPointResolver Simplification**
   - Low risk - TokenInterpolation already handles all cases

2. **Type Definition Updates**
   - Low risk - TypeScript will catch errors

3. **Example Workflow Updates**
   - Low risk - Simple find/replace operations

---

## Benefits

### 1. Consistency
- ✅ Single format for all data point references
- ✅ Easier to understand and maintain
- ✅ Consistent JSON structure

### 2. Simplicity
- ✅ Simpler resolution logic
- ✅ Less code to maintain
- ✅ Fewer edge cases

### 3. Flexibility
- ✅ Users can type tokens manually or use UI selector
- ✅ Easy to combine tokens with text
- ✅ Supports complex expressions

### 4. Extensibility
- ✅ Easy to add new token features
- ✅ Better support for nested references
- ✅ Cleaner foundation for future enhancements

---

## Implementation Timeline

### Phase 1: Core Changes (2-3 days)
- [ ] Simplify DataPointResolver
- [ ] Create token utilities
- [ ] Update type definitions
- [ ] Write tests

### Phase 2: UI Updates (3-4 days)
- [ ] Update UniversalInput with two-way sync
- [ ] Update TaskInputUI
- [ ] Update StepsEditor if needed
- [ ] Test all UI interactions

### Phase 3: Migration (2-3 days)
- [ ] Create migration utility
- [ ] Update example workflows
- [ ] Implement auto-migration on load
- [ ] Test migration thoroughly

### Phase 4: Cleanup (1-2 days)
- [ ] Remove deprecated code
- [ ] Update documentation
- [ ] Final testing

**Total Estimated Time:** 8-12 days

---

## Testing Strategy

### Unit Tests
1. Token parsing utilities
2. Token creation utilities
3. Migration utility
4. DataPointResolver with token-only format

### Integration Tests
1. UI component tab switching
2. Token autocomplete
3. Data point selection → token conversion
4. Token typing → data point selection

### End-to-End Tests
1. Create new workflow with token notation
2. Edit existing workflow (migrated)
3. Execute workflow with tokens
4. Import/export workflows

### Regression Tests
1. All existing example workflows
2. All task templates
3. All handler templates
4. Condition evaluation
5. Prompt interpolation

---

## Migration Path

### For Existing Workflows

1. **Automatic Migration (Recommended)**
   - On workflow load, detect old format
   - Auto-convert to token notation
   - Save converted version
   - User sees no difference in UI

2. **Manual Migration (Fallback)**
   - Provide migration script
   - Allow users to manually trigger migration
   - Provide clear instructions

3. **Dual Support (Transition Period)**
   - Support both formats during transition
   - Gradually deprecate object format
   - Force migration after transition period

---

## Files Requiring Changes

### Core Files
- `extension/src/core/utils/DataPointResolver.ts` - Simplify to token-only
- `extension/src/common/types.ts` - Update StepInput type
- `extension/src/core/WorkflowExecutor.ts` - Remove isDataPointReference

### UI Components
- `extension/src/ui/components/UniversalInput.tsx` - Add two-way sync
- `extension/src/ui/components/TaskInputUI.tsx` - Update data_point_selector handling
- `extension/src/ui/components/StepsEditor.tsx` - Verify token support
- `extension/src/ui/components/DataPointSelector.tsx` - May need updates for token generation

### Utilities (New)
- `extension/src/utils/tokenUtils.ts` - Token parsing/creation utilities
- `extension/src/utils/workflowMigration.ts` - Migration utility

### Application Logic
- `extension/src/ui/PlaygroundApp.tsx` - Remove normalization, add migration
- `extension/src/background/serviceWorker.ts` - Verify execution still works

### Example Files
- `example_prompts/translate_selected_text_replace.json` - Migrate to tokens
- Other example workflows using object notation

### Task/Handler Templates
- All templates with `type: 'data_point_selector'` fields need updating
- Search for: `data_point_selector` in task/handler template files

---

## Success Criteria

1. ✅ All workflows use token notation only
2. ✅ UI supports both manual typing and data point selection
3. ✅ Two-way sync works between tabs
4. ✅ All existing workflows migrated successfully
5. ✅ No breaking changes for users
6. ✅ All tests pass
7. ✅ Documentation updated

---

## Alternative Approaches Considered

### Alternative 1: Keep Object Notation, Add Token Support
- **Pros:** Less migration needed
- **Cons:** Still have dual format, more complexity
- **Decision:** ❌ Rejected - doesn't solve the core problem

### Alternative 2: Only Token Notation, Remove UI Selector
- **Pros:** Simplest implementation
- **Cons:** Poor user experience, harder for non-technical users
- **Decision:** ❌ Rejected - UX is important

### Alternative 3: Hybrid Approach (Current + Proposed)
- **Pros:** Backward compatible
- **Cons:** Still have dual format, more code to maintain
- **Decision:** ❌ Rejected - want to simplify, not add complexity

---

## Open Questions

1. **Migration Timing**: Should we migrate immediately or support both formats during transition?
   - **Recommendation:** Support both during transition (2-3 weeks), then force migration

2. **Error Handling**: What happens if user types invalid token syntax?
   - **Recommendation:** Show inline error, don't prevent saving (user might fix later)

3. **Token Validation**: Should we validate tokens at save time or execution time?
   - **Recommendation:** Warn at save time, validate at execution time

4. **Backward Compatibility**: How long should we support old format?
   - **Recommendation:** 1-2 versions, then remove support

---

## Conclusion

Standardizing on token notation (`${...}`) for all data point references will significantly improve code maintainability, consistency, and user experience. The implementation is straightforward with manageable risks, especially with thorough testing and a phased approach.

**Recommendation:** ✅ Proceed with implementation

---

## Appendix A: Token Notation Examples

### Simple Reference
```json
{
  "text": "${selected_text.text}"
}
```

### Reference Without Field
```json
{
  "data": "${some_data_point}"
}
```

### Multiple Tokens in Text
```json
{
  "prompt": "Translate from ${source_lang.code} to ${target_lang.code}: ${selected_text.text}"
}
```

### Nested Object
```json
{
  "input": {
    "text": "${selected_text.text}",
    "language": "${detected_lang.code}",
    "options": {
      "case": "preserve",
      "format": "${format_option.value}"
    }
  }
}
```

---

## Appendix B: Migration Examples

### Before (Object Notation)
```json
{
  "input": {
    "text": {
      "type": "data_point",
      "dataPointId": "selected_text",
      "field": "text"
    },
    "sourceLanguage": {
      "type": "data_point",
      "dataPointId": "step_detect_language_output",
      "field": "languageCode"
    },
    "targetLanguage": "de"
  }
}
```

### After (Token Notation)
```json
{
  "input": {
    "text": "${selected_text.text}",
    "sourceLanguage": "${step_detect_language_output.languageCode}",
    "targetLanguage": "de"
  }
}
```

---

## Appendix C: UI Flow Diagram

```
User Action                    Storage Format          UI Display
─────────────────────────────────────────────────────────────────────
Type "${..." in Manual Tab →   "${selected_text.text}" →  Manual Tab (shows token)
                                                        Data Point Tab (auto-syncs, shows selected)

Select Data Point →            "${selected_text.text}" →  Switches to Manual Tab (shows token)
                                                        Data Point Tab (shows selected)

Switch Tabs                    "${selected_text.text}" →  Consistent across tabs
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Author:** AI Assistant  
**Status:** Ready for Review



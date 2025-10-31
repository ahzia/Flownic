# Legacy & Unused Files Analysis

## Summary

After analyzing the codebase, here are the files that appear to be **unused or legacy**:

## ❌ Completely Unused Files

### 1. `WorkflowExecutor.ts` (Core)
**Location:** `extension/src/core/WorkflowExecutor.ts`

**Status:** ❌ **NOT USED** - No imports found anywhere

**Why it exists:**
- Appears to be an older/alternative workflow execution implementation
- Uses OOP pattern with DataPointManager
- Only handles old `DataPointReference` format (not token interpolation)

**Dependencies (also unused):**
- Uses `DataPointManager` (only used here and by ContextManager, which is also unused)

### 2. `ContextManager.ts` (Context)
**Location:** `extension/src/context/ContextManager.ts`

**Status:** ❌ **NOT USED** - Only exported, never imported

**Why it exists:**
- Wrapper around `DataPointManager` for context gathering
- Uses provider pattern

**Note:** The actual context gathering is done by `ContextGatherer.ts` in content script, which IS used.

### 3. `TokenInterpolation.ts` (Utility)
**Location:** `extension/src/core/utils/TokenInterpolation.ts`

**Status:** ⚠️ **NOT USED** - Logic duplicated in serviceWorker.ts

**Why it exists:**
- Created as a utility module for token interpolation
- The interpolation logic was inlined into `serviceWorker.ts` instead (because service workers can't easily import ES modules)

**Current state:**
- Function `interpolateTextWithDataPoints()` exists here but is duplicated in `serviceWorker.ts`
- Functions `hasTokens()` and `extractTokenReferences()` are unused

**Recommendation:** 
- Could be removed OR
- Refactored to be shared if we move away from inline implementation

## ✅ Used Files (for reference)

### `ContextProviderRegistry.ts`
**Status:** ✅ **USED** - Used in `PlaygroundApp.tsx`

**Purpose:** Provides metadata about context providers for the UI

**Usage:**
```typescript
// PlaygroundApp.tsx line 60-62
const registry = new ContextProviderRegistry()
const metas = registry.getAllMeta()
setProviderMetas(metas)
```

### `DataPointManager.ts`
**Status:** ⚠️ **PARTIALLY USED** - Only used by unused classes

**Used by:**
- `WorkflowExecutor.ts` (unused)
- `ContextManager.ts` (unused)

**Not used by active code:**
- `serviceWorker.ts` uses inline data point arrays
- `ContentScriptMain.ts` uses `ContextGatherer` directly

### Context Providers (`providers/*.ts`)
**Status:** ⚠️ **PARTIALLY USED**

**Used:**
- `ContextProviderRegistry` uses them for metadata (which is used in UI)

**Not used directly:**
- Actual context gathering uses `ContextGatherer` which has its own implementation
- Providers follow `ContextProvider` interface but aren't executed

## Active vs Legacy Architecture

### Active System ✅
```
serviceWorker.ts (background)
    ↓
ContextGatherer.ts (content script) - Simple implementation
    ↓
TaskExecutor.ts / HandlerExecutor.ts
```

### Legacy System ❌ (Not Used)
```
WorkflowExecutor.ts
    ↓
DataPointManager.ts
    ↓
ContextManager.ts
    ↓
ContextProvider classes (PageContentProvider, etc.)
```

## Recommendations

### Option 1: Clean Removal
If you want to clean up:
1. **Delete:** `WorkflowExecutor.ts`
2. **Delete:** `ContextManager.ts`
3. **Keep but document:** `TokenInterpolation.ts` (or delete if you prefer inlined version)
4. **Keep:** `ContextProviderRegistry.ts` (used in UI)
5. **Keep but reconsider:** `DataPointManager.ts` (not actively used, but could be useful in future)

### Option 2: Mark as Legacy
Add comments to unused files:
```typescript
/**
 * @deprecated Legacy implementation - not currently used
 * Active workflow execution is in serviceWorker.ts
 */
```

### Option 3: Refactor to Use Legacy System
If you prefer the OOP architecture:
- Migrate `serviceWorker.ts` execution logic to use `WorkflowExecutor`
- Would require refactoring to support token interpolation
- More complex but better separation of concerns

## Files Summary Table

| File | Status | Used By | Recommendation |
|------|--------|---------|----------------|
| `WorkflowExecutor.ts` | ❌ Unused | None | Delete or mark deprecated |
| `ContextManager.ts` | ❌ Unused | None | Delete or mark deprecated |
| `TokenInterpolation.ts` | ⚠️ Duplicated | None (logic in serviceWorker) | Delete or refactor to share |
| `DataPointManager.ts` | ⚠️ Indirectly unused | Only unused classes | Keep for future OR delete |
| `ContextProviderRegistry.ts` | ✅ Used | PlaygroundApp.tsx | Keep |
| Context Provider classes | ⚠️ Meta only | ContextProviderRegistry | Keep (used for metadata) |

## Conclusion

**Main unused legacy files:**
1. `WorkflowExecutor.ts` - Alternative execution system
2. `ContextManager.ts` - Unused wrapper
3. `TokenInterpolation.ts` - Duplicated logic (but could be useful as shared utility)

The active system uses a simpler, functional approach in `serviceWorker.ts` with inline data point management, while the legacy system uses a more OOP approach with managers and registries.


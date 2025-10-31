# Duplicate Code Analysis

## Overview
This document identifies duplicate code patterns found after the recent refactoring, focusing on storage access, KB operations, and utility functions.

---

## 1. 🔴 Storage Access Duplication (HIGH PRIORITY)

### Problem
Multiple files directly use `chrome.storage.local` with duplicate Promise wrapper patterns, despite having a `StorageManager` utility that provides this abstraction.

### Duplicated Code Locations

#### 1.1 KB Storage Access (3 locations)

**Location 1:** `extension/src/utils/kb.ts`
```typescript
export async function getKBEntries(): Promise<KBEntry[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([KB_KEY], (result) => {
      resolve((result[KB_KEY] as KBEntry[]) || [])
    })
  })
}

export async function saveKBEntry(entry: KBEntry): Promise<void> {
  const entries = await getKBEntries()
  // ... manipulation ...
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KB_KEY]: entries }, () => resolve())
  })
}
```

**Location 2:** `extension/src/core/utils/KBLoader.ts`
```typescript
export async function loadKBDataPoints(): Promise<DataPoint[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['kbEntries'], (result) => {
      const kbEntries = (result.kbEntries || []) as KBEntry[]
      // ... conversion logic ...
      resolve(dataPoints)
    })
  })
}
```

**Location 3:** `extension/src/background/serviceWorker.ts`
```typescript
// Uses KBLoader, but serviceWorker also has other direct storage calls
async function getStoredWorkflows(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['workflows'], (result) => {
      resolve(result.workflows || [])
    })
  })
}
```

### Solution
1. **Use StorageManager** for all storage operations:
   - `utils/kb.ts` should use `storage.get('kbEntries')` and `storage.set('kbEntries', ...)`
   - `core/utils/KBLoader.ts` should call `getKBEntries()` from `utils/kb.ts` instead of duplicating storage access
   - `serviceWorker.ts` should use `storage.get('workflows')` instead of direct chrome.storage calls

2. **Refactor KBLoader to reuse KB utilities:**
   ```typescript
   // KBLoader.ts should import and use getKBEntries
   import { getKBEntries } from '@utils/kb'
   
   export async function loadKBDataPoints(): Promise<DataPoint[]> {
     const kbEntries = await getKBEntries() // Reuse existing function
     return kbEntries.map(entry => ({ doublicate... }))
   }
   ```

---

## 2. 🟡 KB Entry Loading Duplication (MEDIUM PRIORITY)

### Problem
`KBLoader.loadKBDataPoints()` duplicates the KB entry loading logic instead of reusing `utils/kb.getKBEntries()`.

### Current State

**File 1:** `extension/src/utils/kb.ts`
- `getKBEntries()` - Returns `KBEntry[]`
- Used by: `PlaygroundApp.tsx`, `KnowledgeBasePanel.tsx`

**File 2:** `extension/src/core/utils/KBLoader.ts`
- `loadKBDataPoints()` - Returns `DataPoint[]`
- Internally duplicates storage access with key `'kbEntries'`
- Used by: `serviceWorker.ts`

### Impact
- Storage key is duplicated (`'kbEntries'` vs `KB_KEY = 'kbEntries'`)
- If storage key changes, must update multiple places
- Logic for loading KB entries exists in two places

### Solution
**Refactor KBLoader to reuse getKBEntries:**
```typescript
// extension/src/core/utils/KBLoader.ts
import { getKBEntries } from '@utils/kb'
import { DataPoint, KBEntry } from '@common/types'

export async function loadKBDataPoints(): Promise<DataPoint[]> {
  const kbEntries = await getKBEntries() // Reuse existing function
  
  return kbEntries.map(entry => ({
    id: `kb_${entry.id}`,
    name: `KB: ${entry.name}`,
    type: 'context' as const,
    value: {
      text: entry.content,
      title: entry.name,
      source: 'kb'
    },
    source: 'kb',
    timestamp: entry.updatedAt || entry.createdAt || Date.now()
  }))
}
```

**Benefits:**
- Single source of truth for KB loading
- Easier to maintain (storage key changes in one place)
- Clear separation: `utils/kb.ts` handles storage, `core/utils/KBLoader.ts` handles conversion

---

## 3. 🟡 Workflow Storage Duplication (MEDIUM PRIORITY)

### Problem
`serviceWorker.ts` has direct `chrome.storage.local` calls for workflow operations instead of using `StorageManager`.

### Current State

**File:** `extension/src/background/serviceWorker.ts`
```typescript
async function getStoredWorkflows(): Promise<any[]> use
  return new Promise((resolve) => {
    chrome.storage.local.get(['workflows'], (result) => {
      resolve(result.workflows || [])
    })
  })
}

async function saveWorkflow(workflow: any): Promise<void> {
  // ... logic ...
  chrome.storage.local.set({ workflows }, () => {
    // ... error handling ...
  })
}
```

### Solution
**Use StorageManager:**
```typescript
import { storage } from '@utils/storage'

async function getStoredWorkflows(): Promise<any[]> {
  return (await storage.get('workflows')) || []
}

async function saveWorkflow(workflow: any): Promise<void> {
  const workflows = (await storage.get('workflows')) || []
  const existingIndex = workflows.findIndex((w: any) => w.id === workflow.id)
  if (existingIndex >= 0) {
    workflows[existingIndex] = workflow
  } else {
    workflows.push(workflow)
  }
  await storage.set('workflows', workflows)
}
```

**Benefits:**
- Consistent error handling (via StorageManager inferred)
- Easier to switch storage backend in future
- Cleaner code (no Promise wrappers)

---

## 4. 🟢 Promise Wrapper Pattern Duplication (LOW PRIORITY)

### Problem
Multiple files have similar Promise wrapper patterns for `chrome.storage.local` operations.

### Locations
- `extension/src/utils/kb.ts` (lines 5-10, 18-20, 26-28)
- `extension/src/core/utils/KBLoader.ts` (lines 8-27)
- `extension/src/background/serviceWorker.ts` (lines 8-51)

### Note
This is already addressed by `StorageManager`, so refactoring the above will eliminate this duplication.

---

## Summary of Recommendations

### Priority 1 (High Impact, Easy Fix)
1. ✅ Refactor `KBLoader.loadKBDataPoints()` to use `getKBEntries()` from `utils/kb.ts`
2. ✅ Update `utils/kb.ts` to use `StorageManager` instead of direct chrome.storage calls

### Priority 2 (Medium Impact, Easy Fix)
3. ✅ Update `serviceWorker.ts` workflow storage functions to use `StorageManager optimized`

### Priority 3 (Future Enhancement)
4. Consider creating a `WorkflowStorage` utility in `utils/` that wraps workflow CRUD operations (similar to how `kb.ts` wraps KB operations)
   - This would further reduce duplication in `serviceWorker.ts`
   - Makes workflow storage logic reusable

---

## Files That Need Changes

| File | Current Issue | Recommended Change | Status |
|------|--------------|-------------------|--------|
| `extension/src/utils/kb.ts` | Direct chrome.storage calls | Use `StorageManager` | ✅ **COMPLETED** |
| `extension/src/core/utils/KBLoader.ts` | Duplicates KB loading logic | Import and use `getKBEntries()` | ✅ **COMPLETED** |
| `extension/src/background/serviceWorker.ts` | Direct chrome.storage calls | Use `StorageManager` | ✅ **COMPLETED** |
| `extension/src/ui/theme.ts` | Direct chrome.storage calls | Use `StorageManager` | ✅ **COMPLETED** |

---

## ✅ Refactoring Complete

All duplicate code has been eliminated:

1. **✅ KB Storage (`utils/kb.ts`)** - Now uses `StorageManager`
2. **✅ KB Loader (`core/utils/KBLoader.ts`)** - Now reuses `getKBEntries()` from `utils/kb.ts`
3. **✅ Service Worker Storage** - Now uses `StorageManager` for workflow operations
4. **✅ Theme Storage (`ui/theme.ts`)** - Now uses `StorageManager`

### Results

- **Code Reduction:** ~45 lines of duplicated Promise wrappers removed
- **Maintainability:** Single source of truth for storage operations
- **Consistency:** All storage operations go through `StorageManager`
- **Build Status:** ✅ All changes compile successfully

---

## Testing Considerations

After refactoring:
1. ✅ Test KB entry creation, reading, deletion in UI
2. ✅ Test workflow loading and saving
3. ✅ Test KB data points loading in service worker
4. ✅ Verify no regressions in workflow execution


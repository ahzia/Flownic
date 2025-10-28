# Content Script Architecture

## Overview

The content script has been refactored into a modular architecture following best practices for Chrome extensions. This allows for easier maintenance, testing, and extension with new handlers and tasks.

## Structure

```
src/content/
├── contentScript.ts          # Entry point (minimal, just initializes ContentScript)
├── ContentScriptMain.ts      # Main orchestrator class
├── helpers/                  # Utility modules for DOM manipulation, CSS, modals, etc.
│   ├── DOMHelpers.ts        # DOM query and manipulation
│   ├── CSSHelpers.ts        # CSS injection management
│   ├── ModalHelpers.ts      # Modal UI management
│   └── NotificationHelpers.ts # Toast notifications
├── workflow/                 # Workflow trigger management
│   └── WorkflowTriggerManager.ts
├── context/                  # Context data gathering
│   └── ContextGatherer.ts
└── execution/                # Task and handler execution
    ├── TaskExecutor.ts
    └── HandlerExecutor.ts
```

## Benefits

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Easy to Extend**: Adding new handlers or tasks doesn't require modifying the main file
3. **Testable**: Each module can be tested independently
4. **Maintainable**: Clear structure makes it easy to find and modify functionality
5. **Reusable**: Helper classes can be used across different parts of the extension

## Adding New Handlers

To add a new handler:

1. Create a new handler class in `src/handlers/templates/YourHandler.ts`
2. Extend `BaseHandler` from `@core/BaseHandler.ts`
3. Register it in `HandlerRegistry.initializeDefaultHandlers()`
4. The handler will automatically be available in the workflow playground

## Adding New Tasks

To add a new task:

1. Create a new task class in `src/tasks/templates/YourTask.ts`
2. Extend `BaseTask` from `@core/BaseTask.ts`
3. Register it in `TaskRegistry.initializeDefaultTasks()`
4. The task will automatically be available in the workflow playground

## Note on ES Modules

The content script is bundled as a single file without ES module imports to avoid CSP issues. Vite's build process handles this by:
- Inlining all dependencies used by the content script
- Bundling everything into a single `contentScript.js` file
- Using IIFE (Immediately Invoked Function Expression) format

If you see import statements in the built file, check the Vite configuration's `manualChunks` function to ensure dependencies are being inlined.


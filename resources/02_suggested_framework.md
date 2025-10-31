
Use **React + Vite + TypeScript** for the **extension UI** (Quickbar/Playground/Settings). Use **vanilla JS** (small, dependency-free modules) for **content scripts** and small **handler modules** that run in the page/sandbox.
This mixes developer productivity and maintainability (React) with minimal runtime impact where it matters (content scripts / page injection).

---

# suggested folder mapping

Use React + Vite for UI:

```
/src
  /ui                 # React (overlay + playground)
    main.tsx          # mount overlay in extension popup or injected overlay container
    Quickbar.tsx
    Playground.tsx
    Modal.tsx
  /background         # service worker (no React)
    serviceWorker.ts
    aiAdapter.ts
  /content            # content scripts (vanilla JS or small TS)
    contentScript.ts  # helpers that manipulate DOM, snapshots, confirmations
    sandboxHost.js    # iframe/VM host code
  /handlers           # single-file handler modules (vanilla JS)
    insert_text.js
    modify_css.js
  /common             # AJV schemas, types
```

* Build React UI into `ui/dist` and point `action.default_popup` or dynamically inject overlay HTML.
* Keep content scripts as small pure JS bundles (no React) — bundle them separately in Vite.

---

# Practical tips for using React in an extension

1. **Only use React for extension UI (popup / injected overlay)**

   * Don’t use React to render UI that’s injected into third-party pages unless you isolate it in a Shadow DOM and keep bundle minimal.

2. **Shadow DOM for injected widgets**

   * For `INJECT_UI_COMPONENT` features, render the widget inside a Shadow root to avoid CSS/JS collisions.

3. **Separate builds**

   * Configure Vite to produce separate builds: `ui` bundle (React) and `content` bundle(s) for content scripts and sandbox. This keeps content script payload small.

4. **Avoid React in content scripts**

   * Content scripts should be minimal and focused on DOM query/modify and providing `helpers`. Use vanilla JS or small helpers.

5. **Service worker considerations**

   * React code should never be loaded into the background service worker. Keep service worker logic small and modular (no DOM).

6. **Hot reload during dev**

   * Vite HMR helps UI dev, but remember extension reloads may be needed for content scripts/service worker — use `web-ext` or a small dev helper to auto-reload extension when built assets change.

7. **Tree-shake & code-split**

   * Configure build to remove dev-only code, use production builds for size. Use dynamic imports for less critical UI parts.

8. **Bundle size limits**

   * Extensions have storage and performance constraints; keep the React bundle lean (no heavy UI libs unless needed). Consider Preact if size is a critical concern.

---

# Alternatives worth considering (brief)

* **Preact** — nearly identical API to React but much smaller. Good tradeoff if bundle size is critical.
* **Svelte** — smaller runtime and excellent performance; steeper learning curve but concise code.
* **Vanilla Web Components / Lit** — great for small injected UI components; smaller runtime but less ecosystem for complex UIs.

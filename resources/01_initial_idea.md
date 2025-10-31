# 1 — Elevator pitch (one line)

**PromptFlow** — an offline-first Chrome extension that turns reusable AI prompts into safe, one-click page actions (summaries, translations, form autofill, dark mode, table → CSV, UI widgets) — extensible via small handler modules you can share or generate with AI.

---

# 2 — Project goals & non-technical vision

* Provide lightning-fast, keyboard-first access to AI actions while browsing.
* Keep user data local and prioritize on-device model usage (Gemini Nano / Chrome built-in).
* Make powerful page automation safe and auditable by using validated JSON instructions + small sandboxed JS handlers.
* Let users create, share and (optionally) auto-generate handlers, but always show previews and require explicit consent for page changes.
* Provide “playground” to compose multi-step workflows (capture → transform → apply) reusable across sites.

User-facing names (suggested):

* Overlay / Quickbar — the keyboard-invoked UI (Ctrl/Cmd+Shift+K).
* Workflows — user-created sequences of prompts + handlers.
* Prompt Templates — saved prompts (built-in & user).
* Action Preview — what the AI plans to do (shows before applying).
* Handlers Library — bundled small JS modules that do the work (one file per action).
* Marketplace (later) — share/install handlers & workflows.
* History / Undo — log of applied actions with simple revert.

---

# 3 — High-level architecture (overview)

User UI layer (friendly names) -> Orchestrator -> Validator -> Handler Runner (sandbox) -> Page Agent (content script) -> Page DOM

Components (technical):

1. **Overlay UI / Playground (React + TS)**

   * Quickbar-overlay for run/preview. Playground for composing Workflows.
2. **Background Service Worker**

   * Orchestrates prompts, streams LLM responses, validates JSON, manages triggers, stores templates/handlers.
3. **Validator (AJV)**

   * Ensures LLM outputs match expected schema (ActionPlan) before anything runs.
4. **Handler Registry & Loader**

   * Maps each ActionPlan op (INSERT_TEXT, MODIFY_CSS, etc.) to a handler JS file (one file per op). Handlers are loaded from the bundle or IndexedDB.
5. **Sandboxed Handler Runner**

   * Runs handler modules in an iframe/VM with a small `helpers` API. No direct DOM access.
6. **Content Script (Page Agent)**

   * Mediates actual DOM operations (apply text, insert CSS), shows inline confirmations, and executes safe modifications.
7. **Storage (IndexedDB/dexie or idb)**

   * Stores templates, handlers, KB, captures, profile, history, user settings.
8. **Local modules**

   * PDF.js, Fuse.js, small TF-IDF helper, static analyzer (for handler safety checks).

Diagram (conceptual):
Overlay → Background → Prompt API (window.ai) → Validator → Handler Runner → Helpers → Content Script → Page DOM

---

# 4 — Core runtime contract: JSON DSL (ActionPlan)

* The LLM returns an **ActionPlan JSON** that describes the actions to take. This is the canonical, validated contract between prompt output and the runtime.
* Example ActionPlan:

```json
{
  "type":"ACTION_PLAN",
  "actions":[
    {"op":"SHOW_MODAL","params":{"title":"Summary","content":"..."}},
    {"op":"SAVE_CAPTURE","params":{"name":"job-2025","data":{...}}}
  ],
  "metadata":{"confidence":0.93}
}
```

* **Validator** (AJV) confirms `ActionPlan` shape and that each action’s `params` match the handler’s `inputSchema`.

---

# 5 — Action ops (built-in op set — one module per op)

Each op has a small JS handler file (e.g., `insert_text.js`, `modify_css.js`). These are the handlers your system will ship and allow users to install or generate.

**Core ops (high priority — ship these first)**

* `SHOW_MODAL` — display text or HTML in extension modal (preview-only).
* `COPY_TO_CLIPBOARD` — copy text to clipboard.
* `DOWNLOAD_FILE` — download CSV/TXT files.
* `INSERT_TEXT` — fill or replace text in an input or contentEditable.
* `FILL_FORM` — fill multiple fields via selectors + confidence.
* `MODIFY_CSS` — inject/toggle CSS for the site (dark mode).
* `PARSE_TABLE_TO_CSV` — parse on-page table into CSV.
* `CLICK_SELECTOR` — click a specific button/element (requires confirmation).
* `REMOVE_NODE` — remove elements (with undo snapshot).
* `INJECT_UI_COMPONENT` — build a small shadow-root widget on the page.
* `SAVE_CAPTURE` — store structured data for chaining.
* `WAIT_FOR_SELECTOR` — wait for element to appear (timed).
* `NOOP` — no change, return data.

**Advanced ops (opt-in)**

* `DECLARE_DNR_RULES` — dynamic blocking rules (ad-block style) — optional and high-permission.
* `EVAL_JS_SIGNED` — execute signed JS (marketplace vetted).

---

# 6 — Handler files: one JS file per op (detailed)

**Design decisions**

* Each op is implemented as one JS module (handler), exported from `handlers/` folder. Example: `handlers/insert_text.js`.
* Each handler exports:

  * `meta` (id, name, version, permissions, `inputSchema` for AJV),
  * `run(input, helpers)` async function,
  * optional `undo(lastRunState, helpers)`.

**Why this is great**

* Modularity, testability, sharability (marketplace), offline-ready, and plays well with AI-generated handler files.

**Handler example (insert_text skeleton)**

```js
export const meta = {
  id:"insert_text",
  name:"Insert Text",
  permissions:["writeDom"],
  inputSchema: { /* AJV schema */ }
};

export async function run(input, helpers) {
  // helpers.findNodeMeta(), helpers.saveSnapshot(), helpers.applyText()
}
export async function undo(lastRunState, helpers) { /* restore snapshot */ }
```

**Storage & distribution**

* Built-in handlers packaged in the extension.
* User-installed handlers stored in IndexedDB (with metadata).
* AI-generated handlers go through static analysis and user confirmation before install.

---

# 7 — Helpers API (what handlers can call)

Handlers must call only these `helpers` functions (host mediated):

* `helpers.findNodeMeta(selector)` → check existence & properties (no raw nodes).
* `helpers.saveSnapshot(selector)` → save pre-change content for undo.
* `helpers.applyText(selector, text, options)` → perform insertion via content script with InputEvents.
* `helpers.insertCSS(cssId, cssText)` / `helpers.removeCSS(cssId)` / `helpers.toggleCSS(cssId, cssText)`.
* `helpers.showModal({title, html})` / `helpers.closeModal(modalId)`.
* `helpers.downloadFile(filename, content, mimeType)`.
* `helpers.saveCapture(name, data)` → persist structured capture.
* `helpers.getKB(key)` → fetch local KB entries (e.g., CV).
* `helpers.confirmAction(prompt)` → UI confirmation dialog (returns boolean).
* `helpers.notify(message)` → small toast.

**Enforcement**: content script & background mediate these calls, show confirmations for destructive actions, and perform final validation.

---

# 8 — Workflow & Playground (user flows)

User-facing building blocks:

* **Workflow** = sequence of one or more prompts + assigned handler(s).
* **Prompt** = text sent to AI, with context toggles (selected text, page, KB, last capture).
* **Trigger** = when to run a workflow: manual, shortcut, on-page-load (per-site opt-in), on-selection, schedule.
* **Action Preview** = shows validated ActionPlan + handler that will run; user confirms per-action.

Example flows:

A) **Job apply flow** (demo-ready)

1. On job page, Quickbar → “Capture job” (Prompt) → ActionPlan returns `SAVE_CAPTURE` with job JSON. Confirm. Save as `lastCapture`.
2. Quickbar → “Tailor CV” → Prompt uses `lastCapture` + KB (CV), ActionPlan returns `SHOW_MODAL` + `SAVE_CAPTURE` (tailored bullets). Confirm.
3. Quickbar → “Apply to job” (on application page, focus on cover textbox) → ActionPlan returns `INSERT_TEXT` with `selector` for cover textarea. Confirm to insert. Save history snapshot.

B) **YouTube summarizer**

* On YouTube, trigger workflow (onPageLoad) → prompt extracts captions → ActionPlan `{ SHOW_MODAL, DOWNLOAD_FILE }` → `show_modal.js` handler displays summary; user can download timestamps.

C) **Form autofill**

* Quickbar → “Autofill” → AI returns `FILL_FORM` with selectors & confidence; overlay shows checkboxes per field; user selects and confirms; `fill_form.js` applies with snapshot & undo.

---

# 9 — Security, privacy & UX safeguards (must-haves)

Always implement the following — critical for hackathon & real users:

1. **Validation first**: LLM outputs must pass AJV validation before any handler runs.
2. **Preview & explicit user confirmation**: show ActionPlan + exact selectors and handler names; require per-run confirmation unless user enables trusted auto-run for specific workflow/site.
3. **Snapshot & Undo**: save pre-change snapshots, show simple “Undo” in History.
4. **Helpers-only**: handlers run in a sandbox and only use `helpers`; no direct DOM or network access.
5. **Host permissions on-demand**: request `activeTab` / host permissions at runtime. No broad host permissions at install.
6. **Static analysis for handlers**: for user/AI-generated handlers, run a linter & pattern scanner (no `eval`, no `fetch`/network unless explicitly allowed & signed).
7. **Local-first default**: use Chrome built-in Prompt API; fall back to cloud only if user enables it and provides keys (optional stretch).
8. **Audit**: log action runs locally, include handler id, inputs, time, snapshots. Provide “Clear my data” button.

---

# 10 — Implementation roadmap & prioritized milestones

Goal: demo-ready MVP that wins hackathon attention (focus on core features & judges’ criteria).

Phases (priority order):

**Phase 0 — Repo setup & infra**

* Init TypeScript + Vite + React + Manifest v3 skeleton. Add ESLint, Prettier, husky.
* Add idb/dexie, ajv, pdfjs-dist, fuse.js.

**Phase 1 — Core MVP (must-have for demo)**

* Implement overlay Quickbar (keyboard shortcut).
* Prompt templates CRUD & built-in prompts (Summarize, Translate, Capture Job, Tailor CV).
* Background `aiAdapter` using `window.ai` and streaming support.
* ActionPlan JSON Schema(s) + AJV validator.
* Build basic handler registry & implement core handlers: `show_modal.js`, `insert_text.js`, `modify_css.js`, `parse_table.js`, `fill_form.js`, `download_file.js`. Each as a single file module.
* Content Script helpers: `applyText`, `insertCSS`, `downloadFile`, `findNodeMeta`, `saveSnapshot` & inline confirmation.
* History & Undo UI.

**Phase 2 — Chaining, KB & Playground**

* Implement `save_capture`, KB manager (CV/profile), KB search (Fuse).
* Implement Workflow Playground (drag/drop nodes optional) — compose prompts -> handlers.
* Add suggestions (micro-prompts) engine for contextual prompt suggestions.

**Phase 3 — Safety & Advanced**

* Sandbox runner for handlers (iframe/SES), static analyzer for generated handlers.
* Implement handler installer & local handler generator flow (AI-generate handler + safety checks + install).
* Add per-site trusted-run toggles & rate limits.

**Phase 4 — Polish & Marketplace (stretch)**

* Create marketplace server & signing pipeline for vetted handlers.
* Add optional Google Docs API integration (OAuth) for reliable doc edits (stretch).

---

# 11 — Developer checklist (detailed tasks & code pointers)

**Code modules to implement**

* `/src/ui/overlay.tsx` — Quickbar component, search, context toggles, Action Preview.
* `/src/ui/playground.tsx` — Workflow builder + handler installer.
* `/src/background/serviceWorker.ts` — prompt runner, validator, handler loader.
* `/src/background/aiAdapter.ts` — wrapper for `window.ai.createTextSession()` and streaming.
* `/src/background/handlerRegistry.ts` — op → handler mapping & loader.
* `/src/content/contentScript.ts` — helpers functions + DOM ops + snapshots.
* `/src/content/sandboxHost.ts` — sandbox iframe hosting handler code + helpers bridge.
* `/src/storage/db.ts` — IndexedDB schemas: prompts, handlers, kb, captures, history.
* `/src/schemas/` — AJV schemas for ActionPlan, handlers meta, helper messages.
* `/src/utils/staticAnalyzer.js` — simple pattern checks for `eval` & suspicious API usage.

**Libraries**

* `ajv` (validation), `dexie` or `idb` (DB), `pdfjs-dist` (PDF), `fuse.js` (search), `eslint` (analysis), `esbuild` (bundling), `vitest/playwright` (tests).

**Testing**

* Unit tests for handlers (simulate helpers).
* E2E with Playwright on sample pages (form filling, contentEditable).
* Security fuzz tests for selector edge cases.

**Manifest permissions**

* Keep `host_permissions` empty in manifest. Use `chrome.permissions.request` for specific origins on-demand.
* Include `storage`, `scripting`, `activeTab`, `clipboardWrite` by default. Add `downloads` as optional request.

---

# 12 — UX copy suggestions & UI labels

Make the UI approachable:

* Quickbar title: **PromptFlow** or **Quick Actions**.
* Buttons & labels:

  * “Run” -> “Run AI Action”
  * “Preview” -> “See what it will do”
  * “Apply” -> “Apply to page”
  * “Create workflow” -> “Make a workflow”
  * “Handlers” -> “Action Library”
  * “Capture” -> “Save context”
  * “History” -> “Action Log”
  * “KB” -> “My Notes & Files”
  * “Generate handler” -> “Create action with AI”

On warnings use plain language:

* “This will modify the current page. Are you sure?”
* “This AI-generated action looks suspicious. Run in test mode first.”

---

# 13 — Demo script (2–3 minutes) — hackathon-ready

1. **Opening (10s)** — “Hi, this is PromptFlow — offline-first AI actions for your browser.” Put the extension icon + quickbar.
2. **Quick use case: Job apply (60s)**

   * Show job page → press shortcut → “Capture job” → show saved capture.
   * Press “Tailor CV” → show streaming preview and modal with tailored bullets.
   * Switch to application page → focus cover letter → “Apply to job” → preview the insertion and Apply -> show inserted cover paragraph + undo.
3. **Extra: YouTube summarizer (30s)**

   * Open YouTube → show built-in workflow (onPageLoad) → show modal summary + download timestamps.
4. **Playground + handler example (30s)**

   * Open Playground → show “Create workflow” for YouTube summarizer, attach `show_modal` handler, enable for site.
   * Show “Generate handler” briefly (AI generated small handler), test-run in read-only mode.
5. **Closing (10s)** — emphasize offline-first/local model, safety & preview, marketplace potential, and repo link.

Record on a small screen for clarity.

---

# 14 — Hackathon write-up / Devpost tips

Include in submission:

* Short video (≤3 min) following the demo script above.
* Public GitHub repo (manifest, handlers, docs, sample prompts, README).
* README highlights:

  * Which Chrome built-in APIs you used (Prompt API, Summarizer/Translator if used).
  * How to install & test locally (unpacked extension mode).
  * Privacy statement: “Local model used where supported; nothing leaves device by default.”
  * Limitations & safety measures (validation, preview, undo).
* Judging touchpoints: call out **Functionality, UX, Technical Execution, Novelty**; show chaining workflows and offline model use.

---

# 15 — Known limitations & mitigation

* **Complex editors (Google Docs, Notion)** — modifying these reliably requires official APIs (Google Docs API). Mitigation: use modal + copy-to-clipboard fallback, or add OAuth Docs API integration as stretch.
* **Model availability** — Gemini Nano availability varies by Chrome version & OS; show a clear “Model unavailable — enable cloud fallback?” UI with user consent.
* **Large KB & embeddings** — on-device semantic search is heavy; implement lightweight keyword search initially. Optionally add small embeddings later.
* **Handler security** — AI-generated handlers must be carefully controlled (static checks, test-run, user consent). Marketplace signing recommended before granting extra privileges.

---

# 16 — References & further reading (for your README)

* Chrome built-in AI Prompt API docs (search “Chrome Prompt API” / “window.ai.createTextSession”).
* Tampermonkey basics (for `@match` / `run-at` metadata ideas).
* Ajv JSON Schema docs (validator).
* Dexie / idb docs (IndexedDB wrappers).
* PDF.js (file parsing).
* Fuse.js (fuzzy search).

(When preparing your Devpost, paste canonical links to each of the official docs.)

---

# 17 — Sample files / code snippets to seed the repo (copy/paste ready)

A. `manifest.json` essentials (skeleton)

```json
{
  "manifest_version": 3,
  "name": "PromptFlow",
  "version": "0.1.0",
  "description": "Offline-first AI prompt workflows for Chrome",
  "action":{"default_popup":"ui/index.html"},
  "permissions":["storage","scripting","activeTab","clipboardWrite","contextMenus"],
  "background":{"service_worker":"background/serviceWorker.js"},
  "content_scripts":[
    {"matches":["<all_urls>"],"js":["content/contentScript.js"],"run_at":"document_idle"}
  ]
}
```

B. Minimal `ActionPlan` AJV schema (conceptual)

```json
{
  "type":"object",
  "required":["type","actions"],
  "properties":{
    "type":{"const":"ACTION_PLAN"},
    "actions":{
      "type":"array",
      "items":{
        "type":"object",
        "required":["op","params"],
        "properties":{
          "op":{"type":"string"},
          "params":{"type":"object"}
        }
      }
    },
    "metadata":{"type":"object"}
  }
}
```

C. Handler skeleton (insert_text.js) — provided earlier in this doc (use as starting point).

---

# 18 — Next recommended actions for you (short)

1. Create repo & skeleton (manifest, service worker, content script, UI shell).
2. Implement built-in handlers: `show_modal`, `insert_text`, `modify_css`, `parse_table`, `download_file`, `fill_form`. Test them manually on a few sites.
3. Implement Prompt API wrapper + simple Summarize prompt + ActionPlan schema + validation.
4. Wire Quickbar overlay to run a sample workflow (job capture → tailor CV → apply).
5. Record a crisp 2–3 minute demo showing the chain.



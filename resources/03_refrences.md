
# Quick summary (1 sentence)

Build an **offline-first** Chrome extension (PromptFlow) that uses Chrome’s built-in AI (Gemini Nano) to generate **validated ActionPlan JSON**, then executes those plans using **small handler files** (one JS file per op), with preview, audit, undo, and an optional marketplace for shared handlers — combining the best of Opale’s prompt-templating, Google’s Opal mini-apps, and Tampermonkey’s extensibility while keeping safety and offline-first privacy.

---

# 1 — Hackathon: Google Chrome Built-in AI Challenge 2025 (what matters)

* This is a Devpost-hosted challenge to build apps or Chrome extensions that **use Chrome’s built-in AI APIs** (e.g., Gemini Nano via the Prompt API). The rules require use of those APIs to interact with the on-device model. ([Google Chrome Built-in AI Challenge 2025][1])
* Timeline & submission: the hackathon runs on Devpost (page & rules), and typical submissions include a video, repo link, and description — check deadlines and prize categories on the event page. (Example entry/deadline details are on the event Devpost pages.) ([Google Chrome Built-in AI Challenge 2025][2])

**Why this matters for PromptFlow**

* You should prioritize using Chrome’s built-in Prompt API (window.ai / Gemini Nano) for the demo so your app meets the hackathon’s primary requirement. Streaming responses and on-device usage are advantages to highlight in the submission. ([Google Chrome Built-in AI Challenge][3])

---

# 2 — Opale — what it is and why it inspired you

* **Opale (Devpost entry)**: a browser-integrated AI search bar that lets users create custom prompts, run them on any web page, and reuse them across sites — handy for writing, translating, templating and other quick tasks. It’s essentially a prompt manager that appears as a lightweight overlay/search bar on web pages. ([Devpost - The home for hackathons][4])

**How Opale compares to PromptFlow**

* *Same*: both are page-integrated prompt UIs that let users run templates on page content.
* *Different / Limitations of Opale*: Opale focuses on prompt saving and running; it does not (as far as the Devpost description shows) include a validated structured DSL + sandboxed, auditable handlers, nor an offline-first on-device model focus.
* *Useful to borrow*: Opale’s simple overlay UX, quick prompt creation and reuse, template categories, and keyboard-first access are great UX patterns to replicate.

---

# 3 — Google Opal (Opal experiments / mini-apps) — what it is

* **Opal (Google Labs)** is Google’s experimental product for composing and sharing “AI mini-apps” (multi-step, natural language driven apps). It’s a UI to compose multi-step prompts and share them. The announcement and demo pages describe building mini-apps from natural language (Opal by Google). ([opal.withgoogle.com][5])

**What to take from Google Opal**

* *Mini-apps idea*: allow users to chain small tasks (capture → transform → apply) visually. That concept maps well to your “Workflow Playground.”
* *Shareability & templates*: Opal highlights discoverability and sharing of small apps — a marketplace for handlers/workflows is a natural extension of this idea.

---

# 4 — Tampermonkey (userscript ecosystem) — what it is

* **Tampermonkey** is the most popular userscript manager; users install small JS userscripts (per site or global) to modify pages, automate clicks, hide elements, inject UI, etc. It’s widely used and demonstrates how powerful a small script-per-site model can be. ([tampermonkey.net][6])

**What Tampermonkey teaches us**

* *One script per user task works well:* your “one JS file per handler” idea mirrors Tampermonkey’s per-script model — it’s intuitive for users and works well for a marketplace.
* *Permissions and safety tradeoffs:* Tampermonkey runs scripts with broad privileges (dangerous). PromptFlow should not blindly copy that: require sandboxing, helper APIs, and explicit consent (we’ll mediate DOM changes, unlike raw userscripts). ([tampermonkey.net][7])

---

# 5 — Other similar Chrome AI extensions (what they do & contrasts)

I looked at several popular AI extensions to pick practical patterns and pitfalls:

* **Merlin** — provides one-click AI actions (summarize, rewrite) across sites via keyboard shortcuts and quick prompts. Good: keyboard-first flow and broad model integration. Caution: most of these extensions use remote LLMs or API keys; offline on-device is the competitive differentiator for PromptFlow. ([Chrome Web Store][8])

* **Compose AI** — inline writing assistant / autocomplete; directly integrates with text inputs to propose edits and autocompletions. Good: seamless insertion UX for typing and inline suggestions — borrow the “copy/insert with undo” UX. ([Chrome Web Store][9])

* **AIPRM** — community prompt library/marketplace (mainly for ChatGPT). Good: prompt curation, tags, and sharing — useful model for PromptFlow’s prompt marketplace. ([AIPRM][10])

**Key differences**

* Many popular Chrome AI extensions rely on remote LLMs and cloud APIs; PromptFlow’s hackathon edge is **on-device Gemini Nano** and strong privacy (offline fallback) (if Chrome supports it). ([Google Chrome Built-in AI Challenge][3])

---

# 6 — What we should borrow from each and why (practical list)

From **Opale (overlay/prompt manager)**:

* Lightweight overlay UI, easy prompt creation, keyboard shortcut activation, saved prompts library, per-site templates. ([Devpost - The home for hackathons][4])

From **Google Opal (mini-apps)**:

* Workflow composition (chain prompts into multi-step flows), sharing templates / mini-apps, visual editing of prompt outputs. Useful for your Workflow Playground. ([opal.withgoogle.com][5])

From **Tampermonkey (script-per-task model)**:

* One-file handler model (one JS file per op), userscript packaging and distribution mechanics, simple metadata for scripts. But *don’t* copy its permissive execution model — enforce sandboxing & helpers. ([tampermonkey.net][6])

From **Merlin / Compose AI / AIPRM**:

* Keyboard-first access, inline insertion UX, curated prompt marketplace patterns, and prompt templates UI. Good models for discoverability, keyboard UX, and prompt tagging. ([Chrome Web Store][8])

---

# 7 — Differences between them and PromptFlow (concise)

* **Opale / Merlin / Compose AI**: primarily *prompt UI + cloud* or external model driven; not focused on structured ActionPlan + handler safety + offline-first. PromptFlow’s unique combo is:

  1. **ActionPlan JSON** validated with AJV (structured, auditable),
  2. **one-file handler modules** (one JS per op), sandboxed and run via a helpers API, and
  3. **offline-first** (use built-in Chrome AI when available). ([Devpost - The home for hackathons][4])

* **Tampermonkey**: provides free-form userscripts with full page access. PromptFlow keeps the modularity of Tampermonkey but introduces **host mediation**, previews, and undo to reduce risk. ([tampermonkey.net][6])

---

# 8 — What we can reuse/implement fast (priority list)

1. **Overlay / Quickbar UX** (copy Opale/Merlin patterns): keyboard shortcut, search bar, prompt suggestions, stream results. (Easy) ([Devpost - The home for hackathons][4])
2. **Prompt Templates + Categories** (borrow AIPRM idea): built-in templates (summarize, translate, autofill) and user templates. (Easy) ([AIPRM][10])
3. **One-file handler modules** (inspired by Tampermonkey packaging): ship core handlers (`insert_text`, `modify_css`, `download_csv`, `show_modal`) as separate JS files. (Easy → Medium) ([tampermonkey.net][6])
4. **Workflow Playground** (Opal mini-apps concept): chain prompts into workflows with triggers (onPageLoad, onSelection, manual). (Medium) ([opal.withgoogle.com][5])
5. **Safety UI: Action Preview & Undo** (novel): always show structured ActionPlan preview (selectors, file outputs) and require confirmation for destructive ops; snapshot state to enable undo. (Medium) — unique value-add.
6. **KB & Captures**: enable local CV/profile and saved captures for reuse in prompts (medium) — helps job workflow demo.
7. **AI-generated handlers flow**: allow generating a handler file with AI, but require static analysis and read-only sandbox testing before install. (Hard, but doable.)

---

# 9 — Practical technical & legal considerations to note (do not ignore)

* **Model availability & fallback**: not every Chrome build may expose Gemini Nano or the Prompt API; provide clear UI to show “on-device model available” or a fallback cloud option (with user opt-in). For hackathon, demo on a device/Chrome build that supports it. ([Google Chrome Built-in AI Challenge][3])

* **Site terms & copyright**: avoid adding features that encourage bypassing paywalls or downloading copyrighted content (video downloaders are legally risky). When in doubt, provide safe fallbacks (copy URL or prompt user to request content from publisher). (Legal caution)

* **Permissions UX**: request host permissions at runtime for a site, not broad at install. Explain clearly what will be read/written. This increases trust and meets extension store expectations. (Security best practice)

* **Privacy promise**: clearly state “offline-first; nothing leaves device by default.” If you offer cloud fallback, require explicit opt-in and document what is sent. This will be attractive in the hackathon & to judges.

---

# 10 — Concrete features to highlight in your hackathon submission (what wins)

* **On-device model usage** (Gemini Nano) and offline-first behavior — show latency & privacy benefits. ([Google Chrome Built-in AI Challenge][3])
* **Chained workflows** (capture → tailor → apply) — demo a job apply flow. (High impact)
* **ActionPlan validation + Preview & Undo** — show a bad ActionPlan being rejected or corrected (safety). (High impact)
* **One-file handlers & marketplace-ready packaging** — show a built-in handler and a locally imported handler. (Medium impact)
* **Workflow Playground UI** (create & test a YouTube summarizer or autofill workflow) — shows composition and reusability. (High impact)

---

# 11 — Suggested minimal demo (2–3 minutes) mapped to judges

1. Capture job description from a job page (Quickbar) → save capture.
2. Tailor CV using capture + local KB → SHOW_MODAL with tailored bullets (streaming preview).
3. Apply to job: open application form → Quickbar inserts tailored cover letter into focused textarea (show confirmation + undo).
4. Show Workflow Playground: open saved “YouTube Summarizer” that runs automatically on `youtube.com` and displays a modal with timestamps.
5. (Optional, advanced) Show AI generate a small handler (read-only sandbox test) and install locally.

**Why judges like it**: uses on-device model, shows clear UX & safety, solves a real pain (job applications), chains multiple steps.

---

# 12 — References (main sources used)

* Google Chrome Built-in AI Challenge (Devpost) — overview & rules. ([Google Chrome Built-in AI Challenge 2025][2])
* Opale — Devpost project page describing a browser-search bar prompt manager. ([Devpost - The home for hackathons][4])
* Google Opal (Opal.withgoogle.com + developer blog) — mini-apps and experiment page. ([opal.withgoogle.com][5])
* Tampermonkey — userscript manager official site and GitHub. ([tampermonkey.net][6])
* Merlin, Compose AI, AIPRM — representative Chrome AI prompt/assistant/marketplace extensions. ([Chrome Web Store][8])

---

# 13 — Final recommended action plan (next 7 days to a demo)

Day 1–2

* Initialize repo with React + Vite for UI, plus separate small JS build for content scripts & handlers. Add AJV and idb. (We discussed the skeleton earlier.)

Day 3–4

* Implement Quickbar overlay UI + Prompt Template CRUD.
* Implement background `aiAdapter` to call `window.ai` (mock if unavailable) and ActionPlan validator schema.

Day 5

* Implement core handlers (one file each): `show_modal.js`, `insert_text.js`, `modify_css.js`, `parse_table.js`, `download_file.js`. Wire handler registry and sandbox runner (iframe-based helper bridge).

Day 6

* Build the job workflow demo: capture job → tailor CV → apply. Add KB manager (upload/paste CV). Add Action Preview and Undo.

Day 7

* Polish demo video (2–3 minutes) and write Devpost description emphasizing on-device AI usage, safety (validation & undo), usability (workflow), and marketplace potential.

[1]: https://googlechromeai2025.devpost.com/rules?utm_source=chatgpt.com "Google Chrome Built-in AI Challenge 2025 Official Rules"
[2]: https://googlechromeai2025.devpost.com/?utm_source=chatgpt.com "Google Chrome Built-in AI Challenge 2025 - Devpost"
[3]: https://googlechromeai.devpost.com/?utm_source=chatgpt.com "Google Chrome Built-in AI Challenge: Develop a ... - Devpost"
[4]: https://devpost.com/software/opale?utm_source=chatgpt.com "Opale"
[5]: https://opal.withgoogle.com/?utm_source=chatgpt.com "Google Opal"
[6]: https://www.tampermonkey.net/?utm_source=chatgpt.com "Tampermonkey: Home"
[7]: https://www.tampermonkey.net/faq.php?locale=en&utm_source=chatgpt.com "FAQ"
[8]: https://chromewebstore.google.com/detail/merlin-ask-ai-to-research/camppjleccjaphfdbohjdohecfnoikec?hl=en&utm_source=chatgpt.com "Merlin - Ask AI to Research, Write & Review - Chrome Web Store"
[9]: https://chromewebstore.google.com/detail/compose-ai-ai-powered-wri/ddlbpiadoechcolndfeaonajmngmhblj?hl=en&utm_source=chatgpt.com "Compose AI: AI-powered Writing Tool - Chrome Web Store"
[10]: https://www.aiprm.com/products/aiprm-for-chatgpt/?utm_source=chatgpt.com "AIPRM for ChatGPT Start for free with 4500+ Prompts"

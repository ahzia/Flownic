# Flownic - AI Workflow Builder for Chrome

<div align="center">

**Transform any browser task into an automated AI workflow. Build custom AI workflows (like n8n) directly in Chrome, chaining Chrome's built-in AI APIs to automate any browser task—from job applications to content curation—100% offline, zero data leaves your device.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](package.json)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/ahzia/Flownic)

</div>

---

## 🎯 **Overview**

Flownic is a Chrome extension that democratizes access to Chrome's built-in AI capabilities through a visual workflow builder. Inspired by n8n, it allows anyone—regardless of technical background—to create powerful AI workflows that combine multiple Chrome AI APIs to automate repetitive browser tasks.

**Key Capabilities:**
- Combine 7 Chrome AI APIs in custom multi-step workflows
- Chain tasks with token-based data flow (`${step_id.field}`)
- Access context providers (selected text, extracted content, page data)
- Execute handlers (modals, text insertion, CSS modification, file downloads, etc.)
- Trigger workflows manually, on selection, on page load, or with keyboard shortcuts
- Store workflows locally with 100% privacy—all processing happens offline

---

## 🎬 Live Demo

<div align="center">

### Watch Flownic in Action

</div>

---

## ✨ **Features**

- 🎨 **Visual Workflow Builder**: Create complex multi-step AI workflows with an intuitive form-based UI
- 🔗 **AI Task Chaining**: Combine 7 Chrome AI APIs (Prompt, Translation, Summarization, Proofreading, Writing, Rewriting, Language Detection)
- 💾 **Token-Based Data Flow**: Pass data between steps using `${step_id.field}` tokens with autocomplete
- 📥 **Context Providers**: Access `selected_text`, `extracted_text`, `page_content`, and custom selectors
- 🎯 **8 Action Handlers**: Modals, text insertion, CSS modification, file downloads, table extraction, data saving
- ⚡ **Multiple Triggers**: Manual execution, keyboard shortcuts, on-selection, on-page-load
- 🌐 **Site-Specific Workflows**: Configure workflows for specific websites or patterns
- 🎨 **Beautiful UI**: Clean, modern interface with light/dark/auto themes and keyboard-first design (Ctrl+Shift+K)
- 📋 **6 Pre-built Workflows**: Get started immediately with example workflows
- 🔒 **100% Privacy**: All processing happens offline via Chrome's built-in Gemini Nano models—no data collection, no API keys

---

## 🤖 **Chrome AI APIs Integration**

Flownic integrates all 7 Chrome Built-in AI APIs:

| API | Task Name | Description | Use Cases |
|-----|-----------|-------------|-----------|
| **Prompt API** | `custom_prompt` | Generate dynamic prompts and structured outputs | Custom AI operations, complex reasoning |
| **Translator API** | `translation` | Translate text between 50+ languages | Multi-language content processing |
| **Language Detector API** | `language_detection` | Detect the language of text | Auto-detect content language |
| **Summarizer API** | `summarizer` | Distill complex information into summaries | Article summaries, document abstracts |
| **Proofreader API** | `proofreader` | Correct grammar and improve writing style | Content editing, quality assurance |
| **Writer API** | `writer` | Create original and engaging text | Content generation, creative writing |
| **Rewriter API** | `rewriter` | Rewrite text with different style or tone | Style adaptation, content variation |

### **Handler System**

8 action handlers execute the results of AI tasks:

| Handler | ID | Description |
|---------|-----|-------------|
| **Show Modal** | `show_modal` | Display content in a modal dialog |
| **Insert Text** | `insert_text` | Fill form fields or text areas with text |
| **Replace Selected Text** | `replace_selected_text` | Replace currently selected text on page |
| **Download File** | `download_file` | Download content as a file |
| **Modify CSS** | `modify_css` | Inject, remove, or toggle CSS styles |
| **Parse Table to CSV** | `parse_table_to_csv` | Extract table data and download as CSV |
| **Save Capture** | `save_capture` | Store structured data for later use |
| **Save to Knowledge Base** | `save_to_kb` | Save data to personal knowledge base |

---

## 🚀 **Installation**

### **Prerequisites**

- Google Chrome (latest version)
- Node.js 18+ and npm (for development)
- Chrome AI models downloaded (`chrome://settings/ai`)

### **Quick Setup**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ahzia/Flownic.git
   cd Flownic
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

### **Verify Chrome AI Models**

Before using Flownic, ensure Chrome's AI models are downloaded:

1. Go to `chrome://settings/ai`
2. Ensure AI models are downloaded and enabled
3. Wait for models to finish downloading if needed

---

## 🎮 **Quick Start**

1. **Open Playground**: Click Flownic icon or press `Ctrl+Shift+K` (Mac: `Cmd+Shift+K`)
2. **Create Workflow**: Click "Create Workflow", add steps using the workflow builder
3. **Run Workflow**: Use keyboard shortcut, click "Run", or trigger automatically

### **Quick Example: Auto-Translate**

1. Create workflow named "Auto-Translate" with "On Selection" trigger
2. Add translation task: `context: ${selected_text.text}`, `targetLanguage: en`
3. Add handler: `show_modal` with `content: ${step_1_output.translatedText}`
4. Save and test by selecting text on any webpage!

---

## 💡 **Usage Examples**

| Workflow | Trigger | Steps | Use Case |
|----------|---------|-------|----------|
| **Summarize Articles** | `Ctrl+Shift+S` | Extract → Summarize → Translate to German → Show modal | Understand foreign articles in your language |
| **Cover Letter Generator** | `Ctrl+Shift+A` | Extract job description → Generate with custom prompt → Show modal | Generate tailored cover letters instantly |
| **Smart Text Processor** | On Selection | Detect language → Translate if needed → Summarize → Proofread → Replace text | Auto-process and improve selected text |
| **Job Data Extraction** | Manual | Extract details → Structure with prompt → Save to knowledge base | Build database of job postings |

---

## 📁 **Project Structure**

```
Flownic/
├── src/
│   ├── background/          # Service worker & AI adapter
│   ├── content/             # Content scripts, context providers, executors
│   ├── core/                # BaseTask, BaseHandler, registries, executor
│   ├── tasks/               # 7 AI task implementations
│   ├── handlers/            # 8 handler implementations
│   ├── context/             # Context provider system
│   ├── ui/                  # React components (Playground, Quickbar)
│   ├── utils/               # Utilities
│   └── common/              # Shared types & schemas
├── example_workflows/       # Pre-built examples
└── dist/                    # Built extension
```

---

## 🛠️ **Development**

### **Quick Setup**

```bash
npm install          # Install dependencies
npm run dev          # Development mode with watch
npm run build        # Production build
npm run type-check   # Type checking
npm run lint         # Linting
```

### **Tech Stack**

TypeScript (95%+) • React 18.2 • Vite • Chrome Manifest V3 • Dexie • Fuse.js • Lucide React

---

## 🔒 **Security & Privacy**

- ✅ **100% Local Processing**: All AI operations use Chrome's built-in Gemini Nano models—no data leaves your device
- ✅ **No Tracking/API Keys**: Zero tracking, no external services, completely self-contained
- ✅ **Offline Capable**: Works without internet (after model download)
- ✅ **CSP-Compliant**: All code follows Content Security Policy, no `eval` or dynamic execution
- ✅ **Sandboxed Execution**: Handlers execute in isolated context with input validation
- ✅ **Minimal Permissions**: Only requests storage, scripting, and activeTab

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following TypeScript best practices
4. Commit: `git commit -m 'Add amazing feature'`
5. Push and open a Pull Request

**Guidelines**: Maintain 95%+ TypeScript coverage, write CSP-compliant code, add JSDoc comments, test on multiple websites.

---

## 📝 **License**

MIT License - see LICENSE file for details

---

## 🎯 **Hackathon Submission**

Created for **Google Chrome Built-in AI Challenge 2025**:

- ✅ **Technical Innovation**: First extension integrating all 7 Chrome AI APIs with token-based data flow and modular architecture
- ✅ **Privacy Leadership**: 100% client-side processing, zero data collection, complete offline capability
- ✅ **Real-world Impact**: Solves job applications, content processing, and research automation—democratizes AI for non-technical users

---

## 👥 Contributors

<div align="center">

### Made with ❤️ by

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/ahzamir">
        <img src="https://github.com/ahzamir.png" width="100px;" alt="Ahmad Zamir Yousufi"/>
        <br />
        <sub><b>Ahmad Zamir Yousufi</b></sub>
      </a>
      <br />
      <a href="https://github.com/ahzamir">@ahzamir</a>
    </td>
    <td align="center">
      <a href="https://github.com/ahzia">
        <img src="https://github.com/ahzia.png" width="100px;" alt="Ahmad Zia Yousufi"/>
        <br />
        <sub><b>Ahmad Zia Yousufi</b></sub>
      </a>
      <br />
      <a href="https://github.com/ahzia">@ahzia</a>
    </td>
  </tr>
</table>

</div>

---

## 📞 **Support**

- **GitHub Repository**: [https://github.com/ahzia/Flownic](https://github.com/ahzia/Flownic)
- **Issues**: [GitHub Issues](https://github.com/ahzia/Flownic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ahzia/Flownic/discussions)

---

## 🙏 **Acknowledgments**

- Chrome team for the powerful built-in AI APIs
- n8n and similar workflow platforms for inspiration
- Open source community for excellent tools and libraries

---

**Built with ❤️ for the Google Chrome Built-in AI Challenge 2025**

---

*Transform your browser into an AI-powered automation platform. Start building workflows today!*
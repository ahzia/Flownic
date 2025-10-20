# PromptFlow - Chrome Extension

An offline-first Chrome extension that transforms natural language prompts into safe, executable page actions using Chrome's built-in AI APIs.

## Features

- **Offline-First AI**: Uses Chrome's built-in AI APIs (Prompt, Writer, Proofreader, Summarizer, Translator, Rewriter)
- **Safe Execution**: All AI outputs are validated with AJV schemas before execution
- **Modular Handlers**: One-file handler modules for different actions (insert text, modify CSS, download files, etc.)
- **Workflow Chaining**: Capture → Transform → Apply patterns for complex tasks
- **Privacy-First**: All processing happens locally, no data leaves your device
- **Preview & Undo**: Always preview actions before execution, with undo capability

## Quick Start

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Usage

1. **Open Quickbar**: Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on Mac)
2. **Select Template**: Choose from built-in templates or type your own prompt
3. **Preview Action**: Review the AI-generated action plan
4. **Execute**: Confirm to run the actions on the page

## Built-in Templates

- **Summarize**: Extract key points from selected text or page content
- **Translate**: Translate text to another language
- **Capture Job**: Extract job requirements and details
- **Tailor CV**: Customize CV content for specific jobs
- **Proofread**: Check grammar and improve writing
- **Rewrite**: Rewrite text with different style or tone

## Available Actions

- `SHOW_MODAL`: Display content in a modal dialog
- `INSERT_TEXT`: Fill form fields with text
- `MODIFY_CSS`: Inject, remove, or toggle CSS styles
- `PARSE_TABLE_TO_CSV`: Extract table data and download as CSV
- `DOWNLOAD_FILE`: Download content as a file
- `SAVE_CAPTURE`: Store structured data for later use
- `FILL_FORM`: Fill multiple form fields
- `CLICK_SELECTOR`: Click specific elements
- `REMOVE_NODE`: Remove elements from the page
- `INJECT_UI_COMPONENT`: Add custom UI components
- `WAIT_FOR_SELECTOR`: Wait for elements to appear
- `NOOP`: No operation, return data

## Development

### Project Structure

```
src/
├── ui/                 # React UI components
│   ├── Quickbar.tsx   # Main quickbar overlay
│   ├── index.tsx      # Extension popup
│   └── styles.css     # UI styles
├── background/         # Service worker
│   ├── serviceWorker.ts
│   └── aiAdapter.ts   # Chrome AI API wrapper
├── content/           # Content scripts
│   └── contentScript.ts
├── handlers/          # Action handler modules
│   ├── show_modal.js
│   ├── insert_text.js
│   ├── modify_css.js
│   └── ...
├── common/            # Shared types and schemas
│   ├── types.ts
│   └── schemas.ts
└── utils/             # Utility functions
```

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

### Testing

The extension includes built-in templates and handlers for testing:

1. **Job Application Workflow**:
   - Capture job posting → Extract requirements
   - Tailor CV using local knowledge base
   - Auto-fill application forms

2. **Content Processing**:
   - Summarize long articles
   - Translate text to different languages
   - Proofread and improve writing

3. **Data Extraction**:
   - Parse tables to CSV
   - Download processed content
   - Save structured captures

## Chrome AI API Integration

PromptFlow leverages Chrome's built-in AI APIs:

- **Prompt API**: Generate dynamic prompts and structured outputs
- **Writer API**: Create original and engaging text
- **Proofreader API**: Correct grammar and style
- **Summarizer API**: Distill complex information
- **Translator API**: Multilingual capabilities
- **Rewriter API**: Improve content with alternatives

## Security & Privacy

- **Local Processing**: All AI operations happen client-side
- **Validated Actions**: Every AI output is validated before execution
- **Preview Required**: Users must confirm all page modifications
- **Undo Capability**: All actions can be reverted
- **Minimal Permissions**: Only requests necessary permissions
- **No Data Collection**: No user data is sent to external servers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Hackathon Submission

This project was created for the Google Chrome Built-in AI Challenge 2025, demonstrating:

- **Technical Innovation**: First extension to integrate multiple Chrome AI APIs with validated action plans
- **Privacy Leadership**: 100% client-side processing with no data leaving the device
- **Safety Innovation**: Every action is previewed, validated, and reversible
- **Real-world Impact**: Solves actual problems like job applications and content processing
- **User Experience**: Intuitive keyboard-first interface with comprehensive error handling

## Support

For issues, questions, or contributions, please visit our GitHub repository or contact the development team.

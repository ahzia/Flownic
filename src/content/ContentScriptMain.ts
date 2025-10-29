import { DOMHelpers } from './helpers/DOMHelpers'
import { CSSHelpers } from './helpers/CSSHelpers'
import { ModalHelpers } from './helpers/ModalHelpers'
import { NotificationHelpers } from './helpers/NotificationHelpers'
import { WorkflowTriggerManager } from './workflow/WorkflowTriggerManager'
import { ContextGatherer } from './context/ContextGatherer'
import { TaskExecutor } from './execution/TaskExecutor'
import { HandlerExecutor } from './execution/HandlerExecutor'

/**
 * Main Content Script class that coordinates all functionality
 */
export class ContentScript {
  private snapshots: Map<string, unknown> = new Map()
  private domHelpers: DOMHelpers
  private cssHelpers: CSSHelpers
  private modalHelpers: ModalHelpers
  private notificationHelpers: NotificationHelpers
  private workflowTriggerManager: WorkflowTriggerManager
  private contextGatherer: ContextGatherer
  private taskExecutor: TaskExecutor
  private handlerExecutor: HandlerExecutor

  constructor() {
    // Initialize helper classes
    this.domHelpers = new DOMHelpers()
    this.cssHelpers = new CSSHelpers()
    this.modalHelpers = new ModalHelpers()
    this.notificationHelpers = new NotificationHelpers()
    this.workflowTriggerManager = new WorkflowTriggerManager()
    this.contextGatherer = new ContextGatherer()
    this.taskExecutor = new TaskExecutor()
    this.handlerExecutor = new HandlerExecutor(
      this.domHelpers,
      this.cssHelpers,
      this.modalHelpers,
      this.notificationHelpers,
      this.snapshots
    )

    this.setupMessageListener()
    this.setupWorkflowTriggers()
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true
    })
  }

  private setupWorkflowTriggers(): void {
    this.workflowTriggerManager.loadEnabledWorkflows()
    
    // Listen for page changes to re-setup triggers
    const observer = new MutationObserver(() => {
      this.workflowTriggerManager.loadEnabledWorkflows()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  private async handleMessage(
    message: any, 
    _sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const { type, data } = message

      switch (type) {
        case 'FIND_NODE_META':
          const nodeMeta = await DOMHelpers.findNodeMeta(data.selector)
          sendResponse({ success: true, data: nodeMeta })
          break

        case 'SAVE_SNAPSHOT':
          const snapshotId = await this.saveSnapshot(data.selector)
          sendResponse({ success: true, data: snapshotId })
          break

        case 'APPLY_TEXT':
          const textResult = await DOMHelpers.applyText(data.selector, data.text, data.options)
          sendResponse({ success: true, data: textResult })
          break

        case 'INSERT_CSS':
          await this.cssHelpers.insertCSS(data.cssId, data.cssText)
          sendResponse({ success: true })
          break

        case 'REMOVE_CSS':
          await this.cssHelpers.removeCSS(data.cssId)
          sendResponse({ success: true })
          break

        case 'TOGGLE_CSS':
          const toggleResult = await this.cssHelpers.toggleCSS(data.cssId, data.cssText)
          sendResponse({ success: true, data: toggleResult })
          break

        case 'SHOW_MODAL':
          const modalId = await this.modalHelpers.showModal(data.config)
          sendResponse({ success: true, data: modalId })
          break

        case 'CLOSE_MODAL':
          await this.modalHelpers.closeModal(data.modalId)
          sendResponse({ success: true })
          break

        case 'DOWNLOAD_FILE':
          await this.downloadFile(data.filename, data.content, data.mimeType)
          sendResponse({ success: true })
          break

        case 'SAVE_CAPTURE':
          await this.saveCapture(data.name, data.data)
          sendResponse({ success: true })
          break

        case 'GET_KB':
          const kbData = await this.getKB(data.key)
          sendResponse({ success: true, data: kbData })
          break

        case 'CONFIRM_ACTION':
          const confirmed = await this.confirmAction(data.prompt)
          sendResponse({ success: true, data: confirmed })
          break

        case 'NOTIFY':
          await this.notificationHelpers.notify(data.message, data.type)
          sendResponse({ success: true })
          break

        case 'PARSE_TABLE':
          const tableData = await DOMHelpers.parseTable(data.selector)
          sendResponse({ success: true, data: tableData })
          break

        case 'OPEN_QUICKBAR':
          this.openQuickbar()
          sendResponse({ success: true })
          break

        case 'GATHER_CONTEXT_DATA':
          const contextData = this.contextGatherer.gatherContextData()
          sendResponse({ success: true, data: contextData })
          break

        case 'EXECUTE_HANDLER':
          const handlerResult = await this.handlerExecutor.executeHandler(data.handlerId, data.input)
          sendResponse({ success: true, data: handlerResult })
          break

        case 'EXECUTE_TASK':
          const taskResult = await this.taskExecutor.executeTask(data.taskId, data.input)
          sendResponse({ success: true, data: taskResult })
          break

        default:
          sendResponse({ success: false, error: `Unknown message type: ${type}` })
      }
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async saveSnapshot(selector: string): Promise<string> {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const element = document.querySelector(selector)
    
    if (element) {
      const snapshot = {
        selector,
        tagName: element.tagName,
        innerHTML: element.innerHTML,
        value: (element as HTMLInputElement).value,
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {} as Record<string, string>),
        timestamp: Date.now()
      }
      this.snapshots.set(snapshotId, snapshot)
    }

    return snapshotId
  }

  private async downloadFile(filename: string, content: string, mimeType: string): Promise<void> {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    URL.revokeObjectURL(url)
  }

  private async saveCapture(name: string, data: unknown): Promise<void> {
    chrome.runtime.sendMessage({
      type: 'SAVE_CAPTURE',
      data: { name, data }
    })
  }

  private async getKB(key: string): Promise<unknown> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_KB',
        data: { key }
      }, (response) => {
        resolve(response?.data)
      })
    })
  }

  private async confirmAction(prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = window.confirm(prompt)
      resolve(result)
    })
  }

  private openQuickbar(): void {
    // Create and inject the quickbar overlay
    const overlay = document.createElement('div')
    overlay.id = 'promptflow-quickbar-overlay'
    overlay.className = 'promptflow-quickbar-overlay'
    
    // Inject quickbar styles if not already present
    this.injectQuickbarStyles()

    const quickbar = document.createElement('div')
    quickbar.className = 'promptflow-quickbar-content-wrapper'
    quickbar.innerHTML = `
      <div class="promptflow-quickbar-header-inline">
        <h2 class="promptflow-quickbar-title-inline">🚀 PromptFlow Quickbar</h2>
        <button id="close-quickbar" class="promptflow-quickbar-close-btn">×</button>
      </div>
      <div class="promptflow-quickbar-input-wrapper">
        <input type="text" id="quickbar-input" class="promptflow-quickbar-input-field" 
               placeholder="What would you like to do?">
      </div>
      <div class="promptflow-quickbar-actions-inline">
        <button id="run-action" class="promptflow-quickbar-btn-primary">Run Action</button>
        <button id="preview-action" class="promptflow-quickbar-btn-secondary">Preview</button>
      </div>
    `

    overlay.appendChild(quickbar)
    document.body.appendChild(overlay)

    // Add event listeners
    const closeBtn = quickbar.querySelector('#close-quickbar')
    const runBtn = quickbar.querySelector('#run-action')
    const previewBtn = quickbar.querySelector('#preview-action')
    const input = quickbar.querySelector('#quickbar-input') as HTMLInputElement

    const closeQuickbar = () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }

    closeBtn?.addEventListener('click', closeQuickbar)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeQuickbar()
    })

    runBtn?.addEventListener('click', () => {
      const prompt = input?.value
      if (prompt) {
        chrome.runtime.sendMessage({
          type: 'RUN_PROMPT',
          data: { prompt, context: { usePageContent: true } }
        })
        closeQuickbar()
      }
    })

    previewBtn?.addEventListener('click', () => {
      const prompt = input?.value
      if (prompt) {
        alert(`Preview: "${prompt}"`)
      }
    })

    input?.focus()

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickbar()
        document.removeEventListener('keydown', handleKeydown)
      }
    }
    document.addEventListener('keydown', handleKeydown)
  }

  private injectQuickbarStyles(): void {
    if (document.getElementById('promptflow-quickbar-styles')) return

    const style = document.createElement('style')
    style.id = 'promptflow-quickbar-styles'
    style.textContent = `
      .promptflow-quickbar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--color-overlay, rgba(0, 0, 0, 0.5));
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-family-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }
      
      .promptflow-quickbar-content-wrapper {
        background: var(--color-surface, #ffffff);
        border-radius: var(--radius-xl, 12px);
        padding: var(--space-6, 24px);
        box-shadow: var(--color-shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid var(--color-border-primary, #e5e7eb);
      }
      
      .promptflow-quickbar-header-inline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-5, 20px);
      }
      
      .promptflow-quickbar-title-inline {
        margin: 0;
        font-size: var(--font-size-xl, 20px);
        font-weight: var(--font-weight-semibold, 600);
        color: var(--color-text-primary, #111827);
      }
      
      .promptflow-quickbar-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--color-text-secondary, #6b7280);
        padding: var(--space-1, 4px);
        border-radius: var(--radius-md, 4px);
        transition: all var(--transition-normal, 0.2s ease);
      }
      
      .promptflow-quickbar-close-btn:hover {
        background: var(--color-surface-secondary, #f3f4f6);
        color: var(--color-text-primary, #374151);
      }
      
      .promptflow-quickbar-input-wrapper {
        margin-bottom: var(--space-5, 20px);
      }
      
      .promptflow-quickbar-input-field {
        width: 100%;
        padding: var(--space-3, 12px);
        border: 1px solid var(--color-input-border, #d1d5db);
        border-radius: var(--radius-lg, 8px);
        font-size: var(--font-size-base, 16px);
        background: var(--color-input-background, #ffffff);
        color: var(--color-input-text, #111827);
        font-family: inherit;
        transition: border-color var(--transition-normal, 0.2s ease);
      }
      
      .promptflow-quickbar-input-field:focus {
        outline: none;
        border-color: var(--color-input-border-focus, #3b82f6);
      }
      
      .promptflow-quickbar-input-field::placeholder {
        color: var(--color-input-placeholder, #9ca3af);
      }
      
      .promptflow-quickbar-actions-inline {
        display: flex;
        gap: var(--space-3, 12px);
        justify-content: flex-end;
      }
      
      .promptflow-quickbar-btn-primary {
        background: var(--color-button-primary, #3b82f6);
        color: var(--color-text-inverse, white);
        border: none;
        padding: 10px var(--space-5, 20px);
        border-radius: var(--radius-lg, 6px);
        cursor: pointer;
        font-weight: var(--font-weight-medium, 500);
        font-family: inherit;
        transition: background var(--transition-normal, 0.2s ease);
      }
      
      .promptflow-quickbar-btn-primary:hover {
        background: var(--color-button-primary-hover, #2563eb);
      }
      
      .promptflow-quickbar-btn-secondary {
        background: var(--color-button-secondary, #6b7280);
        color: var(--color-text-inverse, white);
        border: none;
        padding: 10px var(--space-5, 20px);
        border-radius: var(--radius-lg, 6px);
        cursor: pointer;
        font-weight: var(--font-weight-medium, 500);
        font-family: inherit;
        transition: background var(--transition-normal, 0.2s ease);
      }
      
      .promptflow-quickbar-btn-secondary:hover {
        background: var(--color-button-secondary-hover, #4b5563);
      }
    `
    
    document.head.appendChild(style)
  }
}

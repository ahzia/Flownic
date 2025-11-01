import { DOMHelpers } from './helpers/DOMHelpers'
import { CSSHelpers } from './helpers/CSSHelpers'
import { ModalHelpers } from './helpers/ModalHelpers'
import { NotificationHelpers } from './helpers/NotificationHelpers'
import { WorkflowTriggerManager } from './workflow/WorkflowTriggerManager'
import { ProgressIndicator } from './helpers/ProgressIndicator'
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
    const progress = new ProgressIndicator()
    this.workflowTriggerManager = new WorkflowTriggerManager(progress)
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

    // Listen for messages from iframe (overlay)
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CLOSE_OVERLAY') {
        const wrapper = document.getElementById('flownic-overlay-wrapper')
        if (wrapper) {
          wrapper.style.display = 'none'
        }
      }
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
          this.injectReactOverlay()
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

  private injectReactOverlay(): void {
    // Check if overlay already exists and just toggle it
    const existingWrapper = document.getElementById('flownic-overlay-wrapper')
    if (existingWrapper) {
      existingWrapper.style.display = 'block'
      const iframe = existingWrapper.querySelector('iframe')
      if (iframe && iframe.contentWindow) {
        // Send message to iframe to open Quickbar
        iframe.contentWindow.postMessage({ type: 'OPEN_QUICKBAR' }, '*')
      }
      return
    }

    // Create wrapper div for isolation
    // This wrapper should be transparent - the Quickbar component handles its own backdrop
    const wrapper = document.createElement('div')
    wrapper.id = 'flownic-overlay-wrapper'
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      pointer-events: none;
      isolation: isolate;
      background: transparent;
    `

    // Create container for React app
    // This container needs pointer-events to capture clicks for the Quickbar
    const container = document.createElement('div')
    container.id = 'flownic-overlay-root'
    container.style.cssText = 'width: 100%; height: 100%; pointer-events: auto;'
    wrapper.appendChild(container)
    document.body.appendChild(wrapper)

    // Create iframe to load the overlay HTML
    const iframe = document.createElement('iframe')
    iframe.src = chrome.runtime.getURL('src/ui/overlay.html')
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      pointer-events: auto;
    `
    
    // Wait for iframe to load, then send message to open Quickbar
    iframe.onload = () => {
      if (iframe.contentWindow) {
        // Small delay to ensure React has mounted
        setTimeout(() => {
          iframe.contentWindow?.postMessage({ type: 'OPEN_QUICKBAR' }, '*')
        }, 100)
      }
    }
    
    container.appendChild(iframe)
  }

}

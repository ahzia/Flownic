import { HelpersAPI, NodeMeta, TextOptions, ModalConfig } from '@common/types'

// Content script that provides helpers API to handlers
class ContentScriptHelpers implements HelpersAPI {
  private snapshots: Map<string, unknown> = new Map()
  private modals: Map<string, HTMLElement> = new Map()
  private cssInjections: Map<string, HTMLElement> = new Map()

  constructor() {
    this.setupMessageListener()
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // Keep message channel open for async response
    })
  }

  private async handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { type, data } = message

      switch (type) {
        case 'FIND_NODE_META':
          const nodeMeta = await this.findNodeMeta(data.selector)
          sendResponse({ success: true, data: nodeMeta })
          break

        case 'SAVE_SNAPSHOT':
          const snapshotId = await this.saveSnapshot(data.selector)
          sendResponse({ success: true, data: snapshotId })
          break

        case 'APPLY_TEXT':
          const textResult = await this.applyText(data.selector, data.text, data.options)
          sendResponse({ success: true, data: textResult })
          break

        case 'INSERT_CSS':
          await this.insertCSS(data.cssId, data.cssText)
          sendResponse({ success: true })
          break

        case 'REMOVE_CSS':
          await this.removeCSS(data.cssId)
          sendResponse({ success: true })
          break

        case 'TOGGLE_CSS':
          const toggleResult = await this.toggleCSS(data.cssId, data.cssText)
          sendResponse({ success: true, data: toggleResult })
          break

        case 'SHOW_MODAL':
          const modalId = await this.showModal(data.config)
          sendResponse({ success: true, data: modalId })
          break

        case 'CLOSE_MODAL':
          await this.closeModal(data.modalId)
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
          await this.notify(data.message, data.type)
          sendResponse({ success: true })
          break

        case 'PARSE_TABLE':
          const tableData = await this.parseTable(data.selector)
          sendResponse({ success: true, data: tableData })
          break

        default:
          sendResponse({ success: false, error: `Unknown message type: ${type}` })
      }
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async findNodeMeta(selector: string): Promise<NodeMeta | null> {
    try {
      const element = document.querySelector(selector)
      if (!element) return null

      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      return {
        exists: true,
        tagName: element.tagName.toLowerCase(),
        type: (element as HTMLInputElement).type || '',
        value: (element as HTMLInputElement).value || undefined,
        textContent: element.textContent || undefined,
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {} as Record<string, string>),
        isEditable: this.isElementEditable(element),
        isVisible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
      }
    } catch (error) {
      console.error('Error finding node meta:', error)
      return null
    }
  }

  private isElementEditable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()
    const inputType = (element as HTMLInputElement).type?.toLowerCase()

    // Check for contentEditable
    if (element.getAttribute('contenteditable') === 'true') return true

    // Check for form elements
    if (['input', 'textarea', 'select'].includes(tagName)) {
      if (tagName === 'input') {
        return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(inputType || '')
      }
      return true
    }

    return false
  }

  async saveSnapshot(selector: string): Promise<string> {
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

  async applyText(selector: string, text: string, options: TextOptions = { method: 'replace' }): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement
      if (!element) return false

      const { method = 'replace', triggerEvents = true, selectAfter = false } = options

      // Save current value for undo (stored in snapshot)
      // const currentValue = (element as HTMLInputElement).value || element.textContent || ''

      // Apply text based on method
      switch (method) {
        case 'replace':
          if (this.isElementEditable(element)) {
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = text
            } else {
              element.textContent = text
            }
          }
          break

        case 'append':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = current + text
            } else {
              element.textContent = current + text
            }
          }
          break

        case 'prepend':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = text + current
            } else {
              element.textContent = text + current
            }
          }
          break

        case 'insert':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            const cursorPos = (element as HTMLInputElement).selectionStart || 0
            const newValue = current.slice(0, cursorPos) + text + current.slice(cursorPos)
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = newValue
            } else {
              element.textContent = newValue
            }
          }
          break
      }

      // Trigger events if requested
      if (triggerEvents) {
        const events = ['input', 'change', 'blur']
        events.forEach(eventType => {
          const event = new Event(eventType, { bubbles: true, cancelable: true })
          element.dispatchEvent(event)
        })
      }

      // Select text if requested
      if (selectAfter && (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea')) {
        const input = element as HTMLInputElement
        input.select()
        input.setSelectionRange(0, input.value.length)
      }

      return true
    } catch (error) {
      console.error('Error applying text:', error)
      return false
    }
  }

  async insertCSS(cssId: string, cssText: string): Promise<void> {
    // Remove existing CSS with same ID
    this.removeCSS(cssId)

    const style = document.createElement('style')
    style.id = `promptflow-${cssId}`
    style.textContent = cssText
    document.head.appendChild(style)

    this.cssInjections.set(cssId, style)
  }

  async removeCSS(cssId: string): Promise<void> {
    const existing = this.cssInjections.get(cssId)
    if (existing) {
      existing.remove()
      this.cssInjections.delete(cssId)
    }

    // Also remove by ID in case of direct removal
    const style = document.getElementById(`promptflow-${cssId}`)
    if (style) {
      style.remove()
    }
  }

  async toggleCSS(cssId: string, cssText: string): Promise<boolean> {
    const existing = this.cssInjections.get(cssId)
    if (existing) {
      this.removeCSS(cssId)
      return false
    } else {
      this.insertCSS(cssId, cssText)
      return true
    }
  }

  async showModal(config: ModalConfig): Promise<string> {
    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const modal = document.createElement('div')
    modal.id = modalId
    modal.className = 'promptflow-modal'
    
    const { title, content, html = false, size = 'medium', closable = true } = config
    
    modal.innerHTML = `
      <div class="promptflow-modal-overlay">
        <div class="promptflow-modal-content promptflow-modal-${size}">
          <div class="promptflow-modal-header">
            <h3 class="promptflow-modal-title">${title}</h3>
            ${closable ? '<button class="promptflow-modal-close">&times;</button>' : ''}
          </div>
          <div class="promptflow-modal-body">
            ${html ? content : `<pre>${content}</pre>`}
          </div>
        </div>
      </div>
    `

    // Add styles
    this.injectModalStyles()

    // Add event listeners
    if (closable) {
      const closeBtn = modal.querySelector('.promptflow-modal-close')
      const overlay = modal.querySelector('.promptflow-modal-overlay')
      
      closeBtn?.addEventListener('click', () => this.closeModal(modalId))
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(modalId)
      })
    }

    document.body.appendChild(modal)
    this.modals.set(modalId, modal)

    return modalId
  }

  async closeModal(modalId: string): Promise<void> {
    const modal = this.modals.get(modalId)
    if (modal) {
      modal.remove()
      this.modals.delete(modalId)
    }
  }

  private injectModalStyles(): void {
    if (document.getElementById('promptflow-modal-styles')) return

    const style = document.createElement('style')
    style.id = 'promptflow-modal-styles'
    style.textContent = `
      .promptflow-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      
      .promptflow-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .promptflow-modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
      }
      
      .promptflow-modal-small { width: 300px; }
      .promptflow-modal-medium { width: 500px; }
      .promptflow-modal-large { width: 800px; }
      
      .promptflow-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
      }
      
      .promptflow-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .promptflow-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .promptflow-modal-body {
        padding: 20px;
      }
      
      .promptflow-modal-body pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
      }
    `
    
    document.head.appendChild(style)
  }

  async downloadFile(filename: string, content: string, mimeType: string): Promise<void> {
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

  async saveCapture(name: string, data: unknown): Promise<void> {
    // Send to background script for storage
    chrome.runtime.sendMessage({
      type: 'SAVE_CAPTURE',
      data: { name, data }
    })
  }

  async getKB(key: string): Promise<unknown> {
    // Send to background script for KB retrieval
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_KB',
        data: { key }
      }, (response) => {
        resolve(response?.data)
      })
    })
  }

  async confirmAction(prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = window.confirm(prompt)
      resolve(result)
    })
  }

  async notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    // Create a simple notification
    const notification = document.createElement('div')
    notification.className = `promptflow-notification promptflow-notification-${type}`
    notification.textContent = message
    
    // Add styles
    this.injectNotificationStyles()
    
    document.body.appendChild(notification)
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  private injectNotificationStyles(): void {
    if (document.getElementById('promptflow-notification-styles')) return

    const style = document.createElement('style')
    style.id = 'promptflow-notification-styles'
    style.textContent = `
      .promptflow-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
      }
      
      .promptflow-notification-info { background: #2196F3; }
      .promptflow-notification-success { background: #4CAF50; }
      .promptflow-notification-warning { background: #FF9800; }
      .promptflow-notification-error { background: #F44336; }
    `
    
    document.head.appendChild(style)
  }

  async parseTable(selector: string): Promise<string[][]> {
    const table = document.querySelector(selector) as HTMLTableElement
    if (!table) return []

    const rows: string[][] = []
    const tableRows = table.querySelectorAll('tr')

    tableRows.forEach(row => {
      const cells: string[] = []
      const tableCells = row.querySelectorAll('td, th')
      
      tableCells.forEach(cell => {
        cells.push(cell.textContent?.trim() || '')
      })
      
      if (cells.length > 0) {
        rows.push(cells)
      }
    })

    return rows
  }
}

// Initialize content script
new ContentScriptHelpers()

// Export for testing
export { ContentScriptHelpers }

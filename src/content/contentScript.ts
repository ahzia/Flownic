import { HelpersAPI, NodeMeta, TextOptions, ModalConfig } from '@common/types'

// Content script that provides helpers API to handlers
class ContentScriptHelpers implements HelpersAPI {
  private snapshots: Map<string, unknown> = new Map()
  private modals: Map<string, HTMLElement> = new Map()
  private cssInjections: Map<string, HTMLElement> = new Map()

  constructor() {
    this.setupMessageListener()
    this.setupWorkflowTriggers()
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // Keep message channel open for async response
    })
  }

  private setupWorkflowTriggers(): void {
    // Load enabled workflows and set up triggers
    this.loadEnabledWorkflows()
    
    // Listen for page changes to re-setup triggers
    const observer = new MutationObserver(() => {
      this.loadEnabledWorkflows()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  private async loadEnabledWorkflows(): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, skipping workflow load')
        return
      }

      const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
      if (response?.success) {
        const workflows = response.data || []
        const enabledWorkflows = workflows.filter((w: any) => w.enabled)
        
        // Check if current page matches workflow website patterns
        const currentUrl = window.location.href
        const matchingWorkflows = enabledWorkflows.filter((workflow: any) => {
          return this.matchesWebsitePattern(currentUrl, workflow.websiteConfig)
        })
        
        // Set up triggers for matching workflows
        matchingWorkflows.forEach((workflow: any) => {
          this.setupWorkflowTrigger(workflow)
        })
      }
    } catch (error: any) {
      // Handle extension context invalidated error gracefully
      if (error.message?.includes('Extension context invalidated') || !chrome.runtime?.id) {
        console.warn('Extension context invalidated, workflows will reload on next page load')
        return
      }
      console.error('Error loading workflows:', error)
    }
  }

  private matchesWebsitePattern(url: string, websiteConfig: any): boolean {
    if (!websiteConfig || websiteConfig.type === 'all') {
      return true
    }
    
    const patterns = websiteConfig.patterns.split('\n').filter((p: string) => p.trim())
    if (patterns.length === 0) {
      return websiteConfig.type === 'all'
    }
    
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const pathname = urlObj.pathname
    
    for (const pattern of patterns) {
      const trimmedPattern = pattern.trim()
      if (this.matchesPattern(hostname + pathname, trimmedPattern)) {
        return websiteConfig.type === 'specific'
      }
    }
    
    return websiteConfig.type === 'exclude'
  }

  private matchesPattern(url: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(url)
  }

  private setupWorkflowTrigger(workflow: any): void {
    const trigger = workflow.triggers[0]
    if (!trigger) return

    switch (trigger.type) {
      case 'onPageLoad':
        // Already handled by page load
        this.executeWorkflow(workflow)
        break
        
      case 'onSelection':
        this.setupSelectionTrigger(workflow, trigger)
        break
        
      case 'manual':
        this.setupManualTrigger(workflow, trigger)
        break
    }
  }

  private setupSelectionTrigger(workflow: any, trigger: any): void {
    let lastExecutionTime = 0
    const DEBOUNCE_MS = 1000 // Prevent multiple executions within 1 second
    
    const handleSelection = () => {
      const now = Date.now()
      if (now - lastExecutionTime < DEBOUNCE_MS) {
        return // Skip if executed recently
      }
      
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        // Check if selection matches selector if specified
        if (trigger.selector) {
          const selectedElement = selection.anchorNode?.parentElement
          if (selectedElement && !selectedElement.matches(trigger.selector)) {
            return
          }
        }
        lastExecutionTime = now
        this.executeWorkflow(workflow)
      }
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)
  }

  private setupManualTrigger(workflow: any, trigger: any): void {
    const handleKeydown = (event: KeyboardEvent) => {
      // Check if the shortcut matches (simplified - would need proper key combination parsing)
      if (trigger.shortcut && event.ctrlKey && event.shiftKey && event.key === 'K') {
        this.executeWorkflow(workflow)
      }
    }

    document.addEventListener('keydown', handleKeydown)
  }

  private async executeWorkflow(workflow: any): Promise<void> {
    try {
      console.log('Executing workflow:', workflow.name)
      
      // Send workflow execution request to background script
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_WORKFLOW',
        data: { workflow }
      })
      
      if (response.success) {
        console.log('Workflow executed successfully:', response.data)
      } else {
        console.error('Workflow execution failed:', response.error)
      }
    } catch (error) {
      console.error('Error executing workflow:', error)
    }
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

        case 'OPEN_QUICKBAR':
          this.openQuickbar()
          sendResponse({ success: true })
          break

        case 'GATHER_CONTEXT_DATA':
          const contextData = this.gatherContextData()
          sendResponse({ success: true, data: contextData })
          break

        case 'EXECUTE_HANDLER':
          const handlerResult = await this.executeHandler(data.handlerId, data.input)
          sendResponse({ success: true, data: handlerResult })
          break

        case 'EXECUTE_TASK':
          const taskResult = await this.executeTask(data.taskId, data.input)
          sendResponse({ success: true, data: taskResult })
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

  openQuickbar(): void {
    // Create and inject the quickbar overlay
    const overlay = document.createElement('div')
    overlay.id = 'promptflow-quickbar-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    const quickbar = document.createElement('div')
    quickbar.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `

    quickbar.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">🚀 PromptFlow Quickbar</h2>
        <button id="close-quickbar" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
      </div>
      <div style="margin-bottom: 20px;">
        <input type="text" id="quickbar-input" placeholder="What would you like to do?" 
               style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px;">
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="run-action" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Run Action</button>
        <button id="preview-action" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Preview</button>
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
        // Send message to background script to run the prompt
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
        // Show preview (placeholder for now)
        alert(`Preview: "${prompt}"`)
      }
    })

    // Focus the input
    input?.focus()

    // Close on Escape key
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickbar()
        document.removeEventListener('keydown', handleKeydown)
      }
    }
    document.addEventListener('keydown', handleKeydown)
  }

  private async executeTask(taskId: string, input: any): Promise<any> {
    try {
      console.log(`🎯 Executing task: ${taskId}`, input)
      
      // Import TaskRegistry dynamically
      const { TaskRegistry } = await import('@core/TaskRegistry')
      const registry = new TaskRegistry()
      
      // Create execution context
      const context = {
        startTime: Date.now(),
        tabId: null,
        url: window.location.href,
        aiAdapter: null // Tasks will use Chrome APIs directly
      }
      
      // Execute the task
      const result = await registry.executeTask(taskId, input, context)
      
      console.log(`✅ Task completed: ${taskId}`, result)
      
      return {
        success: true,
        data: result.data || result
      }
    } catch (error) {
      console.error(`❌ Error executing task ${taskId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async executeHandler(handlerId: string, input: any): Promise<any> {
    try {
      console.log('🎬 Executing handler:', handlerId, 'with input:', input)
      
      // Execute handler based on handlerId
      switch (handlerId) {
        case 'show_modal':
          // Convert null/empty content to empty string for display
          const title = input.title || 'Notification'
          const content = input.content != null ? String(input.content) : ''
          
          if (!title || content === null) {
            console.error('Invalid modal input:', { title, content: input.content })
            throw new Error('Title and content are required for show_modal handler')
          }
          
          const modalId = await this.showModal({
            title,
            content,
            html: input.html || false
          })
          
          return {
            success: true,
            data: { modalId },
            snapshot: { modalId, timestamp: Date.now() }
          }
          
        case 'insert_text':
          if (!input.selector || !input.text) {
            throw new Error('Selector and text are required for insert_text handler')
          }
          
          const success = await this.applyText(input.selector, input.text, { method: input.replace ? 'replace' : 'append' })
          
          if (!success) {
            throw new Error(`Element not found for selector: ${input.selector}`)
          }
          
          return {
            success: true,
            data: { selector: input.selector },
            snapshot: { selector: input.selector, timestamp: Date.now() }
          }
          
        default:
          throw new Error(`Unknown handler: ${handlerId}`)
      }
    } catch (error) {
      console.error('Error executing handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private gatherContextData(): any[] {
    const dataPoints: any[] = []
    
    // Gather selected text
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      dataPoints.push({
        id: 'selected_text',
        name: 'Selected Text',
        type: 'context',
        value: {
          text: selection.toString().trim(),
          length: selection.toString().trim().length,
          source: 'user_selection'
        },
        source: 'selected_text',
        timestamp: Date.now()
      })
    }
    
    // Gather page content
    dataPoints.push({
      id: 'page_content',
      name: 'Page Content',
      type: 'context',
      value: {
        html: document.documentElement.outerHTML,
        title: document.title,
        url: window.location.href,
        source: 'page_dom'
      },
      source: 'page_content',
      timestamp: Date.now()
    })
    
    // Gather extracted text (no HTML tags)
    const extractedText = document.body.innerText || document.body.textContent || ''
    dataPoints.push({
      id: 'extracted_text',
      name: 'Extracted Text',
      type: 'context',
      value: {
        text: extractedText,
        length: extractedText.length,
        source: 'text_extraction'
      },
      source: 'extracted_text',
      timestamp: Date.now()
    })
    
    return dataPoints
  }
}

// Initialize content script
new ContentScriptHelpers()

// Export for testing
export { ContentScriptHelpers }

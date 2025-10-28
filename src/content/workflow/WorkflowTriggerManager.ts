/**
 * Manages workflow triggers (onPageLoad, onSelection, manual)
 */
export class WorkflowTriggerManager {
  private enabledWorkflows: Map<string, any> = new Map()

  async loadEnabledWorkflows(): Promise<void> {
    try {
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
      if (error.message?.includes('Extension context invalidated') || !chrome.runtime?.id) {
        console.warn('Extension context invalidated, workflows will reload on next page load')
        return
      }
      console.error('Error loading workflows:', error)
    }
  }

  setupWorkflowTrigger(workflow: any): void {
    const trigger = workflow.triggers[0]
    if (!trigger) return

    // Store workflow to prevent duplicate setups
    if (this.enabledWorkflows.has(workflow.id)) {
      return
    }
    this.enabledWorkflows.set(workflow.id, workflow)

    switch (trigger.type) {
      case 'onPageLoad':
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
    let lastSelectionText = ''
    let lastSelectionRange: Range | null = null
    const DEBOUNCE_MS = 1000
    
    const handleSelection = () => {
      const now = Date.now()
      if (now - lastExecutionTime < DEBOUNCE_MS) {
        return
      }
      
      const selection = window.getSelection()
      if (!selection || !selection.toString().trim()) {
        return
      }
      
      const selectionText = selection.toString().trim()
      const range = selection.getRangeAt(0)
      
      // Check if this is the same selection as before
      const isSameSelection = 
        selectionText === lastSelectionText &&
        lastSelectionRange &&
        range.compareBoundaryPoints(Range.START_TO_START, lastSelectionRange) === 0 &&
        range.compareBoundaryPoints(Range.END_TO_END, lastSelectionRange) === 0
      
      if (isSameSelection) {
        // Same selection - don't trigger again
        return
      }
      
      if (trigger.selector) {
        const selectedElement = selection.anchorNode?.parentElement
        if (selectedElement && !selectedElement.matches(trigger.selector)) {
          return
        }
      }
      
      // Store selection info to prevent re-triggering
      lastExecutionTime = now
      lastSelectionText = selectionText
      lastSelectionRange = range.cloneRange()
      
      this.executeWorkflow(workflow)
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)
    
    // Clear selection tracking when selection is cleared
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection()
      if (!selection || !selection.toString().trim()) {
        lastSelectionText = ''
        lastSelectionRange = null
      }
    })
  }

  private setupManualTrigger(workflow: any, trigger: any): void {
    const handleKeydown = (event: KeyboardEvent) => {
      if (trigger.shortcut && event.ctrlKey && event.shiftKey && event.key === 'K') {
        this.executeWorkflow(workflow)
      }
    }

    document.addEventListener('keydown', handleKeydown)
  }

  private async executeWorkflow(workflow: any): Promise<void> {
    try {
      console.log('Executing workflow:', workflow.name)
      
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
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(url)
  }
}


import { aiAdapter } from './aiAdapter'
import { ActionPlan, Handler, HandlerResult, Workflow } from '@common/types'
import { validateActionPlan } from '@common/schemas'

// Handler registry
const handlers = new Map<string, Handler>()

// Load built-in handlers
async function loadBuiltInHandlers() {
  try {
    // Import and register built-in handlers
    const handlerModules = [
      'show_modal',
      'insert_text', 
      'modify_css',
      'parse_table_to_csv',
      'download_file',
      'save_capture'
    ]

    for (const handlerName of handlerModules) {
      try {
        const handlerModule = await import(`../handlers/${handlerName}.js`)
        if (handlerModule.meta && handlerModule.run) {
          const handler: Handler = {
            meta: handlerModule.meta,
            run: handlerModule.run,
            undo: handlerModule.undo
          }
          handlers.set(handlerName, handler)
          console.log(`Loaded handler: ${handlerName}`)
        }
      } catch (error) {
        console.error(`Failed to load handler ${handlerName}:`, error)
      }
    }
  } catch (error) {
    console.error('Error loading built-in handlers:', error)
  }
}

// Initialize service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptFlow extension installed')
  loadBuiltInHandlers()
})

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse)
  return true // Keep message channel open for async response
})

async function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    const { type, data } = message

    switch (type) {
      case 'CHECK_AI_AVAILABILITY':
        sendResponse({ available: aiAdapter.isAIAvailable() })
        break

      case 'GENERATE_ACTION_PLAN':
        const actionPlan = await generateActionPlan(data.prompt, data.context)
        sendResponse({ success: true, data: actionPlan })
        break

      case 'EXECUTE_ACTION_PLAN':
        const result = await executeActionPlan(data.actionPlan, sender.tab?.id)
        sendResponse({ success: true, data: result })
        break

      case 'SAVE_CAPTURE':
        await saveCapture(data.name, data.data)
        sendResponse({ success: true })
        break

      case 'GET_KB':
        const kbData = await getKB(data.key)
        sendResponse({ success: true, data: kbData })
        break

      case 'GET_HANDLERS':
        const handlerList = Array.from(handlers.values()).map(h => h.meta)
        sendResponse({ success: true, data: handlerList })
        break

      case 'GET_WORKFLOWS':
        const workflows = await getStoredWorkflows()
        sendResponse({ success: true, data: workflows })
        break

      case 'SAVE_WORKFLOW':
        await saveWorkflow(data.workflow)
        sendResponse({ success: true })
        break

      case 'DELETE_WORKFLOW':
        await deleteWorkflow(data.workflowId)
        sendResponse({ success: true })
        break

      case 'TEST_WORKFLOW':
        const testResult = await testWorkflow(data.workflow, sender.tab?.id)
        sendResponse({ success: true, data: testResult })
        break

      default:
        sendResponse({ success: false, error: `Unknown message type: ${type}` })
    }
  } catch (error) {
    console.error('Error handling message:', error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

async function generateActionPlan(prompt: string, context: any): Promise<ActionPlan> {
  try {
    // Use AI adapter to generate action plan
    const actionPlan = await aiAdapter.generateActionPlan(prompt, context)
    
    // Validate the action plan
    if (!validateActionPlan(actionPlan)) {
      throw new Error('Generated action plan failed validation')
    }

    return actionPlan
  } catch (error) {
    console.error('Error generating action plan:', error)
    
    // Return fallback action plan
    return {
      type: 'ACTION_PLAN',
      actions: [{
        op: 'SHOW_MODAL',
        params: {
          title: 'Error',
          content: `Failed to generate action plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
          size: 'small'
        }
      }],
      metadata: {
        confidence: 0.0,
        timestamp: Date.now(),
        source: 'promptflow-error'
      }
    }
  }
}

async function executeActionPlan(actionPlan: ActionPlan, tabId?: number): Promise<HandlerResult[]> {
  const results: HandlerResult[] = []

  try {
    // Validate action plan
    if (!validateActionPlan(actionPlan)) {
      throw new Error('Invalid action plan')
    }

    // Execute each action
    for (const action of actionPlan.actions) {
      try {
        const result = await executeAction(action, tabId)
        results.push(result)
        
        // If action failed and it's critical, stop execution
        if (!result.success && isCriticalAction(action.op)) {
          break
        }
      } catch (error) {
        console.error(`Error executing action ${action.op}:`, error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error executing action plan:', error)
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }]
  }
}

async function executeAction(action: any, tabId?: number): Promise<HandlerResult> {
  const handler = handlers.get(action.op)
  if (!handler) {
    return {
      success: false,
      error: `No handler found for action: ${action.op}`
    }
  }

  try {
    // Create helpers API for the handler
    const helpers = createHelpersAPI(tabId)
    
    // Execute the handler
    const result = await handler.run(action.params, helpers)
    
    // Store result for potential undo
    if (result.success && result.snapshot) {
      await storeActionSnapshot(action, result.snapshot)
    }

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function createHelpersAPI(tabId?: number) {
  return {
    findNodeMeta: async (selector: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'FIND_NODE_META',
          data: { selector }
        }, (response) => {
          resolve(response?.data || null)
        })
      })
    },

    saveSnapshot: async (selector: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<string>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'SAVE_SNAPSHOT',
          data: { selector }
        }, (response) => {
          resolve(response?.data as string || '')
        })
      })
    },

    applyText: async (selector: string, text: string, options?: any) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<boolean>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_TEXT',
          data: { selector, text, options }
        }, (response) => {
          resolve(response?.data as boolean || false)
        })
      })
    },

    insertCSS: async (cssId: string, cssText: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'INSERT_CSS',
          data: { cssId, cssText }
        }, (_response) => {
          resolve()
        })
      })
    },

    removeCSS: async (cssId: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'REMOVE_CSS',
          data: { cssId }
        }, (_response) => {
          resolve()
        })
      })
    },

    toggleCSS: async (cssId: string, cssText: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<boolean>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'TOGGLE_CSS',
          data: { cssId, cssText }
        }, (response) => {
          resolve(response?.data as boolean || false)
        })
      })
    },

    showModal: async (config: any) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<string>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_MODAL',
          data: { config }
        }, (response) => {
          resolve(response?.data as string || '')
        })
      })
    },

    closeModal: async (modalId: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'CLOSE_MODAL',
          data: { modalId }
        }, (_response) => {
          resolve()
        })
      })
    },

    downloadFile: async (filename: string, content: string, mimeType: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'DOWNLOAD_FILE',
          data: { filename, content, mimeType }
        }, (_response) => {
          resolve()
        })
      })
    },

    saveCapture: async (name: string, data: any) => {
      // Store in local storage
      const captures = await getStoredCaptures()
      captures[name] = {
        data,
        timestamp: Date.now()
      }
      await chrome.storage.local.set({ captures })
    },

    getKB: async (key: string) => {
      const result = await chrome.storage.local.get(['kb'])
      return result.kb?.[key] || null
    },

    confirmAction: async (prompt: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<boolean>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'CONFIRM_ACTION',
          data: { prompt }
        }, (response) => {
          resolve(response?.data as boolean || false)
        })
      })
    },

    notify: async (message: string, type?: string) => {
      if (!tabId) throw new Error('No tab ID available')
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'NOTIFY',
          data: { message, type }
        }, (_response) => {
          resolve()
        })
      })
    }
  }
}

function isCriticalAction(op: string): boolean {
  // Define which actions are critical and should stop execution on failure
  const criticalActions = ['FILL_FORM', 'CLICK_SELECTOR', 'REMOVE_NODE']
  return criticalActions.includes(op)
}

async function storeActionSnapshot(action: any, snapshot: any): Promise<void> {
  try {
    const snapshots = await getStoredSnapshots()
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    snapshots[snapshotId] = {
      action,
      snapshot,
      timestamp: Date.now()
    }
    await chrome.storage.local.set({ snapshots })
  } catch (error) {
    console.error('Error storing action snapshot:', error)
  }
}

async function getStoredCaptures(): Promise<Record<string, any>> {
  const result = await chrome.storage.local.get(['captures'])
  return result.captures || {}
}

async function getStoredSnapshots(): Promise<Record<string, any>> {
  const result = await chrome.storage.local.get(['snapshots'])
  return result.snapshots || {}
}

async function saveCapture(name: string, data: any): Promise<void> {
  const captures = await getStoredCaptures()
  captures[name] = {
    data,
    timestamp: Date.now()
  }
  await chrome.storage.local.set({ captures })
}

async function getKB(key: string): Promise<any> {
  const result = await chrome.storage.local.get(['kb'])
  return result.kb?.[key] || null
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-quickbar') {
    // Send message to active tab to open quickbar
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_QUICKBAR' })
      }
    })
  }
})

// Handle context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'promptflow-quickbar' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'OPEN_QUICKBAR' })
  }
})

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'promptflow-quickbar',
    title: 'Open PromptFlow',
    contexts: ['page', 'selection']
  })
})

// Workflow management functions
async function getStoredWorkflows(): Promise<Workflow[]> {
  const result = await chrome.storage.local.get(['workflows'])
  return result.workflows || []
}

async function saveWorkflow(workflow: Workflow): Promise<void> {
  const workflows = await getStoredWorkflows()
  const existingIndex = workflows.findIndex(w => w.id === workflow.id)
  
  if (existingIndex >= 0) {
    workflows[existingIndex] = workflow
  } else {
    workflows.push(workflow)
  }
  
  await chrome.storage.local.set({ workflows })
}

async function deleteWorkflow(workflowId: string): Promise<void> {
  const workflows = await getStoredWorkflows()
  const filteredWorkflows = workflows.filter(w => w.id !== workflowId)
  await chrome.storage.local.set({ workflows: filteredWorkflows })
}

async function testWorkflow(workflow: Workflow, _tabId?: number): Promise<any> {
  try {
    // For testing, we'll just simulate the workflow execution
    // In a real implementation, this would run the actual workflow steps
    console.log('Testing workflow:', workflow.name)
    
    // Simulate workflow execution
    const results = []
    for (const step of workflow.steps) {
      if (step.type === 'prompt') {
        // Simulate prompt execution
        results.push({
          stepId: step.id,
          type: 'prompt',
          result: 'Simulated prompt result'
        })
      } else if (step.type === 'action') {
        // Simulate action execution
        results.push({
          stepId: step.id,
          type: 'action',
          result: `Simulated ${step.action?.op} action`
        })
      }
    }
    
    return {
      success: true,
      results,
      message: `Workflow "${workflow.name}" test completed successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

console.log('🔧 PromptFlow Service Worker initialized')

// Import utilities for data point resolution and KB loading
import { resolveDataPointReferences } from '@core/utils/DataPointResolver'
import { loadKBDataPoints } from '@core/utils/KBLoader'
import { evaluateCondition } from '@core/utils/ConditionEvaluator'
import { storage } from '@utils/storage'

// Workflow storage - using StorageManager for consistency
async function getStoredWorkflows(): Promise<any[]> {
  return (await storage.get<any[]>('workflows')) || []
}

async function saveWorkflow(workflow: any): Promise<void> {
  const workflows = await getStoredWorkflows()
  const existingIndex = workflows.findIndex((w: any) => w.id === workflow.id)
  
  if (existingIndex >= 0) {
    workflows[existingIndex] = workflow
  } else {
    workflows.push(workflow)
  }
  
  await storage.set('workflows', workflows)
}

async function deleteWorkflow(workflowId: string): Promise<void> {
  const workflows = await getStoredWorkflows()
  const filtered = workflows.filter((w: any) => w.id !== workflowId)
  await storage.set('workflows', filtered)
}

// Track executing workflows to prevent duplicate executions
const executingWorkflows = new Set<string>()

async function executeWorkflow(workflow: any, tabId: number): Promise<any> {
  const workflowId = workflow.id || `workflow_${Date.now()}`
  
  // Prevent duplicate executions
  if (executingWorkflows.has(workflowId)) {
    console.log(`⚠️ Workflow ${workflowId} already executing, skipping duplicate execution`)
    return { 
      success: false, 
      error: 'Workflow is already running. Please wait for it to complete before running again.',
      workflowId 
    }
  }
  
  executingWorkflows.add(workflowId)
  console.log(`📝 Added workflow ${workflowId} to executing set. Current executing:`, Array.from(executingWorkflows))
  
  try {
    console.log('🚀 Executing workflow:', workflowId, workflow.name)
    
    // Step 1: Gather context data from content script
    const contextResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'GATHER_CONTEXT_DATA'
    })
    
    if (!contextResponse?.success) {
      throw new Error('Failed to gather context data')
    }
    
    const contextDataPoints = contextResponse.data || []
    console.log('📊 Gathered context data points:', contextDataPoints.length)
    
    // Step 1.5: Load KB entries from storage and add to data points
    const kbDataPoints = await loadKBDataPoints()
    console.log('📚 Loaded KB data points:', kbDataPoints.length)
    
    // Convert DataPoint[] to any[] for compatibility
    const kbDataPointsAny = kbDataPoints.map(dp => ({
      id: dp.id,
      name: dp.name,
      type: dp.type,
      value: dp.value,
      source: (dp as any).source || 'kb',
      timestamp: (dp as any).timestamp || Date.now()
    }))
    
    // Step 2: Execute workflow steps
    const results: any[] = []
    const dataPoints: any[] = [...contextDataPoints, ...kbDataPointsAny]
    
    for (const step of workflow.steps || []) {
      try {
        // Check step condition before executing
        if (step.condition) {
          console.log(`🔍 Evaluating condition for step ${step.id}: "${step.condition}"`)
          console.log(`📊 Available data points:`, dataPoints.map(dp => ({ id: dp.id, hasValue: !!dp.value })))
          const shouldExecute = evaluateCondition(step.condition, dataPoints)
          console.log(`🔍 Condition result for step ${step.id}: ${shouldExecute}`)
          if (!shouldExecute) {
            console.log(`⏭️ Step ${step.id} skipped due to condition: "${step.condition}"`)
            results.push({
              stepId: step.id,
              type: step.type,
              skipped: true,
              reason: 'condition_false',
              result: {
                success: true,
                skipped: true
              }
            })
            continue
          }
          console.log(`✅ Step ${step.id} condition passed: "${step.condition}"`)
        } else {
          console.log(`➡️ Step ${step.id} has no condition, executing...`)
        }
        
        // Apply delay if specified
        if (step.delay && step.delay > 0) {
          console.log(`⏳ Waiting ${step.delay} seconds before step ${step.id}`)
          await new Promise(resolve => setTimeout(resolve, step.delay! * 1000))
        }
        
        // Resolve input data points
        const resolvedInput = resolveDataPointReferences(step.input, dataPoints)
        console.log(`📝 Step ${step.id} resolved input:`, resolvedInput)
        
        if (step.type === 'task') {
          // Execute task in content script context (where Chrome AI APIs are available)
          const taskResult = await executeTaskInContent(step, resolvedInput, tabId)
          
          if (taskResult.success) {
            // Add task output to data points
            const outputDataPoint = {
              id: `${step.id}_output`,
              name: `${step.taskId} Output`,
              type: 'task_output',
              value: taskResult.data,
              timestamp: Date.now()
            }
            dataPoints.push(outputDataPoint)
            console.log(`✅ Task output added:`, outputDataPoint)
          }
          
          results.push({
            stepId: step.id,
            type: 'task',
            result: taskResult
          })
        } else if (step.type === 'handler') {
          // Execute handler in content script
          console.log(`🎬 About to execute handler ${step.handlerId} for step ${step.id}`)
          const handlerResult = await executeHandlerInContent(step, resolvedInput, tabId)
          console.log(`✅ Handler ${step.handlerId} completed for step ${step.id}:`, handlerResult)
          
          results.push({
            stepId: step.id,
            type: 'handler',
            result: handlerResult
          })
        }
      } catch (error) {
        console.error(`❌ Error executing step ${step.id}:`, error)
        results.push({
          stepId: step.id,
          type: step.type,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
    
    console.log('✅ Workflow executed successfully')
    return {
      workflowId,
      results,
      success: true
    }
  } catch (error) {
    console.error('❌ Workflow execution failed:', error)
    return {
      workflowId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    executingWorkflows.delete(workflowId)
    console.log(`🧹 Cleaned up workflow ${workflowId} from executing set. Remaining:`, Array.from(executingWorkflows))
  }
}

// KB loading and data point resolution are now imported from utilities above

async function executeTaskInContent(step: any, input: any, tabId: number): Promise<any> {
  try {
    console.log(`🎯 Executing task in content: ${step.taskId}`, input)
    
    // Send task execution request to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_TASK',
      data: {
        taskId: step.taskId,
        input
      }
    })
    
    if (!response?.success) {
      throw new Error(response?.error || 'Task execution failed')
    }
    
    return response.data
  } catch (error) {
    console.error('Error executing task in content:', error)
    throw error
  }
}

async function executeHandlerInContent(step: any, input: any, tabId: number): Promise<any> {
  try {
    console.log(`🎬 Executing handler in content: ${step.handlerId}`, input)
    
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_HANDLER',
      data: {
        handlerId: step.handlerId,
        input
      }
    })
    
    if (!response?.success) {
      throw new Error(response?.error || 'Handler execution failed')
    }
    
    return response.data
  } catch (error) {
    console.error('Error executing handler in content:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Message handler
async function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<boolean> {
  try {
    const { type, data } = message
    
    switch (type) {
      case 'GET_WORKFLOWS':
        console.log('📥 GET_WORKFLOWS request')
        const workflows = await getStoredWorkflows()
        console.log(`📤 Returning ${workflows.length} workflows`)
        sendResponse({ success: true, data: workflows })
        return true
      
      case 'SAVE_WORKFLOW':
        console.log('💾 SAVE_WORKFLOW request:', data?.workflow?.name)
        try {
          await saveWorkflow(data.workflow)
          console.log('✅ Workflow saved successfully')
          sendResponse({ success: true })
        } catch (error) {
          console.error('❌ Error saving workflow:', error)
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }
        return true
      
      case 'DELETE_WORKFLOW':
        try {
          await deleteWorkflow(data.workflowId)
          sendResponse({ success: true })
        } catch (error) {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }
        return true
      
      case 'EXECUTE_WORKFLOW':
        const tabId = sender.tab?.id
        if (!tabId) {
          sendResponse({ success: false, error: 'No tab ID available' })
          return true
        }
        
        executeWorkflow(data.workflow, tabId)
          .then((result) => {
            sendResponse({ success: true, data: result })
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message })
          })
        
        return true // Keep channel open for async response
      
      default:
        sendResponse({ success: false, error: `Unknown message type: ${type}` })
        return true
    }
  } catch (error) {
    console.error('Error handling message:', error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return true
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse)
  return true // Keep message channel open for async responses
})

// Handle keyboard commands (from manifest.json commands section)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-quickbar') {
    // Get the active tab and send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_QUICKBAR' })
      }
    })
  }
})


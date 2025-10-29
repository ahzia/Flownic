console.log('🔧 PromptFlow Service Worker initialized')

// Workflow storage
async function getStoredWorkflows(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['workflows'], (result) => {
      resolve(result.workflows || [])
    })
  })
}

async function saveWorkflow(workflow: any): Promise<void> {
  return new Promise((resolve, reject) => {
    getStoredWorkflows().then((workflows) => {
      const existingIndex = workflows.findIndex((w: any) => w.id === workflow.id)
      
      if (existingIndex >= 0) {
        workflows[existingIndex] = workflow
      } else {
        workflows.push(workflow)
      }
      
      chrome.storage.local.set({ workflows }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  })
}

async function deleteWorkflow(workflowId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getStoredWorkflows().then((workflows) => {
      const filtered = workflows.filter((w: any) => w.id !== workflowId)
      chrome.storage.local.set({ workflows: filtered }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  })
}

// Track executing workflows to prevent duplicate executions
const executingWorkflows = new Set<string>()

async function executeWorkflow(workflow: any, tabId: number): Promise<any> {
  const workflowId = workflow.id || `workflow_${Date.now()}`
  
  // Prevent duplicate executions
  if (executingWorkflows.has(workflowId)) {
    console.log(`Workflow ${workflowId} already executing, skipping`)
    return { success: false, error: 'Workflow already executing' }
  }
  
  executingWorkflows.add(workflowId)
  
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
    
    // Step 2: Execute workflow steps
    const results: any[] = []
    const dataPoints: any[] = [...contextDataPoints]
    
    for (const step of workflow.steps || []) {
      try {
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
          const handlerResult = await executeHandlerInContent(step, resolvedInput, tabId)
          
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
  }
}

function resolveDataPointReferences(input: any, dataPoints: any[]): any {
  if (typeof input !== 'object' || input === null) {
    return input
  }
  
  if (input.type === 'data_point') {
    console.log('🔍 Resolving data point reference:', input.dataPointId, 'field:', input.field)
    console.log('📋 Available data points:', dataPoints.map(dp => ({ id: dp.id, name: dp.name })))
    
    const dataPoint = dataPoints.find(dp => dp.id === input.dataPointId)
    if (!dataPoint) {
      console.warn(`⚠️ Data point not found: ${input.dataPointId}`)
      console.warn('Available data point IDs:', dataPoints.map(dp => dp.id))
      return null
    }
    
    console.log('✅ Found data point:', { id: dataPoint.id, value: dataPoint.value })
    
    // Handle raw JSON option
    if (input.field === '__raw__') {
      if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
        console.log('📤 Returning raw JSON object:', dataPoint.value)
        // Return as JSON string for display in modal
        return JSON.stringify(dataPoint.value, null, 2)
      }
      // If not an object, return as-is
      return dataPoint.value
    }
    
    if (input.field && dataPoint.value && typeof dataPoint.value === 'object') {
      const fieldValue = dataPoint.value[input.field]
      console.log(`🔑 Extracted field '${input.field}':`, fieldValue)
      
      // If field value is an object/array, stringify it
      if (fieldValue !== null && fieldValue !== undefined && typeof fieldValue !== 'string' && typeof fieldValue !== 'number' && typeof fieldValue !== 'boolean') {
        return JSON.stringify(fieldValue, null, 2)
      }
      
      return fieldValue || null
    }
    
    // If value is an object but no field specified, return JSON string
    if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
      const jsonValue = JSON.stringify(dataPoint.value, null, 2)
      console.log('📤 Returning JSON stringified value:', jsonValue)
      return jsonValue
    }
    
    // If value is a string, return it directly
    console.log('📤 Returning primitive value:', dataPoint.value)
    return dataPoint.value
  }
  
  // Recursively resolve nested objects
  const resolved: any = {}
  for (const [key, value] of Object.entries(input)) {
    resolved[key] = resolveDataPointReferences(value, dataPoints)
  }
  
  return resolved
}

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


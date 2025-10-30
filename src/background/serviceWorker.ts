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
    
    // Step 2: Execute workflow steps
    const results: any[] = []
    const dataPoints: any[] = [...contextDataPoints, ...kbDataPoints]
    
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
    console.log(`🧹 Cleaned up workflow ${workflowId} from executing set. Remaining:`, Array.from(executingWorkflows))
  }
}

// Load KB entries from storage and convert to data points
async function loadKBDataPoints(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['kbEntries'], (result) => {
      const kbEntries = (result.kbEntries || []) as Array<{
        id: string
        name: string
        content: string
        type: string
        tags: string[]
        createdAt: number
        updatedAt: number
      }>
      
      const dataPoints = kbEntries.map(entry => ({
        id: `kb_${entry.id}`, // Match the format used in UI: kb_${entry.id}
        name: `KB: ${entry.name}`,
        type: 'context',
        value: {
          text: entry.content,
          title: entry.name,
          source: 'kb'
        },
        source: 'kb',
        timestamp: entry.updatedAt || entry.createdAt || Date.now()
      }))
      
      resolve(dataPoints)
    })
  })
}

// Import token interpolation (will be bundled)
// We'll inline this to avoid module issues in service worker
function interpolateTextWithDataPoints(text: string, dataPoints: any[]): string {
  if (typeof text !== 'string') {
    return String(text ?? '')
  }
  
  const tokenRegex = /\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g
  const tokens: string[] = []
  let match
  
  // Reset regex lastIndex
  tokenRegex.lastIndex = 0
  while ((match = tokenRegex.exec(text)) !== null) {
    const fullToken = match[0]
    if (!tokens.includes(fullToken)) {
      tokens.push(fullToken)
    }
  }
  
  if (tokens.length === 0) {
    return text // No tokens to interpolate
  }
  
  console.log(`🔍 Interpolating ${tokens.length} token(s) in text. Available data points:`, dataPoints.map((dp: any) => dp.id))
  
  let result = text
  for (const token of tokens) {
    const tokenMatch = token.match(/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/)
    if (!tokenMatch) continue
    
    const [, dataPointId, field] = tokenMatch
    console.log(`🔍 Looking for data point: ${dataPointId} (field: ${field || 'none'})`)
    
    let dataPoint = dataPoints.find((dp: any) => dp.id === dataPointId)
    
    // If not found, try normalized formats
    if (!dataPoint) {
      // Try 1: If it's an output ID with timestamp, try normalized format
      if (dataPointId.includes('_output_')) {
        const stepId = dataPointId.split('_output_')[0]
        const normalizedId = `${stepId}_output`
        console.log(`🔄 Trying normalized output ID: ${normalizedId}`)
        dataPoint = dataPoints.find((dp: any) => dp.id === normalizedId)
      }
      
      // Try 2: If it's a context provider with timestamp (e.g., extracted_text_123456), try stable ID
      if (!dataPoint) {
        const contextProviderIds = ['selected_text', 'extracted_text', 'page_content', 'kb_']
        for (const providerId of contextProviderIds) {
          if (dataPointId.startsWith(providerId) && dataPointId !== providerId) {
            // Extract the base ID (handle kb_ specially as it might be kb_kb_xxx)
            let baseId = providerId
            if (providerId === 'kb_') {
              // Handle kb_kb_xxx or kb_xxx format
              // Try to match actual KB entry IDs (kb_kb_<entryId> or kb_<entryId>)
              // First try the exact match, then try without the timestamp part
              if (dataPointId.startsWith('kb_kb_')) {
                // Format: kb_kb_<entryId>_<timestamp> or kb_kb_<entryId>
                const parts = dataPointId.split('_')
                // Try kb_kb_<entryId> (first 3 parts)
                if (parts.length >= 3) {
                  baseId = parts.slice(0, 3).join('_')
                  console.log(`🔄 Trying KB ID: ${baseId}`)
                  dataPoint = dataPoints.find((dp: any) => dp.id === baseId || dp.id.startsWith(baseId + '_'))
                  if (dataPoint) break
                }
              } else if (dataPointId.startsWith('kb_')) {
                // Format: kb_<entryId>_<timestamp> or kb_<entryId>
                const parts = dataPointId.split('_')
                if (parts.length >= 2) {
                  baseId = parts.slice(0, 2).join('_')
                  console.log(`🔄 Trying KB ID: ${baseId}`)
                  dataPoint = dataPoints.find((dp: any) => dp.id === baseId || dp.id.startsWith(baseId + '_'))
                  if (dataPoint) break
                }
              }
              // Continue to other providers if KB matching didn't work
              continue
            } else {
              // For others, just take the part before the timestamp
              baseId = dataPointId.split('_').slice(0, -1).join('_')
            }
            
            console.log(`🔄 Trying normalized context ID: ${baseId}`)
            dataPoint = dataPoints.find((dp: any) => dp.id === baseId)
            if (dataPoint) break
            
            // Also try the stable provider ID (e.g., extracted_text_xxx -> extracted_text)
            if (providerId !== 'kb_') {
              console.log(`🔄 Trying stable provider ID: ${providerId}`)
              dataPoint = dataPoints.find((dp: any) => dp.id === providerId)
              if (dataPoint) break
            }
          }
        }
      }
    }
    
    if (!dataPoint) {
      console.warn(`⚠️ Token interpolation: Data point not found: ${dataPointId}`)
      console.warn(`📋 Available data point IDs:`, dataPoints.map((dp: any) => dp.id))
      // Keep the token as-is if data point not found (will show in UI)
      continue
    }
    
    console.log(`✅ Found data point: ${dataPointId}`, dataPoint)
    
    let resolved: string
    if (field === '__raw__') {
      if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
        resolved = JSON.stringify(dataPoint.value, null, 2)
      } else {
        resolved = String(dataPoint.value ?? '')
      }
    } else if (field && dataPoint.value && typeof dataPoint.value === 'object') {
      const fieldValue = dataPoint.value[field]
      if (fieldValue !== null && fieldValue !== undefined) {
        if (typeof fieldValue !== 'string' && typeof fieldValue !== 'number' && typeof fieldValue !== 'boolean') {
          resolved = JSON.stringify(fieldValue, null, 2)
        } else {
          resolved = String(fieldValue)
        }
      } else {
        resolved = ''
      }
    } else {
      if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
        resolved = JSON.stringify(dataPoint.value, null, 2)
      } else {
        resolved = String(dataPoint.value ?? '')
      }
    }
    
    result = result.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), resolved)
  }
  
  return result
}

function resolveDataPointReferences(input: any, dataPoints: any[]): any {
  // Handle strings - interpolate tokens if present
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
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
  
  // Recursively resolve nested objects and strings
  const resolved: any = {}
  for (const [key, value] of Object.entries(input)) {
    // If value is a string, interpolate it; if object, recurse
    if (typeof value === 'string') {
      resolved[key] = interpolateTextWithDataPoints(value, dataPoints)
    } else {
      resolved[key] = resolveDataPointReferences(value, dataPoints)
    }
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


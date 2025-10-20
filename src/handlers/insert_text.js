// Insert Text Handler - Fill or replace text in form fields
export const meta = {
  id: 'insert_text',
  name: 'Insert Text',
  version: '1.0.0',
  description: 'Insert, append, prepend, or replace text in form fields or contentEditable elements',
  permissions: ['writeDom'],
  inputSchema: {
    type: 'object',
    required: ['selector', 'text'],
    properties: {
      selector: { type: 'string' },
      text: { type: 'string' },
      method: { 
        type: 'string', 
        enum: ['replace', 'append', 'prepend', 'insert'],
        default: 'replace'
      },
      triggerEvents: { type: 'boolean', default: true },
      selectAfter: { type: 'boolean', default: false }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { selector, text, method = 'replace', triggerEvents = true, selectAfter = false } = input
    
    // Check if element exists and is editable
    const nodeMeta = await helpers.findNodeMeta(selector)
    if (!nodeMeta) {
      return {
        success: false,
        error: `Element not found: ${selector}`
      }
    }
    
    if (!nodeMeta.isEditable) {
      return {
        success: false,
        error: `Element is not editable: ${selector}`
      }
    }
    
    // Save snapshot for undo
    const snapshotId = await helpers.saveSnapshot(selector)
    
    // Apply text with specified method
    const success = await helpers.applyText(selector, text, {
      method,
      triggerEvents,
      selectAfter
    })
    
    if (!success) {
      return {
        success: false,
        error: `Failed to apply text to: ${selector}`
      }
    }
    
    return {
      success: true,
      data: { 
        selector, 
        text, 
        method, 
        originalValue: nodeMeta.value || nodeMeta.textContent 
      },
      snapshot: { snapshotId, selector, method }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

export async function undo(lastRunState, helpers) {
  try {
    if (lastRunState?.snapshotId) {
      // Restore from snapshot
      await helpers.restoreSnapshot(lastRunState.snapshotId)
    }
  } catch (error) {
    console.error('Error undoing insert_text:', error)
  }
}

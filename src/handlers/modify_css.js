// Modify CSS Handler - Inject, remove, or toggle CSS styles
export const meta = {
  id: 'modify_css',
  name: 'Modify CSS',
  version: '1.0.0',
  description: 'Inject, remove, or toggle CSS styles on the current page',
  permissions: ['writeDom'],
  inputSchema: {
    type: 'object',
    required: ['cssId', 'cssText'],
    properties: {
      cssId: { type: 'string' },
      cssText: { type: 'string' },
      action: { 
        type: 'string', 
        enum: ['insert', 'remove', 'toggle'],
        default: 'insert'
      }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { cssId, cssText, action = 'insert' } = input
    
    let success = false
    let currentState = false
    
    switch (action) {
      case 'insert':
        await helpers.insertCSS(cssId, cssText)
        success = true
        currentState = true
        break
        
      case 'remove':
        await helpers.removeCSS(cssId)
        success = true
        currentState = false
        break
        
      case 'toggle':
        currentState = await helpers.toggleCSS(cssId, cssText)
        success = true
        break
        
      default:
        return {
          success: false,
          error: `Invalid action: ${action}`
        }
    }
    
    return {
      success,
      data: { 
        cssId, 
        action, 
        currentState,
        cssText: action === 'insert' ? cssText : undefined
      },
      snapshot: { cssId, action, previousState: !currentState }
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
    if (!lastRunState) return
    
    const { cssId, action, previousState } = lastRunState
    
    switch (action) {
      case 'insert':
        // Remove the CSS that was inserted
        await helpers.removeCSS(cssId)
        break
        
      case 'remove':
        // Re-insert the CSS that was removed (would need original CSS text)
        // This is a limitation - we'd need to store the original CSS
        console.warn('Cannot undo CSS removal without original CSS text')
        break
        
      case 'toggle':
        // Toggle back to previous state
        if (previousState) {
          await helpers.insertCSS(cssId, lastRunState.cssText)
        } else {
          await helpers.removeCSS(cssId)
        }
        break
    }
  } catch (error) {
    console.error('Error undoing modify_css:', error)
  }
}

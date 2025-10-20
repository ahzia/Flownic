// Save Capture Handler - Store structured data for later use
export const meta = {
  id: 'save_capture',
  name: 'Save Capture',
  version: '1.0.0',
  description: 'Save structured data as a capture for use in future workflows',
  permissions: ['storage'],
  inputSchema: {
    type: 'object',
    required: ['name', 'data'],
    properties: {
      name: { type: 'string' },
      data: { type: 'object' },
      tags: { 
        type: 'array', 
        items: { type: 'string' },
        default: []
      },
      description: { type: 'string' }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { name, data, tags = [], description } = input
    
    // Validate name
    if (!name || name.trim() === '') {
      return {
        success: false,
        error: 'Capture name is required'
      }
    }
    
    // Validate data
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Capture data must be an object'
      }
    }
    
    // Create capture object
    const capture = {
      id: generateId(),
      name: name.trim(),
      data,
      tags: Array.isArray(tags) ? tags : [],
      description: description || '',
      source: window.location.href,
      timestamp: Date.now()
    }
    
    // Save capture
    await helpers.saveCapture(capture.name, capture)
    
    return {
      success: true,
      data: { 
        id: capture.id,
        name: capture.name,
        tagCount: capture.tags.length,
        dataSize: JSON.stringify(data).length,
        timestamp: capture.timestamp
      },
      snapshot: { captureId: capture.id, name: capture.name }
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
    // Captures cannot be easily undone as they're stored in IndexedDB
    // We could implement a delete function, but for now just notify
    if (lastRunState?.captureId) {
      await helpers.notify(`Capture "${lastRunState.name}" has been saved and cannot be undone`, 'info')
    }
  } catch (error) {
    console.error('Error undoing save_capture:', error)
  }
}

// Helper function to generate unique ID
function generateId() {
  return 'capture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

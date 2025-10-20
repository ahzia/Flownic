// Show Modal Handler - Display content in extension modal
export const meta = {
  id: 'show_modal',
  name: 'Show Modal',
  version: '1.0.0',
  description: 'Display text or HTML content in a modal dialog',
  permissions: ['showModal'],
  inputSchema: {
    type: 'object',
    required: ['title', 'content'],
    properties: {
      title: { type: 'string' },
      content: { type: 'string' },
      html: { type: 'boolean', default: false },
      size: { 
        type: 'string', 
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      closable: { type: 'boolean', default: true }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { title, content, html = false, size = 'medium', closable = true } = input
    
    const modalId = await helpers.showModal({
      title,
      content,
      html,
      size,
      closable
    })
    
    return {
      success: true,
      data: { modalId },
      snapshot: { modalId, timestamp: Date.now() }
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
    if (lastRunState?.modalId) {
      await helpers.closeModal(lastRunState.modalId)
    }
  } catch (error) {
    console.error('Error undoing show_modal:', error)
  }
}

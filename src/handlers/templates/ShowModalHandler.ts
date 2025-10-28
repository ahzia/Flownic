import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class ShowModalHandler extends BaseHandler {
  readonly id = 'show_modal'
  readonly name = 'Show Modal'
  readonly description = 'Display text or HTML content in a modal dialog'
  readonly category = 'ui'
  readonly permissions = ['showModal']
  
  readonly inputSchema = {
    type: 'object',
    required: ['title', 'content'],
    properties: {
      title: { 
        type: 'string',
        description: 'Modal title'
      },
      content: { 
        type: 'string',
        description: 'Modal content (text or HTML)'
      },
      html: { 
        type: 'boolean', 
        default: false,
        description: 'Whether content should be rendered as HTML'
      },
      size: { 
        type: 'string', 
        enum: ['small', 'medium', 'large'],
        default: 'medium',
        description: 'Modal size'
      },
      closable: { 
        type: 'boolean', 
        default: true,
        description: 'Whether modal can be closed'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const title = typeof input.title === 'string' ? input.title : String(input.title || '')
    const content = typeof input.content === 'string' ? input.content : String(input.content || '')
    const html = typeof input.html === 'boolean' ? input.html : false
    const size = (typeof input.size === 'string' && ['small', 'medium', 'large'].includes(input.size)) 
      ? input.size as 'small' | 'medium' | 'large'
      : 'medium'
    const closable = typeof input.closable === 'boolean' ? input.closable : true
    
    // Validate required fields
    if (!title || title.trim() === '') {
      return {
        success: false,
        error: 'Title is required and must be a string'
      }
    }
    
    if (!content || content.trim() === '') {
      return {
        success: false,
        error: 'Content is required and must be a string'
      }
    }
    
    try {
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
        error: error instanceof Error ? error.message : 'Failed to show modal'
      }
    }
  }
  
  async undo(lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      if (lastRunState && typeof lastRunState === 'object') {
        const state = lastRunState as { modalId?: string }
        if (state.modalId) {
          await helpers.closeModal(state.modalId)
        }
      }
    } catch (error) {
      console.error('Error undoing show_modal:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'title',
          label: 'Modal Title',
          type: 'text',
          required: true,
          placeholder: 'Enter modal title...'
        }),
        this.createInputField({
          name: 'content',
          label: 'Modal Content',
          type: 'textarea',
          required: true,
          placeholder: 'Enter modal content or select from data points...',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'html',
          label: 'Render as HTML',
          type: 'boolean',
          required: false
        }),
        this.createInputField({
          name: 'size',
          label: 'Modal Size',
          type: 'select',
          required: false,
          options: [
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' }
          ]
        }),
        this.createInputField({
          name: 'closable',
          label: 'Closable',
          type: 'boolean',
          required: false
        })
      ],
      layout: 'vertical',
      validation: {
        validateOnChange: true,
        validateOnBlur: true,
        showErrors: true
      }
    }
  }
}


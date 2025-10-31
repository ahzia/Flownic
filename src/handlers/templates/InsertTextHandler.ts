import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class InsertTextHandler extends BaseHandler {
  readonly id = 'insert_text'
  readonly name = 'Insert Text'
  readonly description = 'Insert, append, prepend, or replace text in form fields or contentEditable elements'
  readonly category = 'ui'
  readonly permissions = ['writeDom']
  readonly icon = 'Type'
  
  readonly inputSchema = {
    type: 'object',
    required: ['selector', 'text'],
    properties: {
      selector: { 
        type: 'string',
        description: 'CSS selector for the target element'
      },
      text: { 
        type: 'string',
        description: 'Text to insert'
      },
      method: { 
        type: 'string', 
        enum: ['replace', 'append', 'prepend', 'insert'],
        default: 'replace',
        description: 'How to insert the text'
      },
      triggerEvents: { 
        type: 'boolean', 
        default: true,
        description: 'Whether to trigger input/change events'
      },
      selectAfter: { 
        type: 'boolean', 
        default: false,
        description: 'Whether to select the text after insertion'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const selector = typeof input.selector === 'string' ? input.selector : String(input.selector || '')
    const text = typeof input.text === 'string' ? input.text : String(input.text || '')
    const method = (typeof input.method === 'string' && ['replace', 'append', 'prepend', 'insert'].includes(input.method))
      ? input.method as 'replace' | 'append' | 'prepend' | 'insert'
      : 'replace'
    const triggerEvents = typeof input.triggerEvents === 'boolean' ? input.triggerEvents : true
    const selectAfter = typeof input.selectAfter === 'boolean' ? input.selectAfter : false
    
    if (!selector || selector.trim() === '') {
      return {
        success: false,
        error: 'Selector is required and must be a string'
      }
    }
    
    if (!text || text.trim() === '') {
      return {
        success: false,
        error: 'Text is required and must be a string'
      }
    }
    
    try {
      // Check if element exists and is editable
      const nodeMeta = await helpers.findNodeMeta(selector)
      if (!nodeMeta || !nodeMeta.exists) {
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
      const originalValue = nodeMeta.value || nodeMeta.textContent || ''
      
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
          originalValue
        },
        snapshot: { snapshotId, selector, method, originalValue }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert text'
      }
    }
  }
  
  async undo(lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      if (lastRunState && typeof lastRunState === 'object') {
        const state = lastRunState as { snapshotId?: string; selector?: string; originalValue?: string; method?: string }
        if (state.snapshotId) {
          // Restore from snapshot if available
          // Note: restoreSnapshot would need to be added to HelpersAPI
          if (state.selector && state.originalValue && state.method === 'replace') {
            await helpers.applyText(state.selector, state.originalValue, { method: 'replace' })
          }
        }
      }
    } catch (error) {
      console.error('Error undoing insert_text:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'selector',
          label: 'CSS Selector',
          type: 'text',
          required: true,
          placeholder: 'e.g., #input-id, .class-name, input[name="email"]'
        }),
        this.createInputField({
          name: 'text',
          label: 'Text to Insert',
          type: 'textarea',
          required: true,
          placeholder: 'Enter text or select from data points...',
          dataPointTypes: ['text']
        }),
        this.createInputField({
          name: 'method',
          label: 'Insertion Method',
          type: 'select',
          required: false,
          options: [
            { value: 'replace', label: 'Replace' },
            { value: 'append', label: 'Append' },
            { value: 'prepend', label: 'Prepend' },
            { value: 'insert', label: 'Insert at cursor' }
          ]
        }),
        this.createInputField({
          name: 'triggerEvents',
          label: 'Trigger Events',
          type: 'boolean',
          required: false
        }),
        this.createInputField({
          name: 'selectAfter',
          label: 'Select After Insert',
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


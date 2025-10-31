import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class ModifyCSSHandler extends BaseHandler {
  readonly id = 'modify_css'
  readonly name = 'Modify CSS'
  readonly description = 'Inject, remove, or toggle CSS styles on the current page'
  readonly category = 'ui'
  readonly permissions = ['writeDom']
  readonly icon = 'Palette'
  
  readonly inputSchema = {
    type: 'object',
    required: ['cssId', 'cssText'],
    properties: {
      cssId: { 
        type: 'string',
        description: 'Unique identifier for the CSS injection'
      },
      cssText: { 
        type: 'string',
        description: 'CSS styles to inject'
      },
      action: { 
        type: 'string', 
        enum: ['insert', 'remove', 'toggle'],
        default: 'insert',
        description: 'Action to perform'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const { cssId, cssText, action = 'insert' } = input
    
    if (!cssId || typeof cssId !== 'string') {
      return {
        success: false,
        error: 'CSS ID is required and must be a string'
      }
    }
    
    if (action !== 'remove' && (!cssText || typeof cssText !== 'string')) {
      return {
        success: false,
        error: 'CSS text is required when action is not "remove"'
      }
    }
    
    try {
      let currentState = false
      
      switch (action) {
        case 'insert':
          await helpers.insertCSS(cssId, cssText as string)
          currentState = true
          break
          
        case 'remove':
          await helpers.removeCSS(cssId)
          currentState = false
          break
          
        case 'toggle':
          currentState = await helpers.toggleCSS(cssId, cssText as string)
          break
          
        default:
          return {
            success: false,
            error: `Invalid action: ${action}. Must be 'insert', 'remove', or 'toggle'`
          }
      }
      
      return {
        success: true,
        data: { 
          cssId, 
          action, 
          currentState,
          cssText: action === 'insert' || action === 'toggle' ? cssText : undefined
        },
        snapshot: { cssId, action, previousState: !currentState, cssText }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to modify CSS'
      }
    }
  }
  
  async undo(lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      if (!lastRunState || typeof lastRunState !== 'object') return
      
      const state = lastRunState as { cssId?: string; action?: string; previousState?: boolean; cssText?: string }
      const { cssId, action, previousState, cssText } = state
      
      if (!cssId) return
      
      switch (action) {
        case 'insert':
          // Remove the CSS that was inserted
          await helpers.removeCSS(cssId)
          break
          
        case 'remove':
          // Re-insert the CSS that was removed (if we have the original CSS)
          if (cssText) {
            await helpers.insertCSS(cssId, cssText)
          } else {
            console.warn('Cannot undo CSS removal without original CSS text')
          }
          break
          
        case 'toggle':
          // Toggle back to previous state
          if (previousState && cssText) {
            await helpers.insertCSS(cssId, cssText)
          } else {
            await helpers.removeCSS(cssId)
          }
          break
      }
    } catch (error) {
      console.error('Error undoing modify_css:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'cssId',
          label: 'CSS ID',
          type: 'text',
          required: true,
          placeholder: 'Unique identifier for this CSS (e.g., dark-mode, custom-styles)'
        }),
        this.createInputField({
          name: 'action',
          label: 'Action',
          type: 'select',
          required: false,
          options: [
            { value: 'insert', label: 'Insert' },
            { value: 'remove', label: 'Remove' },
            { value: 'toggle', label: 'Toggle' }
          ]
        }),
        this.createInputField({
          name: 'cssText',
          label: 'CSS Styles',
          type: 'textarea',
          required: true,
          placeholder: 'Enter CSS styles...',
          dataPointTypes: ['text']
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


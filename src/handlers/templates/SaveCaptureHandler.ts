import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class SaveCaptureHandler extends BaseHandler {
  readonly id = 'save_capture'
  readonly name = 'Save Capture'
  readonly description = 'Save structured data as a capture for use in future workflows'
  readonly category = 'data'
  readonly permissions = ['storage']
  
  readonly inputSchema = {
    type: 'object',
    required: ['name', 'data'],
    properties: {
      name: { 
        type: 'string',
        description: 'Name for the capture'
      },
      data: { 
        type: 'object',
        description: 'Data to save as capture'
      },
      tags: { 
        type: 'array', 
        items: { type: 'string' },
        default: [],
        description: 'Tags for organizing captures'
      },
      description: { 
        type: 'string',
        description: 'Description of the capture'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const { name, data, tags = [], description } = input
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
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
    
    try {
      // Create capture object
      const capture = {
        id: this.generateId(),
        name: name.trim(),
        data,
        tags: Array.isArray(tags) ? tags : [],
        description: description || '',
        source: typeof window !== 'undefined' ? window.location.href : '',
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
        error: error instanceof Error ? error.message : 'Failed to save capture'
      }
    }
  }
  
  async undo(_lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      // Captures cannot be easily undone as they're stored in storage
      // We could implement a delete function, but for now just notify
      await helpers.notify('Capture has been saved and cannot be undone', 'info')
    } catch (error) {
      console.error('Error undoing save_capture:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'name',
          label: 'Capture Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., job-description-2025'
        }),
        this.createInputField({
          name: 'data',
          label: 'Data to Save',
          type: 'textarea',
          required: true,
          placeholder: 'Enter JSON data or select from data points...',
          dataPointTypes: ['json']
        }),
        this.createInputField({
          name: 'tags',
          label: 'Tags (comma-separated)',
          type: 'text',
          required: false,
          placeholder: 'e.g., job, application, 2025'
        }),
        this.createInputField({
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: 'Optional description...'
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
  
  private generateId(): string {
    return 'capture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}


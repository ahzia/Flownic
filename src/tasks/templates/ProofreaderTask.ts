import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class ProofreaderTask extends BaseTask {
  readonly id = 'proofreader'
  readonly name = 'Proofread Text'
  readonly description = 'Check and correct grammar, spelling, and punctuation using Chrome Proofreader API'
  readonly category = 'text'
  readonly apiType = 'proofreader' as const
  
  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { 
        type: 'string',
        description: 'Text to proofread'
      },
      format: { 
        type: 'string',
        description: 'Output format: markdown or plain-text',
        enum: ['markdown', 'plain-text'],
        default: 'markdown'
      }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      correctedText: { type: 'string' },
      format: { type: 'string' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text, format } = input
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string')
    }
    
    try {
      // Check if Proofreader API is available
      const ProofreaderAPI = (self as any).Proofreader || (window as any).Proofreader
      if (!ProofreaderAPI) {
        throw new Error('Proofreader API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await ProofreaderAPI.availability()
      if (availability === 'unavailable') {
        throw new Error('Proofreader API is not available')
      }
      
      let proofreader
      if (availability === 'downloadable') {
        // Create proofreader with download monitoring
        proofreader = await ProofreaderAPI.create({
          format: (format as 'markdown' | 'plain-text') || 'markdown',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Proofreader model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        proofreader = await ProofreaderAPI.create({
          format: (format as 'markdown' | 'plain-text') || 'markdown'
        })
      }
      
      // Proofread text using Chrome Proofreader API
      const correctedText = await proofreader.proofread(text as string)
      
      return {
        data: {
          correctedText,
          format: format || 'markdown'
        },
        type: 'structured',
        metadata: {
          confidence: 0.95,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_proofreader_api'
        }
      }
    } catch (error) {
      console.error('Chrome Proofreader API failed:', error)
      throw new Error(
        `Proofreading failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Proofreader API is required for this task.`
      )
    }
  }
  
  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'text',
          label: 'Text to Proofread',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select text data point or enter text directly',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'format',
          label: 'Output Format',
          type: 'select',
          required: false,
          placeholder: 'Select format',
          options: [
            { value: 'markdown', label: 'Markdown' },
            { value: 'plain-text', label: 'Plain Text' }
          ]
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


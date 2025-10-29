import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class WriterTask extends BaseTask {
  readonly id = 'writer'
  readonly name = 'Write Content'
  readonly description = 'Generate new content based on context and guidelines using Chrome Writer API'
  readonly category = 'text'
  readonly apiType = 'writer' as const
  
  readonly inputSchema = {
    type: 'object',
    required: ['context', 'guidelines'],
    properties: {
      context: { 
        type: 'string',
        description: 'Context or prompt for generating content'
      },
      guidelines: { 
        type: 'array',
        description: 'Guidelines for content generation (required)',
        items: { type: 'string' },
        minItems: 1
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
      writtenText: { type: 'string' },
      format: { type: 'string' },
      guidelines: { type: 'array', items: { type: 'string' } }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { context: contextText, guidelines, format } = input
    
    if (!contextText || typeof contextText !== 'string') {
      throw new Error('Context is required and must be a string')
    }
    
    if (!guidelines) {
      throw new Error('Guidelines are required for the Writer API')
    }
    
    try {
      // Check if Writer API is available
      const WriterAPI = (self as any).Writer || (window as any).Writer
      if (!WriterAPI) {
        throw new Error('Writer API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await WriterAPI.availability()
      if (availability === 'unavailable') {
        throw new Error('Writer API is not available')
      }
      
      // Convert guidelines to array
      // Guidelines can come as a string (from textarea) or array
      let guidelinesArray: string[] = []
      if (guidelines) {
        if (Array.isArray(guidelines)) {
          guidelinesArray = guidelines.filter(g => typeof g === 'string' && g.trim().length > 0)
        } else if (typeof guidelines === 'string') {
          // Split by newlines and filter empty lines
          guidelinesArray = guidelines
            .split('\n')
            .map(g => g.trim())
            .filter(g => g.length > 0)
        }
      }
      
      if (guidelinesArray.length === 0) {
        throw new Error('At least one guideline is required for the Writer API')
      }
      
      let writer
      if (availability === 'downloadable') {
        // Create writer with download monitoring
        writer = await WriterAPI.create({
          guidelines: guidelinesArray,
          format: (format as 'markdown' | 'plain-text') || 'markdown',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Writer model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        writer = await WriterAPI.create({
          guidelines: guidelinesArray,
          format: (format as 'markdown' | 'plain-text') || 'markdown'
        })
      }
      
      // Write content using Chrome Writer API
      // Guidelines can be passed to write() or use the ones from create()
      const writtenText = await writer.write(contextText as string, guidelinesArray)
      
      return {
        data: {
          writtenText,
          format: format || 'markdown',
          guidelines: guidelinesArray
        },
        type: 'structured',
        metadata: {
          confidence: 0.95,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_writer_api'
        }
      }
    } catch (error) {
      console.error('Chrome Writer API failed:', error)
      throw new Error(
        `Writing failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Writer API is required for this task.`
      )
    }
  }
  
  protected getTaskSpecificMockDefaults(key: string): any {
    switch (key) {
      case 'writtenText':
        return 'This is the newly generated content based on the provided context and guidelines. The actual content will be generated using the Chrome Writer API when the workflow is executed.'
      case 'format':
        return 'markdown'
      case 'guidelines':
        return []
      default:
        return undefined
    }
  }

  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'context',
          label: 'Context or Prompt',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Enter context or prompt for content generation',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'guidelines',
          label: 'Content Guidelines',
          type: 'textarea',
          required: true,
          placeholder: 'Enter guidelines for content generation, one per line (e.g., "write in a professional tone", "keep it under 200 words", "use simple language")'
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


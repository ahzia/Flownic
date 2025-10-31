import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class RewriterTask extends BaseTask {
  readonly id = 'rewriter'
  readonly name = 'Rewrite Text'
  readonly description = 'Revise and restructure text according to guidelines using Chrome Rewriter API'
  readonly category = 'text'
  readonly apiType = 'rewriter' as const
  readonly icon = 'RefreshCw'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { 
        type: 'string',
        description: 'Text to rewrite'
      },
      guidelines: { 
        type: 'array',
        description: 'Guidelines for rewriting (e.g., "make it more formal", "simplify the language")',
        items: { type: 'string' }
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
      rewrittenText: { type: 'string' },
      format: { type: 'string' },
      guidelines: { type: 'array', items: { type: 'string' } }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text, guidelines, format } = input
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string')
    }
    
    try {
      // Check if Rewriter API is available
      const RewriterAPI = (self as any).Rewriter || (window as any).Rewriter
      if (!RewriterAPI) {
        throw new Error('Rewriter API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await RewriterAPI.availability()
      if (availability === 'unavailable') {
        throw new Error('Rewriter API is not available')
      }
      
      // Convert guidelines to array if it's a string or undefined
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
      
      let rewriter
      if (availability === 'downloadable') {
        // Create rewriter with download monitoring
        rewriter = await RewriterAPI.create({
          guidelines: guidelinesArray,
          format: (format as 'markdown' | 'plain-text') || 'markdown',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Rewriter model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        rewriter = await RewriterAPI.create({
          guidelines: guidelinesArray,
          format: (format as 'markdown' | 'plain-text') || 'markdown'
        })
      }
      
      // Rewrite text using Chrome Rewriter API
      // If guidelines are provided to rewrite(), use them; otherwise use the ones from create()
      const rewrittenText = await rewriter.rewrite(text as string, guidelinesArray.length > 0 ? guidelinesArray : undefined)
      
      return {
        data: {
          rewrittenText,
          format: format || 'markdown',
          guidelines: guidelinesArray
        },
        type: 'structured',
        metadata: {
          confidence: 0.95,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_rewriter_api'
        }
      }
    } catch (error) {
      console.error('Chrome Rewriter API failed:', error)
      throw new Error(
        `Rewriting failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Rewriter API is required for this task.`
      )
    }
  }
  
  protected getTaskSpecificMockDefaults(key: string): any {
    switch (key) {
      case 'rewrittenText':
        return 'This is the rewritten version of the text following the specified guidelines. The actual rewriting will be generated using the Chrome Rewriter API when the workflow is executed.'
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
          name: 'text',
          label: 'Text to Rewrite',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select text data point or enter text directly',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'guidelines',
          label: 'Rewriting Guidelines (Optional)',
          type: 'textarea',
          required: false,
          placeholder: 'Enter guidelines, one per line (e.g., "make it more formal", "simplify the language", "add more detail")'
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


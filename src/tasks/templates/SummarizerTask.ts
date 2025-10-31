import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class SummarizerTask extends BaseTask {
  readonly id = 'summarizer'
  readonly name = 'Summarize Text'
  readonly description = 'Generate concise summaries of text using Chrome Summarizer API'
  readonly category = 'text'
  readonly apiType = 'summarizer' as const
  readonly icon = 'FileText'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { 
        type: 'string',
        description: 'Text to summarize'
      },
      type: { 
        type: 'string',
        description: 'Type of summary: key-points, tldr, teaser, or headline',
        enum: ['key-points', 'tldr', 'teaser', 'headline'],
        default: 'key-points'
      },
      format: { 
        type: 'string',
        description: 'Output format: markdown or plain-text',
        enum: ['markdown', 'plain-text'],
        default: 'markdown'
      },
      length: { 
        type: 'string',
        description: 'Summary length: short, medium, or long',
        enum: ['short', 'medium', 'long'],
        default: 'medium'
      },
      context: { 
        type: 'string',
        description: 'Additional context to help with summarization (optional)'
      }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      type: { type: 'string' },
      format: { type: 'string' },
      length: { type: 'string' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text, type, format, length, context: contextText } = input
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string')
    }
    
    try {
      // Check if Summarizer API is available
      const SummarizerAPI = (self as any).Summarizer || (window as any).Summarizer
      if (!SummarizerAPI) {
        throw new Error('Summarizer API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await SummarizerAPI.availability()
      if (availability === 'unavailable') {
        throw new Error('Summarizer API is not available')
      }
      
      let summarizer
      if (availability === 'downloadable') {
        // Create summarizer with download monitoring
        summarizer = await SummarizerAPI.create({
          type: (type as 'key-points' | 'tldr' | 'teaser' | 'headline') || 'key-points',
          format: (format as 'markdown' | 'plain-text') || 'markdown',
          length: (length as 'short' | 'medium' | 'long') || 'medium',
          sharedContext: contextText as string,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Summarizer model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        summarizer = await SummarizerAPI.create({
          type: (type as 'key-points' | 'tldr' | 'teaser' | 'headline') || 'key-points',
          format: (format as 'markdown' | 'plain-text') || 'markdown',
          length: (length as 'short' | 'medium' | 'long') || 'medium',
          sharedContext: contextText as string
        })
      }
      
      // Summarize text using Chrome Summarizer API
      const summaryOptions = contextText ? { context: contextText as string } : undefined
      const summary = await summarizer.summarize(text as string, summaryOptions)
      
      return {
        data: {
          summary,
          type: type || 'key-points',
          format: format || 'markdown',
          length: length || 'medium'
        },
        type: 'structured',
        metadata: {
          confidence: 0.95,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_summarizer_api'
        }
      }
    } catch (error) {
      console.error('Chrome Summarizer API failed:', error)
      throw new Error(
        `Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Summarizer API is required for this task.`
      )
    }
  }
  
  protected getTaskSpecificMockDefaults(key: string): any {
    switch (key) {
      case 'summary':
        return 'This is a concise summary of the provided content, highlighting the key points and main ideas. The actual summary will be generated using the Chrome Summarizer API when the workflow is executed.'
      case 'type':
        return 'key-points'
      case 'format':
        return 'markdown'
      case 'length':
        return 'medium'
      default:
        return undefined
    }
  }

  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'text',
          label: 'Text to Summarize',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select text data point or enter text directly',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'type',
          label: 'Summary Type',
          type: 'select',
          required: false,
          placeholder: 'Select summary type',
          options: [
            { value: 'key-points', label: 'Key Points (bullet points)' },
            { value: 'tldr', label: 'TLDR (quick overview)' },
            { value: 'teaser', label: 'Teaser (intriguing summary)' },
            { value: 'headline', label: 'Headline (single sentence)' }
          ]
        }),
        this.createInputField({
          name: 'length',
          label: 'Summary Length',
          type: 'select',
          required: false,
          placeholder: 'Select length',
          options: [
            { value: 'short', label: 'Short' },
            { value: 'medium', label: 'Medium' },
            { value: 'long', label: 'Long' }
          ]
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
        }),
        this.createInputField({
          name: 'context',
          label: 'Additional Context (Optional)',
          type: 'textarea',
          required: false,
          placeholder: 'Provide context to help with summarization (e.g., "This is a scientific article")'
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


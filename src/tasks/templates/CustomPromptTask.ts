import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class CustomPromptTask extends BaseTask {
  readonly id = 'custom_prompt'
  readonly name = 'Custom Prompt'
  readonly description = 'Execute a custom prompt using the Chrome Prompt API'
  readonly category = 'custom'
  readonly apiType = 'prompt'
  
  readonly inputSchema = {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: { 
        type: 'string',
        description: 'Custom prompt text to send to AI'
      },
      context: { 
        type: 'string',
        description: 'Additional context for the prompt (optional)'
      },
      maxTokens: { 
        type: 'number',
        description: 'Maximum number of tokens in response (optional)'
      }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      response: { type: 'string' },
      tokens: { type: 'number' },
      confidence: { type: 'number' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { prompt, context: additionalContext } = input
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt input is required and must be a string')
    }
    
    // Build the full prompt with context
    let fullPrompt = prompt
    if (additionalContext && typeof additionalContext === 'string') {
      fullPrompt = `Context: ${additionalContext}\n\nPrompt: ${prompt}`
    }
    
    try {
      // Check if Chrome LanguageModel API is available
      if (typeof (self as any).LanguageModel === 'undefined') {
        throw new Error('Chrome LanguageModel API is not available in this browser')
      }
      
      // Check model availability
      const availability = await (self as any).LanguageModel.availability()
      if (availability === 'unavailable') {
        throw new Error('Chrome LanguageModel is not available on this device')
      }
      
      // Create a new session
      const session = await (self as any).LanguageModel.create()
      
      // Call Chrome built-in Prompt API
      const response = await session.prompt(fullPrompt)
      
      if (!response) {
        throw new Error('Chrome Prompt API returned null response')
      }
      
      // Clean up the session
      session.destroy()
      
      return {
        data: {
          response,
          tokens: this.estimateTokens(response),
          confidence: 0.9
        },
        type: 'text',
        metadata: {
          confidence: 0.9,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_prompt_api'
        }
      }
    } catch (error) {
      // Fallback to the existing aiAdapter if Chrome API fails
      console.warn('Chrome Prompt API failed, using fallback method:', error)
      
      // Check if AI adapter is available
      if (!context.aiAdapter) {
        throw new Error(
          'Chrome Prompt API is not available and no fallback AI adapter is configured. ' +
          'Please ensure Chrome Prompt API is enabled in your browser settings or configure a fallback AI service.'
        )
      }
      
      try {
        const response = await context.aiAdapter.prompt(fullPrompt)
        
        return {
          data: {
            response,
            tokens: this.estimateTokens(response),
            confidence: 0.8
          },
          type: 'text',
          metadata: {
            confidence: 0.8,
            processingTime: Date.now() - context.startTime,
            source: 'fallback_prompt_api'
          }
        }
      } catch (fallbackError) {
        throw new Error(`Custom prompt execution failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`)
      }
    }
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
  
  protected getTaskSpecificMockDefaults(key: string): any {
    switch (key) {
      case 'response':
        return 'This is a mock response from the AI based on your custom prompt. The actual response will be generated using the Chrome Prompt API when the workflow is executed.'
      case 'tokens':
        return 150
      case 'confidence':
        return 0.85
      default:
        return undefined
    }
  }

  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'prompt',
          label: 'Prompt Text',
          type: 'textarea',
          required: true,
          placeholder: 'Enter your custom prompt here...',
          validation: {
            minLength: 10,
            maxLength: 2000
          }
        }),
        this.createInputField({
          name: 'context',
          label: 'Additional Context',
          type: 'data_point_selector',
          required: false,
          placeholder: 'Select context data point or enter additional context',
          dataPointTypes: ['text', 'html', 'json']
        }),
        this.createInputField({
          name: 'maxTokens',
          label: 'Max Tokens (optional)',
          type: 'number',
          required: false,
          placeholder: 'Leave empty for default'
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

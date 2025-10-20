import { ActionPlan } from '@common/types'
import { validateActionPlan } from '@common/schemas'

// Chrome AI API interface - this will be available in Chrome with built-in AI
declare global {
  interface Window {
    ai?: {
      prompt: (input: string, context?: string) => Promise<string>
      writer: (input: string, context?: string) => Promise<string>
      proofreader: (input: string, context?: string) => Promise<string>
      summarizer: (input: string, context?: string) => Promise<string>
      translator: (input: string, targetLanguage: string) => Promise<string>
      rewriter: (input: string, context?: string) => Promise<string>
    }
  }
}

export class AIAdapter {
  private isAvailable: boolean = false
  private fallbackEnabled: boolean = false

  constructor() {
    this.checkAvailability()
  }

  private async checkAvailability(): Promise<void> {
    try {
      // Check if Chrome's built-in AI APIs are available
      if (typeof window !== 'undefined' && window.ai) {
        this.isAvailable = true
        console.log('Chrome built-in AI APIs detected')
      } else {
        console.warn('Chrome built-in AI APIs not available')
        this.isAvailable = false
      }
    } catch (error) {
      console.error('Error checking AI API availability:', error)
      this.isAvailable = false
    }
  }

  public isAIAvailable(): boolean {
    return this.isAvailable
  }

  public enableFallback(): void {
    this.fallbackEnabled = true
  }

  public disableFallback(): void {
    this.fallbackEnabled = false
  }

  // Prompt API - Generate dynamic user prompts and structured outputs
  public async prompt(input: string, context?: string): Promise<string> {
    if (this.isAvailable && window.ai?.prompt) {
      try {
        return await window.ai.prompt(input, context)
      } catch (error) {
        console.error('Prompt API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackPrompt(input, context)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackPrompt(input, context)
    }
    
    throw new Error('Prompt API not available and fallback disabled')
  }

  // Writer API - Create original and engaging text
  public async writer(input: string, context?: string): Promise<string> {
    if (this.isAvailable && window.ai?.writer) {
      try {
        return await window.ai.writer(input, context)
      } catch (error) {
        console.error('Writer API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackWriter(input, context)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackWriter(input, context)
    }
    
    throw new Error('Writer API not available and fallback disabled')
  }

  // Proofreader API - Correct grammar mistakes
  public async proofreader(input: string, context?: string): Promise<string> {
    if (this.isAvailable && window.ai?.proofreader) {
      try {
        return await window.ai.proofreader(input, context)
      } catch (error) {
        console.error('Proofreader API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackProofreader(input, context)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackProofreader(input, context)
    }
    
    throw new Error('Proofreader API not available and fallback disabled')
  }

  // Summarizer API - Distill complex information into clear insights
  public async summarizer(input: string, context?: string): Promise<string> {
    if (this.isAvailable && window.ai?.summarizer) {
      try {
        return await window.ai.summarizer(input, context)
      } catch (error) {
        console.error('Summarizer API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackSummarizer(input, context)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackSummarizer(input, context)
    }
    
    throw new Error('Summarizer API not available and fallback disabled')
  }

  // Translator API - Add multilingual capabilities
  public async translator(input: string, targetLanguage: string): Promise<string> {
    if (this.isAvailable && window.ai?.translator) {
      try {
        return await window.ai.translator(input, targetLanguage)
      } catch (error) {
        console.error('Translator API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackTranslator(input, targetLanguage)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackTranslator(input, targetLanguage)
    }
    
    throw new Error('Translator API not available and fallback disabled')
  }

  // Rewriter API - Improve content with alternative options
  public async rewriter(input: string, context?: string): Promise<string> {
    if (this.isAvailable && window.ai?.rewriter) {
      try {
        return await window.ai.rewriter(input, context)
      } catch (error) {
        console.error('Rewriter API error:', error)
        if (this.fallbackEnabled) {
          return this.fallbackRewriter(input, context)
        }
        throw error
      }
    }
    
    if (this.fallbackEnabled) {
      return this.fallbackRewriter(input, context)
    }
    
    throw new Error('Rewriter API not available and fallback disabled')
  }

  // Generate ActionPlan using multiple APIs in sequence
  public async generateActionPlan(
    userPrompt: string,
    context: {
      selectedText?: string
      pageContent?: string
      kbContent?: string
      lastCapture?: unknown
    }
  ): Promise<ActionPlan> {
    try {
      // Step 1: Analyze the prompt and context using Prompt API
      const analysisPrompt = `
        Analyze this user request and determine what actions should be taken:
        
        User Request: "${userPrompt}"
        
        Context:
        - Selected Text: ${context.selectedText || 'None'}
        - Page Content: ${context.pageContent ? 'Available' : 'None'}
        - KB Content: ${context.kbContent ? 'Available' : 'None'}
        - Last Capture: ${context.lastCapture ? 'Available' : 'None'}
        
        Return a JSON ActionPlan with the following structure:
        {
          "type": "ACTION_PLAN",
          "actions": [
            {
              "op": "ACTION_TYPE",
              "params": { ... }
            }
          ],
          "metadata": {
            "confidence": 0.95,
            "timestamp": ${Date.now()},
            "source": "promptflow"
          }
        }
        
        Available actions: SHOW_MODAL, INSERT_TEXT, MODIFY_CSS, PARSE_TABLE_TO_CSV, 
        DOWNLOAD_FILE, SAVE_CAPTURE, FILL_FORM, CLICK_SELECTOR, REMOVE_NODE, 
        INJECT_UI_COMPONENT, WAIT_FOR_SELECTOR, NOOP
      `

      const analysis = await this.prompt(analysisPrompt)
      
      // Step 2: Parse and validate the ActionPlan
      let actionPlan: ActionPlan
      try {
        const parsed = JSON.parse(analysis)
        if (validateActionPlan(parsed)) {
          actionPlan = parsed
        } else {
          throw new Error('Invalid ActionPlan structure')
        }
      } catch (parseError) {
        console.error('Failed to parse ActionPlan:', parseError)
        // Fallback: create a simple SHOW_MODAL action
        actionPlan = {
          type: 'ACTION_PLAN',
          actions: [{
            op: 'SHOW_MODAL',
            params: {
              title: 'AI Response',
              content: analysis,
              size: 'medium'
            }
          }],
          metadata: {
            confidence: 0.7,
            timestamp: Date.now(),
            source: 'promptflow-fallback'
          }
        }
      }

      return actionPlan

    } catch (error) {
      console.error('Error generating ActionPlan:', error)
      
      // Ultimate fallback
      return {
        type: 'ACTION_PLAN',
        actions: [{
          op: 'SHOW_MODAL',
          params: {
            title: 'Error',
            content: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`,
            size: 'small'
          }
        }],
        metadata: {
          confidence: 0.0,
          timestamp: Date.now(),
          source: 'promptflow-error'
        }
      }
    }
  }

  // Fallback implementations (for demo/development)
  private fallbackPrompt(input: string, context?: string): string {
    return `[FALLBACK] Prompt: ${input}${context ? `\nContext: ${context}` : ''}`
  }

  private fallbackWriter(input: string, context?: string): string {
    return `[FALLBACK] Generated content for: ${input}${context ? `\nContext: ${context}` : ''}`
  }

  private fallbackProofreader(input: string, context?: string): string {
    return `[FALLBACK] Proofread: ${input}${context ? `\nContext: ${context}` : ''}`
  }

  private fallbackSummarizer(input: string, context?: string): string {
    return `[FALLBACK] Summary: ${input.substring(0, 200)}...${context ? `\nContext: ${context}` : ''}`
  }

  private fallbackTranslator(input: string, targetLanguage: string): string {
    return `[FALLBACK] Translated to ${targetLanguage}: ${input}`
  }

  private fallbackRewriter(input: string, context?: string): string {
    return `[FALLBACK] Rewritten: ${input}${context ? `\nContext: ${context}` : ''}`
  }
}

// Singleton instance
export const aiAdapter = new AIAdapter()

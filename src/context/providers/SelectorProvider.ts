import { ContextProvider, DataPoint } from '@common/types'

export class SelectorProvider implements ContextProvider {
  readonly id = 'selector_content'
  readonly name = 'Selector Content'
  readonly description = 'Content from a specific CSS selector'
  readonly outputType = 'html'
  
  constructor(private selector: string) {
    if (!selector || typeof selector !== 'string') {
      throw new Error('Selector must be a non-empty string')
    }
  }
  
  async gather(): Promise<DataPoint> {
    try {
      const elements = document.querySelectorAll(this.selector)
      
      if (elements.length === 0) {
        throw new Error(`No elements found matching selector: ${this.selector}`)
      }
      
      // If multiple elements, combine their HTML
      const htmlContent = Array.from(elements)
        .map(el => el.outerHTML)
        .join('\n')
      
      return {
        id: `selector_content_${Date.now()}`,
        name: `Content from ${this.selector}`,
        type: 'context',
        value: htmlContent,
        source: 'selector_provider',
        timestamp: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to extract content by selector: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  validate(): boolean {
    // Check if we're in a valid DOM environment and selector is valid
    if (typeof document === 'undefined') {
      return false
    }
    
    try {
      // Test if the selector is valid
      document.querySelector(this.selector)
      return true
    } catch {
      return false
    }
  }
  
  // Static method to create provider with selector
  static create(selector: string): SelectorProvider {
    return new SelectorProvider(selector)
  }
}

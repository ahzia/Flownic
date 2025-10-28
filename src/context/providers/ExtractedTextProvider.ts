import { ContextProvider, DataPoint } from '@common/types'

export class ExtractedTextProvider implements ContextProvider {
  readonly id = 'extracted_text'
  readonly name = 'Extracted Text'
  readonly description = 'Plain text extracted from the page (no HTML tags)'
  readonly outputType = 'text'
  
  async gather(): Promise<DataPoint> {
    try {
      // Extract plain text from the page, excluding script and style elements
      const body = document.body || document.documentElement
      const textContent = this.extractTextContent(body)
      
      if (!textContent.trim()) {
        throw new Error('No text content found on the page')
      }
      
      return {
        id: `extracted_text_${Date.now()}`,
        name: 'Extracted Text',
        type: 'context',
        value: textContent,
        source: 'extracted_text_provider',
        timestamp: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to extract text content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  private extractTextContent(element: Element): string {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as Element
    
    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style, noscript')
    scripts.forEach(el => el.remove())
    
    // Get text content and clean it up
    let text = clone.textContent || ''
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim()
    
    return text
  }
  
  validate(): boolean {
    // Check if we're in a valid DOM environment
    return typeof document !== 'undefined' && 
           (document.body !== null || document.documentElement !== null)
  }
}

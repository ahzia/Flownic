import { ContextProvider, DataPoint } from '@common/types'

export class SelectedTextProvider implements ContextProvider {
  readonly id = 'selected_text'
  readonly name = 'Selected Text'
  readonly description = 'Currently selected text on the page'
  readonly outputType = 'text'
  
  async gather(): Promise<DataPoint> {
    try {
      const selection = window.getSelection()
      
      if (!selection || selection.rangeCount === 0) {
        throw new Error('No text is currently selected')
      }
      
      const selectedText = selection.toString().trim()
      
      if (!selectedText) {
        throw new Error('No text is currently selected')
      }
      
      return {
        id: `selected_text_${Date.now()}`,
        name: 'Selected Text',
        type: 'context',
        value: selectedText,
        source: 'selected_text_provider',
        timestamp: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to extract selected text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  validate(): boolean {
    // Check if we're in a valid DOM environment and have selection API
    return typeof window !== 'undefined' && 
           typeof window.getSelection === 'function' &&
           typeof document !== 'undefined'
  }
}

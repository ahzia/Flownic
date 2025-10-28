import { ContextProvider, DataPoint } from '@common/types'

export class PageContentProvider implements ContextProvider {
  readonly id = 'page_content'
  readonly name = 'Page Content'
  readonly description = 'Full HTML content of the current page'
  readonly outputType = 'html'
  
  async gather(): Promise<DataPoint> {
    try {
      // Get the full HTML content of the page
      const htmlContent = document.documentElement.outerHTML
      
      return {
        id: `page_content_${Date.now()}`,
        name: 'Page Content',
        type: 'context',
        value: htmlContent,
        source: 'page_content_provider',
        timestamp: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to extract page content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  validate(): boolean {
    // Check if we're in a valid DOM environment
    return typeof document !== 'undefined' && document.documentElement !== null
  }
}

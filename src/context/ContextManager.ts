import { DataPointManager } from '@core/DataPointManager'
import { DataPoint } from '@common/types'
import { PageContentProvider } from './providers/PageContentProvider'
import { SelectedTextProvider } from './providers/SelectedTextProvider'
import { ExtractedTextProvider } from './providers/ExtractedTextProvider'
import { SelectorProvider } from './providers/SelectorProvider'

export class ContextManager {
  private dataPointManager: DataPointManager
  
  constructor() {
    this.dataPointManager = new DataPointManager()
    this.initializeProviders()
  }
  
  private initializeProviders(): void {
    // Add default context providers
    this.dataPointManager.addContextProvider(new PageContentProvider())
    this.dataPointManager.addContextProvider(new SelectedTextProvider())
    this.dataPointManager.addContextProvider(new ExtractedTextProvider())
  }
  
  // Get the data point manager instance
  getDataPointManager(): DataPointManager {
    return this.dataPointManager
  }
  
  // Convenience methods for common context gathering
  async gatherPageContent(): Promise<DataPoint> {
    return await this.dataPointManager.extractPageContent({
      includeHtml: true,
      includeText: true
    })
  }
  
  async gatherSelectedText(): Promise<DataPoint> {
    return await this.dataPointManager.extractSelectedText()
  }
  
  async gatherExtractedText(): Promise<DataPoint> {
    const provider = new ExtractedTextProvider()
    return await provider.gather()
  }
  
  async gatherBySelector(selector: string): Promise<DataPoint> {
    const provider = new SelectorProvider(selector)
    this.dataPointManager.addContextProvider(provider)
    return await this.dataPointManager.extractBySelector(selector)
  }
  
  // Gather multiple context types at once
  async gatherContext(contextTypes: string[]): Promise<DataPoint[]> {
    return await this.dataPointManager.gatherContext(contextTypes)
  }
  
  // Get all available context types
  getAvailableContextTypes(): string[] {
    return [
      'page_content',
      'selected_text', 
      'extracted_text'
    ]
  }
  
  // Create a custom selector provider
  createSelectorProvider(selector: string): SelectorProvider {
    return SelectorProvider.create(selector)
  }
}

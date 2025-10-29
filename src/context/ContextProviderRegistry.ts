import { ExtractedTextProvider } from './providers/ExtractedTextProvider'
import { PageContentProvider } from './providers/PageContentProvider'
import { SelectedTextProvider } from './providers/SelectedTextProvider'

export interface ContextProviderMeta {
  id: string
  name: string
  description: string
  outputType: 'text' | 'html' | 'json'
}

export class ContextProviderRegistry {
  private providers = [
    new SelectedTextProvider(),
    new PageContentProvider(),
    new ExtractedTextProvider()
  ]

  getAllMeta(): ContextProviderMeta[] {
    return this.providers.map(p => ({
      id: (p as any).id,
      name: (p as any).name,
      description: (p as any).description,
      outputType: (p as any).outputType
    }))
  }
}




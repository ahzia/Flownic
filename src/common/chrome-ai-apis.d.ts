// TypeScript declarations for Chrome built-in AI APIs

declare global {
  interface Window {
    LanguageDetector: typeof LanguageDetector
    Translator: typeof Translator
    Summarizer: typeof Summarizer
    Proofreader: typeof Proofreader
    Rewriter: typeof Rewriter
    Writer: typeof Writer
    prompt: (text: string) => Promise<string | null>
  }
  
  interface LanguageDetector {
    availability(): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      monitor?: (monitor: EventTarget) => void
    }): Promise<LanguageDetectorInstance>
  }
  
  interface LanguageDetectorInstance {
    detect(text: string): Promise<Array<{
      detectedLanguage: string
      confidence: number
    }>>
  }
  
  interface Translator {
    availability(options: {
      sourceLanguage: string
      targetLanguage: string
    }): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      sourceLanguage?: string
      targetLanguage: string
      monitor?: (monitor: EventTarget) => void
    }): Promise<TranslatorInstance>
  }
  
  interface TranslatorInstance {
    translate(text: string): Promise<string>
  }
  
  interface Summarizer {
    availability(): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      type?: 'key-points' | 'tldr' | 'teaser' | 'headline'
      format?: 'markdown' | 'plain-text'
      length?: 'short' | 'medium' | 'long'
      sharedContext?: string
      expectedInputLanguages?: string[]
      outputLanguage?: string
      expectedContextLanguages?: string[]
      monitor?: (monitor: EventTarget) => void
    }): Promise<SummarizerInstance>
  }
  
  interface SummarizerInstance {
    summarize(text: string, options?: { context?: string }): Promise<string>
    summarizeStreaming(text: string, options?: { context?: string }): AsyncIterable<string>
  }
  
  interface Proofreader {
    availability(): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      format?: 'markdown' | 'plain-text'
      monitor?: (monitor: EventTarget) => void
    }): Promise<ProofreaderInstance>
  }
  
  interface ProofreaderInstance {
    proofread(text: string): Promise<string>
    proofreadStreaming(text: string): AsyncIterable<string>
  }
  
  interface Rewriter {
    availability(): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      guidelines?: string[]
      format?: 'markdown' | 'plain-text'
      monitor?: (monitor: EventTarget) => void
    }): Promise<RewriterInstance>
  }
  
  interface RewriterInstance {
    rewrite(text: string, guidelines?: string[]): Promise<string>
    rewriteStreaming(text: string, guidelines?: string[]): AsyncIterable<string>
  }
  
  interface Writer {
    availability(): Promise<'available' | 'downloadable' | 'unavailable'>
    create(options?: {
      guidelines: string[]
      format?: 'markdown' | 'plain-text'
      monitor?: (monitor: EventTarget) => void
    }): Promise<WriterInstance>
  }
  
  interface WriterInstance {
    write(context: string, guidelines?: string[]): Promise<string>
    writeStreaming(context: string, guidelines?: string[]): AsyncIterable<string>
  }
  
  // Make APIs available globally
  const LanguageDetector: LanguageDetector
  const Translator: Translator
  const Summarizer: Summarizer
  const Proofreader: Proofreader
  const Rewriter: Rewriter
  const Writer: Writer
}

export {}

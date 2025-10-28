// TypeScript declarations for Chrome built-in AI APIs

declare global {
  interface Window {
    LanguageDetector: typeof LanguageDetector
    Translator: typeof Translator
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
  
  // Make LanguageDetector and Translator available globally
  const LanguageDetector: LanguageDetector
  const Translator: Translator
}

export {}

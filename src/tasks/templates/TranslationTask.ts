import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class TranslationTask extends BaseTask {
  readonly id = 'translation'
  readonly name = 'Translate Text'
  readonly description = 'Translate text from one language to another using Chrome Translation API'
  readonly category = 'language'
  readonly apiType = 'translation'
  readonly icon = 'Languages'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text', 'targetLanguage'],
    properties: {
      text: { 
        type: 'string',
        description: 'Text to translate'
      },
      sourceLanguage: { 
        type: 'string',
        description: 'Source language (optional, will auto-detect if not provided)'
      },
      targetLanguage: { 
        type: 'string',
        description: 'Target language for translation'
      }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      translatedText: { type: 'string' },
      sourceLanguage: { type: 'string' },
      targetLanguage: { type: 'string' },
      confidence: { type: 'number' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text, sourceLanguage, targetLanguage } = input
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string')
    }
    
    // Helper function to return original text in translation task format
    const returnOriginalText = (reason: string): TaskOutput => {
      console.warn(`Translation skipped: ${reason}. Returning original text.`)
      const sourceLang = (sourceLanguage as string) || ''
      const targetLang = (targetLanguage as string) || ''
      
      return {
        data: {
          translatedText: text as string,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          confidence: 1.0 // Full confidence since we're returning original
        },
        type: 'structured',
        metadata: {
          confidence: 1.0,
          processingTime: Date.now() - context.startTime,
          source: 'fallback_no_translation'
        }
      }
    }
    
    // If target language is not provided, return original text
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return returnOriginalText('Target language is required but not provided')
    }
    
    // Determine source and target languages
    const sourceLang = (sourceLanguage as string) || ''
    const targetLang = targetLanguage as string
    
    // If source and target languages are the same, return original text
    if (sourceLang && sourceLang === targetLang) {
      return returnOriginalText(`Source language (${sourceLang}) and target language (${targetLang}) are the same`)
    }
    
    try {
      // Check if Translator API is available (check both self and global)
      const TranslatorAPI = (self as any).Translator || (window as any).Translator
      if (!TranslatorAPI) {
        console.error('Translator API is not available in this browser')
        return returnOriginalText('Translator API is not available')
      }
      
      // For auto-detection, we can't check availability without a source language
      // So we'll try to create the translator directly and handle errors
      let translator
      let availability: 'available' | 'downloadable' | 'unavailable' = 'available'
      
      if (sourceLang) {
        // Check availability for specific language pair
        try {
          availability = await TranslatorAPI.availability({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang
          })
        } catch (err) {
          console.warn('Failed to check availability, attempting to create translator:', err)
          availability = 'available' // Assume available and try to create
        }
      }
      
      if (availability === 'unavailable') {
        console.error(`Translation model not available for ${sourceLang || 'auto'} -> ${targetLang}`)
        return returnOriginalText(`Translation model not available for ${sourceLang || 'auto'} -> ${targetLang}`)
      }
      
      // Create translator with appropriate options
      if (availability === 'downloadable') {
        // Create translator with download monitoring
        const createOpts: any = { targetLanguage: targetLang, monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            console.log(`Translation model downloaded ${e.loaded * 100}%`)
          })
        } }
        if (sourceLang) createOpts.sourceLanguage = sourceLang
        translator = await TranslatorAPI.create(createOpts)
      } else {
        // Model is already available
        const createOpts: any = { targetLanguage: targetLang }
        if (sourceLang) createOpts.sourceLanguage = sourceLang
        translator = await TranslatorAPI.create(createOpts)
      }
      
      // Translate text using Chrome Translator API
      // API signature: translate(text: string)
      const translatedText = await translator.translate(text as string)
      
      return {
        data: {
          translatedText,
          sourceLanguage: sourceLang || '',
          targetLanguage: targetLang,
          confidence: 0.95
        },
        type: 'structured',
        metadata: {
          confidence: 0.95,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_translator_api'
        }
      }
    } catch (error) {
      // Log error but return original text instead of throwing
      console.error('Chrome Translator API failed:', error)
      return returnOriginalText(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'text',
          label: 'Text to Translate',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select text data point or enter text directly',
          dataPointTypes: ['text', 'html']
        }),
        this.createInputField({
          name: 'sourceLanguage',
          label: 'Source Language',
          type: 'language_selector',
          required: false,
          placeholder: 'Select source language or leave empty',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'it', label: 'Italian' },
            { value: 'pt', label: 'Portuguese' },
            { value: 'ru', label: 'Russian' },
            { value: 'ja', label: 'Japanese' },
            { value: 'ko', label: 'Korean' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ar', label: 'Arabic' }
          ]
        }),
        this.createInputField({
          name: 'targetLanguage',
          label: 'Target Language',
          type: 'language_selector',
          required: true,
          placeholder: 'Select target language',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'it', label: 'Italian' },
            { value: 'pt', label: 'Portuguese' },
            { value: 'ru', label: 'Russian' },
            { value: 'ja', label: 'Japanese' },
            { value: 'ko', label: 'Korean' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ar', label: 'Arabic' }
          ]
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

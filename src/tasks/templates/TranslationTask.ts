import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class TranslationTask extends BaseTask {
  readonly id = 'translation'
  readonly name = 'Translate Text'
  readonly description = 'Translate text from one language to another using Chrome Translation API'
  readonly category = 'language'
  readonly apiType = 'translation'
  
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
    
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      throw new Error('Target language is required')
    }
    
    try {
      // Check if Translator API is available (check both self and global)
      const TranslatorAPI = (self as any).Translator || (window as any).Translator
      if (!TranslatorAPI) {
        throw new Error('Translator API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await TranslatorAPI.availability()
      if (availability === 'unavailable') {
        throw new Error('Translator API is not available')
      }
      
      let translator
      if (availability === 'downloadable') {
        // Create translator with download monitoring
        translator = await TranslatorAPI.create({
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Translation model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        translator = await TranslatorAPI.create()
      }
      
      // Translate text using Chrome Translator API
      // API signature: translate(text: string, targetLanguage: string, sourceLanguage?: string)
      const sourceLang = (sourceLanguage as string) || 'auto'
      const translatedText = await translator.translate(
        text as string,
        targetLanguage as string,
        sourceLang === 'auto' ? undefined : sourceLang
      )
      
      return {
        data: {
          translatedText,
          sourceLanguage: sourceLanguage || 'auto',
          targetLanguage,
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
      // Fallback to the existing aiAdapter if Chrome API fails
      console.warn('Chrome Translator API failed, using fallback method:', error)
      try {
        const translatedText = await context.aiAdapter.translator(
          text as string,
          targetLanguage as string
        )
        
        return {
          data: {
            translatedText,
            sourceLanguage: sourceLanguage || 'auto',
            targetLanguage,
            confidence: 0.9
          },
          type: 'structured',
          metadata: {
            confidence: 0.9,
            processingTime: Date.now() - context.startTime,
            source: 'fallback_translation_api'
          }
        }
      } catch (fallbackError) {
        throw new Error(`Translation failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`)
      }
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
          placeholder: 'Auto-detect (optional)',
          options: [
            { value: 'auto', label: 'Auto-detect' },
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

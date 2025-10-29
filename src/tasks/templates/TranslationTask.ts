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
      
      // Determine source and target languages
      const sourceLang = (sourceLanguage as string) || 'auto'
      const targetLang = targetLanguage as string
      
      // For auto-detection, we can't check availability without a source language
      // So we'll try to create the translator directly and handle errors
      let translator
      let availability: 'available' | 'downloadable' | 'unavailable' = 'available'
      
      if (sourceLang !== 'auto') {
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
        throw new Error(`Translation model not available for ${sourceLang} -> ${targetLang}`)
      }
      
      // Create translator with appropriate options
      if (availability === 'downloadable') {
        // Create translator with download monitoring
        translator = await TranslatorAPI.create({
          sourceLanguage: sourceLang === 'auto' ? undefined : sourceLang,
          targetLanguage: targetLang,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Translation model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        translator = await TranslatorAPI.create({
          sourceLanguage: sourceLang === 'auto' ? undefined : sourceLang,
          targetLanguage: targetLang
        })
      }
      
      // Translate text using Chrome Translator API
      // API signature: translate(text: string)
      const translatedText = await translator.translate(text as string)
      
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
      // Chrome Translator API is required - no fallback
      console.error('Chrome Translator API failed:', error)
      throw new Error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Translator API is required for this task.`
      )
    }
  }
  
  protected getTaskSpecificMockDefaults(key: string): any {
    switch (key) {
      case 'translatedText':
        return 'This is the translated text in the target language. The actual translation will be generated using the Chrome Translator API when the workflow is executed.'
      case 'sourceLanguage':
        return 'en'
      case 'targetLanguage':
        return 'es'
      case 'confidence':
        return 0.95
      default:
        return undefined
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

import { BaseTask } from '@core/BaseTask'
import { TaskInput, TaskOutput, ExecutionContext, TaskInputUI } from '@common/types'

export class LanguageDetectionTask extends BaseTask {
  readonly id = 'language_detection'
  readonly name = 'Detect Language'
  readonly description = 'Detect the language of the input text using Chrome Language Detector API'
  readonly category = 'language'
  readonly apiType = 'language_detection'
  readonly icon = 'Globe'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { 
        type: 'string',
        description: 'Text to analyze for language detection'
      }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      language: { type: 'string' },
      confidence: { type: 'number' },
      languageCode: { type: 'string' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text } = input
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string')
    }
    
    try {
      // Check if Language Detector API is available (check both self and global)
      const LangDetector = (self as any).LanguageDetector || (window as any).LanguageDetector
      if (!LangDetector) {
        throw new Error('Language Detector API is not available in this browser')
      }
      
      // Check availability and download model if needed
      const availability = await LangDetector.availability()
      if (availability === 'unavailable') {
        throw new Error('Language Detector API is not available')
      }
      
      let detector
      if (availability === 'downloadable') {
        // Create detector with download monitoring
        detector = await LangDetector.create({
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Language detection model downloaded ${e.loaded * 100}%`)
            })
          }
        })
      } else {
        // Model is already available
        detector = await LangDetector.create()
      }
      
      // Detect language using Chrome Language Detector API
      const results = await detector.detect(text as string)
      
      // Get the most confident result
      const topResult = results[0]
      
      return {
        data: {
          language: this.getLanguageName(topResult.detectedLanguage),
          languageCode: topResult.detectedLanguage,
          confidence: topResult.confidence,
          allResults: results.map((r: any) => ({
            language: this.getLanguageName(r.detectedLanguage),
            languageCode: r.detectedLanguage,
            confidence: r.confidence
          }))
        },
        type: 'structured',
        metadata: {
          confidence: topResult.confidence,
          processingTime: Date.now() - context.startTime,
          source: 'chrome_language_detector_api'
        }
      }
    } catch (error) {
      // Chrome Language Detector API is required - no fallback
      console.error('Language Detector API failed:', error)
      throw new Error(
        `Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Chrome Language Detector API is required for this task.`
      )
    }
  }
  
  private getLanguageName(code: string): string {
    // Language code to name mapping for Chrome Language Detector API
    // Based on ISO 639-1 language codes
    const names: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'pl': 'Polish',
      'tr': 'Turkish',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'cs': 'Czech',
      'el': 'Greek',
      'he': 'Hebrew',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'uk': 'Ukrainian',
      'ro': 'Romanian',
      'hu': 'Hungarian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'ga': 'Irish',
      'mt': 'Maltese',
      'cy': 'Welsh'
    }
    return names[code] || code || 'Unknown'
  }
  
  getInputUI(): TaskInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'text',
          label: 'Text to Analyze',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select text data point or enter text directly',
          dataPointTypes: ['text', 'html']
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

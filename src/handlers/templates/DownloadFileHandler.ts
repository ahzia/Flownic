import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class DownloadFileHandler extends BaseHandler {
  readonly id = 'download_file'
  readonly name = 'Download File'
  readonly description = 'Download text content as a file with specified filename and MIME type'
  readonly category = 'io'
  readonly permissions = ['downloads']
  readonly icon = 'Download'
  
  readonly inputSchema = {
    type: 'object',
    required: ['filename', 'content'],
    properties: {
      filename: { 
        type: 'string',
        description: 'Name of the file to download'
      },
      content: { 
        type: 'string',
        description: 'File content'
      },
      mimeType: { 
        type: 'string', 
        default: 'text/plain',
        description: 'MIME type of the file'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const filename = typeof input.filename === 'string' ? input.filename : String(input.filename || '')
    const content = typeof input.content === 'string' ? input.content : String(input.content || '')
    const mimeType = typeof input.mimeType === 'string' ? input.mimeType : 'text/plain'
    
    if (!filename || filename.trim() === '') {
      return {
        success: false,
        error: 'Filename is required'
      }
    }
    
    if (!content || content.trim() === '') {
      return {
        success: false,
        error: 'Content is required and must be a string'
      }
    }
    
    try {
      // Sanitize filename
      const sanitizedFilename = this.sanitizeFilename(filename)
      
      // Download the file
      await helpers.downloadFile(sanitizedFilename, content, mimeType)
      
      return {
        success: true,
        data: { 
          filename: sanitizedFilename, 
          mimeType, 
          size: new Blob([content]).size
        },
        snapshot: { filename: sanitizedFilename, content: content.substring(0, 100) + '...' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file'
      }
    }
  }
  
  async undo(_lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      // File download cannot be undone, but we can notify the user
      await helpers.notify('File download cannot be undone', 'info')
    } catch (error) {
      console.error('Error undoing download_file:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'filename',
          label: 'Filename',
          type: 'text',
          required: true,
          placeholder: 'e.g., report.txt, data.csv'
        }),
        this.createInputField({
          name: 'content',
          label: 'File Content',
          type: 'textarea',
          required: true,
          placeholder: 'Enter file content or select from data points...',
          dataPointTypes: ['text', 'json']
        }),
        this.createInputField({
          name: 'mimeType',
          label: 'MIME Type',
          type: 'select',
          required: false,
          options: [
            { value: 'text/plain', label: 'Text Plain' },
            { value: 'text/csv', label: 'CSV' },
            { value: 'application/json', label: 'JSON' },
            { value: 'text/html', label: 'HTML' },
            { value: 'application/xml', label: 'XML' }
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
  
  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 255) // Limit length
  }
}


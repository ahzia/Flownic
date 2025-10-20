// Download File Handler - Download content as a file
export const meta = {
  id: 'download_file',
  name: 'Download File',
  version: '1.0.0',
  description: 'Download text content as a file with specified filename and MIME type',
  permissions: ['downloads'],
  inputSchema: {
    type: 'object',
    required: ['filename', 'content'],
    properties: {
      filename: { type: 'string' },
      content: { type: 'string' },
      mimeType: { type: 'string', default: 'text/plain' },
      encoding: { type: 'string', default: 'utf-8' }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { filename, content, mimeType = 'text/plain', encoding = 'utf-8' } = input
    
    // Validate filename
    if (!filename || filename.trim() === '') {
      return {
        success: false,
        error: 'Filename is required'
      }
    }
    
    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(filename)
    
    // Download the file
    await helpers.downloadFile(sanitizedFilename, content, mimeType)
    
    return {
      success: true,
      data: { 
        filename: sanitizedFilename, 
        mimeType, 
        encoding,
        size: new Blob([content]).size
      },
      snapshot: { filename: sanitizedFilename, content: content.substring(0, 100) + '...' }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

export async function undo(lastRunState, helpers) {
  try {
    // File download cannot be undone, but we can notify the user
    if (lastRunState?.filename) {
      await helpers.notify(`File "${lastRunState.filename}" has been downloaded and cannot be undone`, 'info')
    }
  } catch (error) {
    console.error('Error undoing download_file:', error)
  }
}

// Helper function to sanitize filename
function sanitizeFilename(filename) {
  // Remove or replace invalid characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit length
}

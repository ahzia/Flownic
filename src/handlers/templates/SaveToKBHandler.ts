import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HandlerInputUI, HelpersAPI } from '@common/types'
import { KBEntry } from '@common/types'
import { saveKBEntry } from '@utils/kb'

export class SaveToKBHandler extends BaseHandler {
  readonly id = 'save_to_kb'
  readonly name = 'Save to Knowledge Base'
  readonly description = 'Saves text content to the Knowledge Base for later use in workflows'
  readonly category = 'storage'
  readonly permissions: string[] = []

  readonly inputSchema = {
    type: 'object',
    required: ['name', 'content'],
    properties: {
      name: { 
        type: 'string', 
        description: 'Name/title for the KB entry' 
      },
      content: { 
        type: 'string', 
        description: 'Content to save (can be from data point or manual text)' 
      },
      tags: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Optional tags for organizing KB entries'
      },
      type: { 
        type: 'string', 
        enum: ['text', 'file', 'url'],
        description: 'Type of KB entry (defaults to "text")'
      }
    }
  }

  async execute(input: HandlerInput, _helpers: HelpersAPI): Promise<HandlerResult> {
    try {
      const { name, content, tags, type } = input as any

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { success: false, error: 'Name is required and must be a non-empty string' }
      }

      if (!content || (typeof content !== 'string' && typeof content !== 'object')) {
        return { success: false, error: 'Content is required and must be a string or object' }
      }

      // Convert content to string if it's an object
      let contentString: string
      if (typeof content === 'object') {
        contentString = JSON.stringify(content, null, 2)
      } else {
        contentString = String(content)
      }

      if (contentString.trim().length === 0) {
        return { success: false, error: 'Content cannot be empty' }
      }

      // Process tags - handle both array and comma-separated string
      let tagsArray: string[] = []
      if (tags) {
        if (Array.isArray(tags)) {
          tagsArray = tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0).map((t: string) => t.trim())
        } else if (typeof tags === 'string') {
          // Split comma-separated string and clean up
          tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        }
      }

      // Create KB entry
      const entry: KBEntry = {
        id: `kb_${Date.now()}`,
        name: name.trim(),
        content: contentString,
        type: (type && ['text', 'file', 'url'].includes(type)) ? type : 'text',
        tags: tagsArray,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Save to KB using existing utility function
      await saveKBEntry(entry)

      return { 
        success: true, 
        data: { 
          entryId: entry.id,
          name: entry.name,
          type: entry.type,
          savedAt: entry.createdAt
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save to Knowledge Base'
      }
    }
  }

  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'name',
          label: 'Entry Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., My Prompt Template, API Response, etc.'
        }),
        this.createInputField({
          name: 'content',
          label: 'Content',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select a data point or enter text manually',
          dataPointTypes: ['text', 'html', 'json', 'task_output']
        }),
        this.createInputField({
          name: 'tags',
          label: 'Tags (comma-separated)',
          type: 'text',
          required: false,
          placeholder: 'e.g., prompt, template, api'
        }),
        this.createInputField({
          name: 'type',
          label: 'Entry Type',
          type: 'select',
          required: false,
          options: [
            { value: 'text', label: 'Text' },
            { value: 'file', label: 'File' },
            { value: 'url', label: 'URL' }
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

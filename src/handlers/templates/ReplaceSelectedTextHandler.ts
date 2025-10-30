import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HandlerInputUI, HelpersAPI } from '@common/types'

export class ReplaceSelectedTextHandler extends BaseHandler {
  readonly id = 'replace_selected_text'
  readonly name = 'Replace Selected Text'
  readonly description = 'Replaces the current selection in the page (DOM or inputs) with the provided text.'
  readonly category = 'dom'
  readonly permissions: string[] = []

  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'Text to insert in place of the current selection' }
    }
  }

  async execute(input: HandlerInput, _helpers: HelpersAPI): Promise<HandlerResult> {
    const { text } = input as any
    if (typeof text !== 'string' || text.length === 0) {
      return { success: false, error: 'Text is required and must be a non-empty string' }
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return { success: false, error: 'No selection found to replace' }
    }

    // If selection is inside an input/textarea, replace value via selectionStart/End
    const activeEl = document.activeElement as HTMLElement | null
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement
      const start = inputEl.selectionStart ?? 0
      const end = inputEl.selectionEnd ?? 0
      const value = inputEl.value
      inputEl.value = value.slice(0, start) + text + value.slice(end)
      const newCaret = start + text.length
      inputEl.selectionStart = inputEl.selectionEnd = newCaret
      inputEl.dispatchEvent(new Event('input', { bubbles: true }))
      inputEl.dispatchEvent(new Event('change', { bubbles: true }))
      return { success: true, data: { replacedIn: 'input', length: text.length } }
    }

    // Otherwise, replace DOM selection (contentEditable or plain text nodes)
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    // Move caret to end of inserted text
    selection.removeAllRanges()
    const after = document.createRange()
    after.setStart(range.endContainer, range.endOffset)
    after.collapse(true)
    selection.addRange(after)

    return { success: true, data: { replacedIn: 'dom', length: text.length } }
  }

  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'text',
          label: 'Replacement Text',
          type: 'data_point_selector',
          required: true,
          placeholder: 'Select a data point (e.g., task output) or enter text',
          dataPointTypes: ['text', 'html', 'json']
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



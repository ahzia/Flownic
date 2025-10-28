import { NodeMeta, TextOptions } from '@common/types'

/**
 * DOM manipulation helpers
 */
export class DOMHelpers {
  static isElementEditable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()
    const inputType = (element as HTMLInputElement).type?.toLowerCase()

    // Check for contentEditable
    if (element.getAttribute('contenteditable') === 'true') return true

    // Check for form elements
    if (['input', 'textarea', 'select'].includes(tagName)) {
      if (tagName === 'input') {
        return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(inputType || '')
      }
      return true
    }

    return false
  }

  static async findNodeMeta(selector: string): Promise<NodeMeta | null> {
    try {
      const element = document.querySelector(selector)
      if (!element) return null

      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      return {
        exists: true,
        tagName: element.tagName.toLowerCase(),
        type: (element as HTMLInputElement).type || '',
        value: (element as HTMLInputElement).value || undefined,
        textContent: element.textContent || undefined,
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {} as Record<string, string>),
        isEditable: this.isElementEditable(element),
        isVisible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
      }
    } catch (error) {
      console.error('Error finding node meta:', error)
      return null
    }
  }

  static async applyText(selector: string, text: string, options: TextOptions = { method: 'replace' }): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement
      if (!element) return false

      const { method = 'replace', triggerEvents = true, selectAfter = false } = options

      // Apply text based on method
      switch (method) {
        case 'replace':
          if (this.isElementEditable(element)) {
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = text
            } else {
              element.textContent = text
            }
          }
          break

        case 'append':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = current + text
            } else {
              element.textContent = current + text
            }
          }
          break

        case 'prepend':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = text + current
            } else {
              element.textContent = text + current
            }
          }
          break

        case 'insert':
          if (this.isElementEditable(element)) {
            const current = (element as HTMLInputElement).value || element.textContent || ''
            const cursorPos = (element as HTMLInputElement).selectionStart || 0
            const newValue = current.slice(0, cursorPos) + text + current.slice(cursorPos)
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
              (element as HTMLInputElement).value = newValue
            } else {
              element.textContent = newValue
            }
          }
          break
      }

      // Trigger events if requested
      if (triggerEvents) {
        const events = ['input', 'change', 'blur']
        events.forEach(eventType => {
          const event = new Event(eventType, { bubbles: true, cancelable: true })
          element.dispatchEvent(event)
        })
      }

      // Select text if requested
      if (selectAfter && (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea')) {
        const input = element as HTMLInputElement
        input.select()
        input.setSelectionRange(0, input.value.length)
      }

      return true
    } catch (error) {
      console.error('Error applying text:', error)
      return false
    }
  }

  static async parseTable(selector: string): Promise<string[][]> {
    const table = document.querySelector(selector) as HTMLTableElement
    if (!table) return []

    const rows: string[][] = []
    const tableRows = table.querySelectorAll('tr')

    tableRows.forEach(row => {
      const cells: string[] = []
      const tableCells = row.querySelectorAll('td, th')
      
      tableCells.forEach(cell => {
        cells.push(cell.textContent?.trim() || '')
      })
      
      if (cells.length > 0) {
        rows.push(cells)
      }
    })

    return rows
  }
}


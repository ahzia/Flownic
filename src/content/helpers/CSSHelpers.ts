/**
 * CSS injection helpers
 */
export class CSSHelpers {
  private cssInjections: Map<string, HTMLElement>

  constructor() {
    this.cssInjections = new Map()
  }

  async insertCSS(cssId: string, cssText: string): Promise<void> {
    // Remove existing CSS with same ID
    this.removeCSS(cssId)

    const style = document.createElement('style')
    style.id = `promptflow-${cssId}`
    style.textContent = cssText
    document.head.appendChild(style)

    this.cssInjections.set(cssId, style)
  }

  async removeCSS(cssId: string): Promise<void> {
    const existing = this.cssInjections.get(cssId)
    if (existing) {
      existing.remove()
      this.cssInjections.delete(cssId)
    }

    // Also remove by ID in case of direct removal
    const style = document.getElementById(`promptflow-${cssId}`)
    if (style) {
      style.remove()
    }
  }

  async toggleCSS(cssId: string, cssText: string): Promise<boolean> {
    const existing = this.cssInjections.get(cssId)
    if (existing) {
      this.removeCSS(cssId)
      return false
    } else {
      this.insertCSS(cssId, cssText)
      return true
    }
  }
}


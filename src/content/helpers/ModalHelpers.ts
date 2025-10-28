import { ModalConfig } from '@common/types'

/**
 * Modal UI helpers
 */
export class ModalHelpers {
  private modals: Map<string, HTMLElement>

  constructor() {
    this.modals = new Map()
    this.injectModalStyles()
  }

  async showModal(config: ModalConfig): Promise<string> {
    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const modal = document.createElement('div')
    modal.id = modalId
    modal.className = 'promptflow-modal'
    
    const { title, content, html = false, size = 'medium', closable = true } = config
    
    modal.innerHTML = `
      <div class="promptflow-modal-overlay">
        <div class="promptflow-modal-content promptflow-modal-${size}">
          <div class="promptflow-modal-header">
            <h3 class="promptflow-modal-title">${title}</h3>
            ${closable ? '<button class="promptflow-modal-close">&times;</button>' : ''}
          </div>
          <div class="promptflow-modal-body">
            ${html ? content : `<pre>${content}</pre>`}
          </div>
        </div>
      </div>
    `

    // Add event listeners
    if (closable) {
      const closeBtn = modal.querySelector('.promptflow-modal-close')
      const overlay = modal.querySelector('.promptflow-modal-overlay')
      
      closeBtn?.addEventListener('click', () => this.closeModal(modalId))
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(modalId)
      })
    }

    document.body.appendChild(modal)
    this.modals.set(modalId, modal)

    return modalId
  }

  async closeModal(modalId: string): Promise<void> {
    const modal = this.modals.get(modalId)
    if (modal) {
      modal.remove()
      this.modals.delete(modalId)
      
      // Clear any text selection to prevent workflow re-triggering
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }
    }
  }

  private injectModalStyles(): void {
    if (document.getElementById('promptflow-modal-styles')) return

    const style = document.createElement('style')
    style.id = 'promptflow-modal-styles'
    style.textContent = `
      .promptflow-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      
      .promptflow-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .promptflow-modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
      }
      
      .promptflow-modal-small { width: 300px; }
      .promptflow-modal-medium { width: 500px; }
      .promptflow-modal-large { width: 800px; }
      
      .promptflow-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
      }
      
      .promptflow-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .promptflow-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .promptflow-modal-body {
        padding: 20px;
      }
      
      .promptflow-modal-body pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
      }
    `
    
    document.head.appendChild(style)
  }
}


import { HandlerRegistry } from '@core/HandlerRegistry'
import { HelpersAPI } from '@common/types'
import { DOMHelpers } from '../helpers/DOMHelpers'
import { CSSHelpers } from '../helpers/CSSHelpers'
import { ModalHelpers } from '../helpers/ModalHelpers'
import { NotificationHelpers } from '../helpers/NotificationHelpers'

/**
 * Executes handlers through the HandlerRegistry
 */
export class HandlerExecutor {
  private handlerRegistry: HandlerRegistry
  private cssHelpers: CSSHelpers
  private modalHelpers: ModalHelpers
  private notificationHelpers: NotificationHelpers
  private snapshots: Map<string, unknown>

  constructor(
    _domHelpers: DOMHelpers,
    cssHelpers: CSSHelpers,
    modalHelpers: ModalHelpers,
    notificationHelpers: NotificationHelpers,
    snapshots: Map<string, unknown>
  ) {
    this.handlerRegistry = new HandlerRegistry()
    this.cssHelpers = cssHelpers
    this.modalHelpers = modalHelpers
    this.notificationHelpers = notificationHelpers
    this.snapshots = snapshots
  }

  async executeHandler(handlerId: string, input: any): Promise<any> {
    try {
      console.log('🎬 Executing handler:', handlerId, 'with input:', input)
      
      // Create helpers API wrapper
      const helpers: HelpersAPI = {
        findNodeMeta: (selector: string) => DOMHelpers.findNodeMeta(selector),
        saveSnapshot: this.saveSnapshot.bind(this),
        applyText: (selector: string, text: string, options?: any) => DOMHelpers.applyText(selector, text, options),
        insertCSS: this.cssHelpers.insertCSS.bind(this.cssHelpers),
        removeCSS: this.cssHelpers.removeCSS.bind(this.cssHelpers),
        toggleCSS: this.cssHelpers.toggleCSS.bind(this.cssHelpers),
        showModal: this.modalHelpers.showModal.bind(this.modalHelpers),
        closeModal: this.modalHelpers.closeModal.bind(this.modalHelpers),
        downloadFile: this.downloadFile.bind(this),
        saveCapture: this.saveCapture.bind(this),
        getKB: this.getKB.bind(this),
        confirmAction: this.confirmAction.bind(this),
        notify: this.notificationHelpers.notify.bind(this.notificationHelpers),
        parseTable: (selector: string) => DOMHelpers.parseTable(selector)
      }
      
      // Execute handler through registry
      const result = await this.handlerRegistry.executeHandler(handlerId, input, helpers)
      
      console.log(`✅ Handler completed: ${handlerId}`, result)
      
      return result
    } catch (error) {
      console.error('Error executing handler:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async saveSnapshot(selector: string): Promise<string> {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const element = document.querySelector(selector)
    
    if (element) {
      const snapshot = {
        selector,
        tagName: element.tagName,
        innerHTML: element.innerHTML,
        value: (element as HTMLInputElement).value,
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {} as Record<string, string>),
        timestamp: Date.now()
      }
      this.snapshots.set(snapshotId, snapshot)
    }

    return snapshotId
  }

  private async downloadFile(filename: string, content: string, mimeType: string): Promise<void> {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    URL.revokeObjectURL(url)
  }

  private async saveCapture(name: string, data: unknown): Promise<void> {
    chrome.runtime.sendMessage({
      type: 'SAVE_CAPTURE',
      data: { name, data }
    })
  }

  private async getKB(key: string): Promise<unknown> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_KB',
        data: { key }
      }, (response) => {
        resolve(response?.data)
      })
    })
  }

  private async confirmAction(prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = window.confirm(prompt)
      resolve(result)
    })
  }
}


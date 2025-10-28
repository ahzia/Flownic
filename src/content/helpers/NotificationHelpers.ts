/**
 * Notification UI helpers
 */
export class NotificationHelpers {
  async notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    // Create a simple notification
    const notification = document.createElement('div')
    notification.className = `promptflow-notification promptflow-notification-${type}`
    notification.textContent = message
    
    // Add styles
    this.injectNotificationStyles()
    
    document.body.appendChild(notification)
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  private injectNotificationStyles(): void {
    if (document.getElementById('promptflow-notification-styles')) return

    const style = document.createElement('style')
    style.id = 'promptflow-notification-styles'
    style.textContent = `
      .promptflow-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
      }
      
      .promptflow-notification-info { background: #2196F3; }
      .promptflow-notification-success { background: #4CAF50; }
      .promptflow-notification-warning { background: #FF9800; }
      .promptflow-notification-error { background: #F44336; }
    `
    
    document.head.appendChild(style)
  }
}


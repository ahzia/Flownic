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
        top: var(--space-5, 20px);
        right: var(--space-5, 20px);
        padding: var(--space-3, 12px) var(--space-5, 20px);
        border-radius: var(--radius-md, 4px);
        color: var(--color-text-inverse, white);
        font-weight: var(--font-weight-medium, 500);
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: var(--color-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
        font-family: var(--font-family-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }
      
      .promptflow-notification-info { 
        background: var(--color-status-info, #0ea5e9); 
      }
      .promptflow-notification-success { 
        background: var(--color-status-success, #22c55e); 
      }
      .promptflow-notification-warning { 
        background: var(--color-status-warning, #f59e0b); 
      }
      .promptflow-notification-error { 
        background: var(--color-status-error, #ef4444); 
      }
    `
    
    document.head.appendChild(style)
  }
}


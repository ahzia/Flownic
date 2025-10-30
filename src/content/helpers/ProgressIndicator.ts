export class ProgressIndicator {
  private containerId = 'promptflow-progress-indicator'
  private hideTimeout: number | null = null

  show(message: string): void {
    this.clearHide()
    let container = document.getElementById(this.containerId)
    if (!container) {
      container = document.createElement('div')
      container.id = this.containerId
      container.setAttribute('role', 'status')
      container.style.position = 'fixed'
      container.style.right = '16px'
      container.style.top = '16px'
      container.style.zIndex = '2147483647'
      container.style.padding = '10px 14px'
      container.style.borderRadius = '12px'
      container.style.display = 'flex'
      container.style.alignItems = 'center'
      container.style.gap = '10px'
      container.style.boxShadow = '0 4px 14px var(--color-shadow-medium, rgba(0,0,0,0.15))'
      container.style.background = 'var(--color-surface, #ffffff)'
      container.style.color = 'var(--color-text-primary, #111827)'
      container.style.border = '1px solid var(--color-border-primary, #e5e7eb)'

      const spinner = document.createElement('div')
      spinner.className = 'pf-progress-spinner'
      spinner.style.width = '16px'
      spinner.style.height = '16px'
      spinner.style.border = '2px solid var(--color-border-primary, #e5e7eb)'
      spinner.style.borderTopColor = 'var(--color-button-primary, #3b82f6)'
      spinner.style.borderRadius = '50%'
      spinner.style.animation = 'pf-spin 0.9s linear infinite'

      const text = document.createElement('div')
      text.className = 'pf-progress-text'
      text.style.fontSize = '13px'
      text.style.lineHeight = '18px'
      text.textContent = message

      container.appendChild(spinner)
      container.appendChild(text)
      document.documentElement.appendChild(container)

      this.injectKeyframes()
    } else {
      const text = container.querySelector('.pf-progress-text') as HTMLElement | null
      if (text) text.textContent = message
      const spinner = container.querySelector('.pf-progress-spinner') as HTMLElement | null
      if (spinner) spinner.style.display = 'inline-block'
      container.style.opacity = '1'
      container.style.transform = 'translateY(0)'
    }
  }

  update(message: string): void {
    const container = document.getElementById(this.containerId)
    if (container) {
      const text = container.querySelector('.pf-progress-text') as HTMLElement | null
      if (text) text.textContent = message
    } else {
      this.show(message)
    }
  }

  success(message: string, autoHideMs = 1200): void {
    const container = document.getElementById(this.containerId)
    if (!container) return this.show(message)
    const spinner = container.querySelector('.pf-progress-spinner') as HTMLElement | null
    if (spinner) spinner.style.display = 'none'
    const text = container.querySelector('.pf-progress-text') as HTMLElement | null
    if (text) text.textContent = message
    container.style.borderColor = 'var(--color-status-success, #22c55e)'
    this.scheduleHide(autoHideMs)
  }

  error(message: string, autoHideMs = 2000): void {
    const container = document.getElementById(this.containerId)
    if (!container) return this.show(message)
    const spinner = container.querySelector('.pf-progress-spinner') as HTMLElement | null
    if (spinner) spinner.style.display = 'none'
    const text = container.querySelector('.pf-progress-text') as HTMLElement | null
    if (text) text.textContent = message
    container.style.borderColor = 'var(--color-status-error, #ef4444)'
    this.scheduleHide(autoHideMs)
  }

  hide(): void {
    const container = document.getElementById(this.containerId)
    if (container) {
      container.style.transition = 'opacity 150ms ease, transform 150ms ease'
      container.style.opacity = '0'
      container.style.transform = 'translateY(6px)'
      window.setTimeout(() => container?.remove(), 180)
    }
    this.clearHide()
  }

  private scheduleHide(ms: number): void {
    this.clearHide()
    this.hideTimeout = window.setTimeout(() => this.hide(), ms) as unknown as number
  }

  private clearHide(): void {
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout)
      this.hideTimeout = null
    }
  }

  private injectKeyframes(): void {
    if (document.getElementById('pf-progress-keyframes')) return
    const style = document.createElement('style')
    style.id = 'pf-progress-keyframes'
    style.textContent = `@keyframes pf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
    document.head.appendChild(style)
  }
}



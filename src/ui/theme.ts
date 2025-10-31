// Theme management utilities
import { storage } from '@utils/storage'

export type Theme = 'light' | 'dark' | 'auto'

export class ThemeManager {
  private static instance: ThemeManager
  private currentTheme: Theme = 'auto'
  private listeners: Set<(theme: Theme) => void> = new Set()

  private constructor() {
    this.loadTheme().catch(console.error)
    this.setupSystemThemeListener()
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  private async loadTheme(): Promise<void> {
    // Load theme from storage using StorageManager
    const storedTheme = await storage.get<Theme>('theme')
    if (storedTheme) {
      this.setTheme(storedTheme)
    } else {
      // Default to system preference
      this.setTheme('auto')
    }
  }

  public initialize(): void {
    this.loadTheme().catch(console.error)
  }

  private setupSystemThemeListener(): void {
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme()
        }
      })
    }
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme
    this.applyTheme()
    this.saveTheme().catch(console.error)
    this.notifyListeners()
  }

  getTheme(): Theme {
    return this.currentTheme
  }

  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return this.currentTheme
  }

  private applyTheme(): void {
    const root = document.documentElement
    const effectiveTheme = this.getEffectiveTheme()

    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark')
    
    // Set data attribute for CSS
    root.setAttribute('data-theme', effectiveTheme)
    
    // Add theme class
    root.classList.add(`theme-${effectiveTheme}`)
  }

  private async saveTheme(): Promise<void> {
    await storage.set('theme', this.currentTheme)
  }

  addListener(callback: (theme: Theme) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentTheme))
  }

  // Utility methods for components
  isDark(): boolean {
    return this.getEffectiveTheme() === 'dark'
  }

  isLight(): boolean {
    return this.getEffectiveTheme() === 'light'
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance()

// React hook for theme
export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>(themeManager.getTheme())
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>(themeManager.getEffectiveTheme())

  React.useEffect(() => {
    const unsubscribe = themeManager.addListener((newTheme) => {
      setThemeState(newTheme)
      setEffectiveTheme(themeManager.getEffectiveTheme())
    })

    return unsubscribe
  }, [])

  return {
    theme,
    effectiveTheme,
    setTheme: themeManager.setTheme.bind(themeManager),
    toggleTheme: themeManager.toggleTheme.bind(themeManager),
    isDark: themeManager.isDark.bind(themeManager),
    isLight: themeManager.isLight.bind(themeManager)
  }
}

// CSS-in-JS utilities
export const css = {
  // Color utilities
  color: {
    primary: 'var(--color-primary-500)',
    primaryHover: 'var(--color-primary-600)',
    primaryActive: 'var(--color-primary-700)',
    secondary: 'var(--color-secondary-500)',
    success: 'var(--color-status-success)',
    warning: 'var(--color-status-warning)',
    error: 'var(--color-status-error)',
    info: 'var(--color-status-info)',
    text: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textTertiary: 'var(--color-text-tertiary)',
    background: 'var(--color-background)',
    surface: 'var(--color-surface)',
    border: 'var(--color-border-primary)',
    borderFocus: 'var(--color-border-focus)'
  },
  
  // Spacing utilities
  spacing: {
    xs: 'var(--space-1)',
    sm: 'var(--space-2)',
    md: 'var(--space-3)',
    lg: 'var(--space-4)',
    xl: 'var(--space-6)',
    '2xl': 'var(--space-8)',
    '3xl': 'var(--space-12)',
    '4xl': 'var(--space-16)'
  },
  
  // Border radius utilities
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    full: 'var(--radius-full)'
  },
  
  // Shadow utilities
  shadow: {
    sm: 'var(--color-shadow-sm)',
    md: 'var(--color-shadow-md)',
    lg: 'var(--color-shadow-lg)',
    xl: 'var(--color-shadow-xl)'
  },
  
  // Transition utilities
  transition: {
    fast: 'var(--transition-fast)',
    normal: 'var(--transition-normal)',
    slow: 'var(--transition-slow)'
  },
  
  // Typography utilities
  typography: {
    fontFamily: 'var(--font-family-sans)',
    fontSize: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
      '4xl': 'var(--font-size-4xl)'
    },
    fontWeight: {
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
      bold: 'var(--font-weight-bold)'
    }
  }
}

// Import React for the hook
import React from 'react'

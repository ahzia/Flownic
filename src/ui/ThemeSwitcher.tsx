import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './theme'

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'auto' as const, label: 'Auto', icon: Monitor }
  ]

  return (
    <div className="theme-switcher">
      <label className="theme-switcher-label">Theme</label>
      <div className="theme-switcher-options">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={`theme-switcher-option ${theme === value ? 'active' : ''}`}
            onClick={() => setTheme(value)}
            title={`Switch to ${label} theme`}
          >
            <Icon className="theme-switcher-icon" />
            <span className="theme-switcher-text">{label}</span>
            {theme === value && (
              <div className="theme-switcher-indicator" />
            )}
          </button>
        ))}
      </div>
      <div className="theme-switcher-info">
        Currently using: <strong>{effectiveTheme}</strong> theme
      </div>
    </div>
  )
}

import React from 'react'
import './Tabs.css'

export interface Tab {
  id: string
  label: string
  icon?: React.ComponentType<any>
  disabled?: boolean
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`tabs-container ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const isDisabled = tab.disabled

        return (
          <button
            key={tab.id}
            className={`tab-button ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            type="button"
          >
            {Icon && <Icon className="tab-icon" size={18} />}
            <span className="tab-label">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}


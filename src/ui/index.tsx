import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings, History, Sparkles, Code, ArrowRight, Lock, CheckCircle2, Clock, Zap } from 'lucide-react'
import { ThemeSwitcher } from './ThemeSwitcher'
import { themeManager } from './theme'
import './styles.css'

const PopupApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history')

  useEffect(() => {
    // Initialize theme
    themeManager.initialize()
  }, [])

  const handleOpenQuickbar = () => {
    // Send message to content script to open quickbar
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_QUICKBAR' })
        window.close()
      }
    })
  }

  const openPlayground = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/playground.html') })
  }

  return (
    <div className="flownic-popup">
      {/* Header */}
      <div className="flownic-popup-header">
        <div className="flownic-popup-brand">
          <div className="flownic-popup-logo">
            <div className="flownic-logo-gradient">
              <Sparkles className="flownic-logo-icon" />
            </div>
          </div>
          <div className="flownic-popup-title-text">
            <span className="flownic-popup-name">Flownic</span>
            <span className="flownic-popup-tagline">AI-Powered Workflows</span>
          </div>
        </div>
      </div>

      {/* Hero Actions */}
      <div className="flownic-hero-section">
        <button
          className="flownic-hero-btn flownic-hero-btn-primary"
          onClick={handleOpenQuickbar}
        >
          <div className="flownic-hero-btn-icon">
            <Zap className="flownic-icon" />
          </div>
          <div className="flownic-hero-btn-content">
            <span className="flownic-hero-btn-title">Open Quickbar</span>
            <span className="flownic-hero-btn-subtitle">Press ⌘⇧K to launch</span>
          </div>
          <div className="flownic-hero-btn-arrow">
            <ArrowRight className="flownic-icon" />
          </div>
        </button>
        <button
          className="flownic-hero-btn flownic-hero-btn-secondary"
          onClick={openPlayground}
        >
          <div className="flownic-hero-btn-icon">
            <Code className="flownic-icon" />
          </div>
          <div className="flownic-hero-btn-content">
            <span className="flownic-hero-btn-title">Workflow Playground</span>
            <span className="flownic-hero-btn-subtitle">Build & manage workflows</span>
          </div>
          <div className="flownic-hero-btn-arrow">
            <ArrowRight className="flownic-icon" />
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flownic-tabs">
        <button
          className={`flownic-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="flownic-icon" />
          <span>History</span>
        </button>
        <button
          className={`flownic-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="flownic-icon" />
          <span>Settings</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flownic-tab-content">
        {activeTab === 'history' && (
          <div className="flownic-history">
            <div className="flownic-history-header">
              <h3>Recent Actions</h3>
              <p className="flownic-section-subtitle">Your workflow execution history</p>
            </div>
            <div className="flownic-history-list">
              <div className="flownic-history-item">
                <div className="flownic-history-status">
                  <CheckCircle2 className="flownic-history-icon" />
                </div>
                <div className="flownic-history-content">
                  <div className="flownic-history-action">SHOW_MODAL</div>
                  <div className="flownic-history-time">
                    <Clock className="flownic-history-time-icon" />
                    <span>2 minutes ago</span>
                  </div>
                </div>
              </div>
              <div className="flownic-history-item">
                <div className="flownic-history-status">
                  <CheckCircle2 className="flownic-history-icon" />
                </div>
                <div className="flownic-history-content">
                  <div className="flownic-history-action">INSERT_TEXT</div>
                  <div className="flownic-history-time">
                    <Clock className="flownic-history-time-icon" />
                    <span>5 minutes ago</span>
                  </div>
                </div>
              </div>
              <div className="flownic-history-item">
                <div className="flownic-history-status">
                  <CheckCircle2 className="flownic-history-icon" />
                </div>
                <div className="flownic-history-content">
                  <div className="flownic-history-action">SAVE_CAPTURE</div>
                  <div className="flownic-history-time">
                    <Clock className="flownic-history-time-icon" />
                    <span>10 minutes ago</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flownic-history-footer">
              <p>History is limited to recent actions</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flownic-settings">
            <div className="flownic-settings-header">
              <h3>Settings</h3>
              <p className="flownic-section-subtitle">Customize your experience</p>
            </div>
            
            <div className="flownic-settings-section">
              <h4 className="flownic-settings-section-title">Preferences</h4>
              <div className="flownic-setting-group">
                <label className="flownic-setting-label">
                  <input type="checkbox" defaultChecked className="flownic-checkbox" />
                  <span className="flownic-setting-content">
                    <span className="flownic-setting-name">Show action preview</span>
                    <span className="flownic-setting-desc">Preview actions before execution</span>
                  </span>
                </label>
              </div>
              <div className="flownic-setting-group">
                <label className="flownic-setting-label">
                  <input type="checkbox" className="flownic-checkbox" />
                  <span className="flownic-setting-content">
                    <span className="flownic-setting-name">Auto-confirm safe actions</span>
                    <span className="flownic-setting-desc">Skip confirmation for safe operations</span>
                  </span>
                </label>
              </div>
              <div className="flownic-setting-group">
                <label className="flownic-setting-label">
                  <input type="checkbox" defaultChecked className="flownic-checkbox" />
                  <span className="flownic-setting-content">
                    <span className="flownic-setting-name">Enable notifications</span>
                    <span className="flownic-setting-desc">Receive workflow execution updates</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flownic-settings-section">
              <h4 className="flownic-settings-section-title">Appearance</h4>
              <div className="flownic-setting-group">
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flownic-popup-footer">
        <div className="flownic-footer-content">
          <div className="flownic-version">v0.1.0</div>
          <div className="flownic-privacy">
            <Lock className="flownic-icon" />
            <span>Offline-first</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Initialize the popup
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PopupApp />)
}

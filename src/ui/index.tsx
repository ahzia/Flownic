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
    <div className="promptflow-popup">
      {/* Header */}
      <div className="promptflow-popup-header">
        <div className="promptflow-popup-brand">
          <div className="promptflow-popup-logo">
            <div className="promptflow-logo-gradient">
              <Sparkles className="promptflow-logo-icon" />
            </div>
          </div>
          <div className="promptflow-popup-title-text">
            <span className="promptflow-popup-name">PromptFlow</span>
            <span className="promptflow-popup-tagline">AI-Powered Workflows</span>
          </div>
        </div>
      </div>

      {/* Hero Actions */}
      <div className="promptflow-hero-section">
        <button
          className="promptflow-hero-btn promptflow-hero-btn-primary"
          onClick={handleOpenQuickbar}
        >
          <div className="promptflow-hero-btn-icon">
            <Zap className="promptflow-icon" />
          </div>
          <div className="promptflow-hero-btn-content">
            <span className="promptflow-hero-btn-title">Open Quickbar</span>
            <span className="promptflow-hero-btn-subtitle">Press ⌘⇧K to launch</span>
          </div>
          <div className="promptflow-hero-btn-arrow">
            <ArrowRight className="promptflow-icon" />
          </div>
        </button>
        <button
          className="promptflow-hero-btn promptflow-hero-btn-secondary"
          onClick={openPlayground}
        >
          <div className="promptflow-hero-btn-icon">
            <Code className="promptflow-icon" />
          </div>
          <div className="promptflow-hero-btn-content">
            <span className="promptflow-hero-btn-title">Workflow Playground</span>
            <span className="promptflow-hero-btn-subtitle">Build & manage workflows</span>
          </div>
          <div className="promptflow-hero-btn-arrow">
            <ArrowRight className="promptflow-icon" />
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="promptflow-tabs">
        <button
          className={`promptflow-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="promptflow-icon" />
          <span>History</span>
        </button>
        <button
          className={`promptflow-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="promptflow-icon" />
          <span>Settings</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="promptflow-tab-content">
        {activeTab === 'history' && (
          <div className="promptflow-history">
            <div className="promptflow-history-header">
              <h3>Recent Actions</h3>
              <p className="promptflow-section-subtitle">Your workflow execution history</p>
            </div>
            <div className="promptflow-history-list">
              <div className="promptflow-history-item">
                <div className="promptflow-history-status">
                  <CheckCircle2 className="promptflow-history-icon" />
                </div>
                <div className="promptflow-history-content">
                  <div className="promptflow-history-action">SHOW_MODAL</div>
                  <div className="promptflow-history-time">
                    <Clock className="promptflow-history-time-icon" />
                    <span>2 minutes ago</span>
                  </div>
                </div>
              </div>
              <div className="promptflow-history-item">
                <div className="promptflow-history-status">
                  <CheckCircle2 className="promptflow-history-icon" />
                </div>
                <div className="promptflow-history-content">
                  <div className="promptflow-history-action">INSERT_TEXT</div>
                  <div className="promptflow-history-time">
                    <Clock className="promptflow-history-time-icon" />
                    <span>5 minutes ago</span>
                  </div>
                </div>
              </div>
              <div className="promptflow-history-item">
                <div className="promptflow-history-status">
                  <CheckCircle2 className="promptflow-history-icon" />
                </div>
                <div className="promptflow-history-content">
                  <div className="promptflow-history-action">SAVE_CAPTURE</div>
                  <div className="promptflow-history-time">
                    <Clock className="promptflow-history-time-icon" />
                    <span>10 minutes ago</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="promptflow-history-footer">
              <p>History is limited to recent actions</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="promptflow-settings">
            <div className="promptflow-settings-header">
              <h3>Settings</h3>
              <p className="promptflow-section-subtitle">Customize your experience</p>
            </div>
            
            <div className="promptflow-settings-section">
              <h4 className="promptflow-settings-section-title">Preferences</h4>
              <div className="promptflow-setting-group">
                <label className="promptflow-setting-label">
                  <input type="checkbox" defaultChecked className="promptflow-checkbox" />
                  <span className="promptflow-setting-content">
                    <span className="promptflow-setting-name">Show action preview</span>
                    <span className="promptflow-setting-desc">Preview actions before execution</span>
                  </span>
                </label>
              </div>
              <div className="promptflow-setting-group">
                <label className="promptflow-setting-label">
                  <input type="checkbox" className="promptflow-checkbox" />
                  <span className="promptflow-setting-content">
                    <span className="promptflow-setting-name">Auto-confirm safe actions</span>
                    <span className="promptflow-setting-desc">Skip confirmation for safe operations</span>
                  </span>
                </label>
              </div>
              <div className="promptflow-setting-group">
                <label className="promptflow-setting-label">
                  <input type="checkbox" defaultChecked className="promptflow-checkbox" />
                  <span className="promptflow-setting-content">
                    <span className="promptflow-setting-name">Enable notifications</span>
                    <span className="promptflow-setting-desc">Receive workflow execution updates</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="promptflow-settings-section">
              <h4 className="promptflow-settings-section-title">Appearance</h4>
              <div className="promptflow-setting-group">
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="promptflow-popup-footer">
        <div className="promptflow-footer-content">
          <div className="promptflow-version">v0.1.0</div>
          <div className="promptflow-privacy">
            <Lock className="promptflow-icon" />
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

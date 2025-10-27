import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings, History, Workflow, Sparkles, Zap, Code } from 'lucide-react'
import { ThemeSwitcher } from './ThemeSwitcher'
import { themeManager } from './theme'
import './styles.css'

const PopupApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'history' | 'settings'>('workflows')
  const [isAIAvailable, setIsAIAvailable] = useState(false)

  useEffect(() => {
    // Initialize theme
    themeManager.initialize()
    
    // Check if Chrome AI APIs are available
    chrome.runtime.sendMessage({ type: 'CHECK_AI_AVAILABILITY' }, (response) => {
      setIsAIAvailable(response?.available || false)
    })
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
        <div className="promptflow-popup-title">
          <Sparkles className="promptflow-icon" />
          <span>PromptFlow</span>
        </div>
        <div className="promptflow-ai-status">
          <div className={`promptflow-status-indicator ${isAIAvailable ? 'available' : 'unavailable'}`}>
            <Zap className="promptflow-icon" />
          </div>
          <span className="promptflow-status-text">
            {isAIAvailable ? 'AI Ready' : 'AI Unavailable'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="promptflow-quick-actions">
        <button
          className="promptflow-btn promptflow-btn-primary promptflow-btn-large"
          onClick={handleOpenQuickbar}
        >
          <Sparkles className="promptflow-icon" />
          Open Quickbar
          <span className="promptflow-shortcut">⌘⇧K</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="promptflow-tabs">
        <button
          className={`promptflow-tab ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          <Workflow className="promptflow-icon" />
          Workflows
        </button>
        <button
          className={`promptflow-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="promptflow-icon" />
          History
        </button>
        <button
          className={`promptflow-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="promptflow-icon" />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="promptflow-tab-content">
        {activeTab === 'workflows' && (
          <div className="promptflow-workflows">
            <div className="promptflow-workflows-header">
              <h3>Workflows</h3>
              <button className="promptflow-btn promptflow-btn-primary" onClick={openPlayground}>
                <Code className="promptflow-icon" />
                Open Playground
              </button>
            </div>
            
            <div className="promptflow-workflow-list">
              <div className="promptflow-workflow-item">
                <div className="promptflow-workflow-name">Job Application</div>
                <div className="promptflow-workflow-desc">Capture job → Tailor CV → Apply</div>
              </div>
              <div className="promptflow-workflow-item">
                <div className="promptflow-workflow-name">Content Processing</div>
                <div className="promptflow-workflow-desc">Summarize → Translate → Rewrite</div>
              </div>
              <div className="promptflow-workflow-item">
                <div className="promptflow-workflow-name">YouTube Summarizer</div>
                <div className="promptflow-workflow-desc">Auto-summarize video content</div>
              </div>
            </div>
            
            <div className="promptflow-workflows-footer">
              <p>Create custom workflows in the Playground</p>
            </div>
          </div>
        )}


        {activeTab === 'history' && (
          <div className="promptflow-history">
            <h3>Recent Actions</h3>
            <div className="promptflow-history-list">
              <div className="promptflow-history-item">
                <div className="promptflow-history-action">SHOW_MODAL</div>
                <div className="promptflow-history-time">2 minutes ago</div>
              </div>
              <div className="promptflow-history-item">
                <div className="promptflow-history-action">INSERT_TEXT</div>
                <div className="promptflow-history-time">5 minutes ago</div>
              </div>
              <div className="promptflow-history-item">
                <div className="promptflow-history-action">SAVE_CAPTURE</div>
                <div className="promptflow-history-time">10 minutes ago</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="promptflow-settings">
            <h3>Settings</h3>
            <div className="promptflow-setting-group">
              <label className="promptflow-setting-label">
                <input type="checkbox" defaultChecked />
                <span>Show action preview</span>
              </label>
            </div>
            <div className="promptflow-setting-group">
              <label className="promptflow-setting-label">
                <input type="checkbox" />
                <span>Auto-confirm safe actions</span>
              </label>
            </div>
            <div className="promptflow-setting-group">
              <label className="promptflow-setting-label">
                <input type="checkbox" defaultChecked />
                <span>Enable notifications</span>
              </label>
            </div>
            <div className="promptflow-setting-group">
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="promptflow-popup-footer">
        <div className="promptflow-version">v0.1.0</div>
        <div className="promptflow-privacy">🔒 Offline-first</div>
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

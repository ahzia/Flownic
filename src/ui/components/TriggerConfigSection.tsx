import React from 'react'
import { WorkflowTrigger, WebsiteConfig } from '@common/types'

interface TriggerConfigSectionProps {
  trigger: WorkflowTrigger
  websiteConfig: WebsiteConfig
  onTriggerChange: (trigger: WorkflowTrigger) => void
  onWebsiteConfigChange: (config: WebsiteConfig) => void
}

export const TriggerConfigSection: React.FC<TriggerConfigSectionProps> = ({
  trigger,
  websiteConfig,
  onTriggerChange,
  onWebsiteConfigChange
}) => {
  return (
    <>
      {/* Trigger Configuration */}
      <div className="editor-section">
        <h3>Trigger Configuration</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>When to run</label>
            <select
              value={trigger.type}
              onChange={(e) => onTriggerChange({ ...trigger, type: e.target.value as any })}
              className="form-select"
            >
              <option value="manual">Manual (keyboard shortcut)</option>
              <option value="onPageLoad">On page load</option>
              <option value="onSelection">On text selection</option>
              <option value="schedule">Scheduled</option>
            </select>
          </div>

          {trigger.type === 'manual' && (
            <div className="form-group">
              <label>Keyboard Shortcut</label>
              <input
                type="text"
                value={trigger.shortcut || ''}
                onChange={(e) => onTriggerChange({ ...trigger, shortcut: e.target.value })}
                placeholder="e.g., Ctrl+Shift+S"
                className="form-input"
              />
            </div>
          )}

          {trigger.type === 'onPageLoad' && (
            <div className="form-group">
              <label>Website Pattern</label>
              <input
                type="text"
                value={trigger.pattern || ''}
                onChange={(e) => onTriggerChange({ ...trigger, pattern: e.target.value })}
                placeholder="e.g., medium.com, *.github.com"
                className="form-input"
              />
              <small>Use * for wildcards. Leave empty for all sites.</small>
            </div>
          )}

          {trigger.type === 'onSelection' && (
            <div className="form-group">
              <label>CSS Selector (optional)</label>
              <input
                type="text"
                value={trigger.selector || ''}
                onChange={(e) => onTriggerChange({ ...trigger, selector: e.target.value })}
                placeholder="e.g., .article-content, #main"
                className="form-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Website Configuration */}
      <div className="editor-section">
        <h3>Website Configuration</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Run on websites</label>
            <select
              value={websiteConfig.type}
              onChange={(e) => onWebsiteConfigChange({ ...websiteConfig, type: e.target.value as any })}
              className="form-select"
            >
              <option value="all">All websites</option>
              <option value="specific">Specific websites only</option>
              <option value="exclude">All websites except</option>
            </select>
          </div>

          {(websiteConfig.type === 'specific' || websiteConfig.type === 'exclude') && (
            <div className="form-group">
              <label>
                {websiteConfig.type === 'specific' ? 'Website patterns' : 'Excluded patterns'}
              </label>
              <textarea
                value={websiteConfig.patterns}
                onChange={(e) => onWebsiteConfigChange({ ...websiteConfig, patterns: e.target.value })}
                placeholder="Enter one pattern per line:&#10;medium.com&#10;*.github.com&#10;example.com/path"
                className="form-textarea"
                rows={4}
              />
              <small>
                Use * for wildcards. One pattern per line. Examples: medium.com, *.github.com, example.com/path
              </small>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

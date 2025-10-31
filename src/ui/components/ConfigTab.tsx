import React from 'react'
import { WorkflowTrigger } from '@common/types'
import { TriggerConfigSection } from './TriggerConfigSection'

export interface WorkflowConfig {
  name: string
  description: string
  trigger: WorkflowTrigger
  websiteConfig?: {
    type: 'all' | 'specific' | 'exclude'
    patterns: string
  }
}

interface ConfigTabProps {
  config: WorkflowConfig
  onConfigChange: (updates: Partial<WorkflowConfig>) => void
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  onConfigChange
}) => {
  return (
    <div className="config-tab">
      {/* Basic Information */}
      <div className="editor-section">
        <h3>Basic Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Workflow Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => onConfigChange({ name: e.target.value })}
              placeholder="e.g., Medium Article Summarizer"
              className="form-input"
            />
          </div>
          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              value={config.description}
              onChange={(e) => onConfigChange({ description: e.target.value })}
              placeholder="Describe what this workflow does..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Trigger Configuration */}
      <TriggerConfigSection
        trigger={config.trigger}
        websiteConfig={config.websiteConfig || { type: 'all', patterns: '' }}
        onTriggerChange={(trigger) => onConfigChange({ trigger })}
        onWebsiteConfigChange={(websiteConfig) => onConfigChange({ websiteConfig })}
      />
    </div>
  )
}


import React from 'react'
import { Database, FileText, MousePointer, Target } from 'lucide-react'
import { DataPoint } from '@common/types'
import { KBEntry } from '@common/types'
import './ContextProviderBox.css'

interface ContextProviderBoxProps {
  dataPoints: DataPoint[]
  kbEntries: KBEntry[]
  providerMetas: { id: string; name: string; description: string; outputType: string }[]
  onClick?: () => void
}

export const ContextProviderBox: React.FC<ContextProviderBoxProps> = ({
  dataPoints,
  kbEntries,
  providerMetas,
  onClick
}) => {
  // Filter dataPoints to only show context providers and KB entries (same as sidebar)
  // Exclude task outputs - only show context type data points from context providers or KB
  const contextAndKBDataPoints = dataPoints.filter(dp => {
    // Show context type data points that come from context providers or KB
    // Exclude task outputs (they have type 'task_output' or source is a step ID)
    if (dp.type === 'task_output') return false
    if (dp.type === 'context' || dp.source === 'kb') return true
    // Check if it's from a context provider by matching ID with providerMetas
    return providerMetas.some(meta => dp.id === meta.id || dp.id.startsWith(meta.id + '_'))
  })

  // Group filtered data points by type
  const contextProviderDataPoints = contextAndKBDataPoints.filter(dp => {
    return dp.type === 'context' && dp.source !== 'kb' && 
           !dp.id.includes('_output') && 
           providerMetas.some(meta => dp.id === meta.id || dp.id.startsWith(meta.id + '_'))
  })

  const kbDataPoints = contextAndKBDataPoints.filter(dp => 
    dp.source === 'kb' || dp.id.startsWith('kb_')
  )

  // Map to provider metas for display
  const displayedContextProviders = contextProviderDataPoints.map(dp => {
    const meta = providerMetas.find(m => dp.id === m.id || dp.id.startsWith(m.id + '_'))
    return meta ? { ...meta, dataPoint: dp } : null
  }).filter((item): item is NonNullable<typeof item> => item !== null)

  // Map KB data points to KB entries
  const displayedKBEntries = kbDataPoints.map(dp => {
    const kbId = dp.id.startsWith('kb_') ? dp.id.replace('kb_', '') : dp.id
    const kb = kbEntries.find(k => k.id === kbId || dp.id.includes(k.id))
    return kb ? { ...kb, dataPoint: dp } : null
  }).filter((item): item is NonNullable<typeof item> => item !== null)

  // Show box if we have any context providers or KB entries in current data points
  const hasContent = displayedContextProviders.length > 0 || displayedKBEntries.length > 0

  if (!hasContent) {
    return null
  }

  // Get icon for context provider
  const getContextIcon = (providerId: string) => {
    if (providerId === 'selected_text') return MousePointer
    if (providerId === 'page_content') return FileText
    if (providerId === 'extracted_text') return Target
    return FileText
  }

  return (
    <div 
      className="context-provider-box workflow-node workflow-node-task"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="context-provider-box-header workflow-node-header">
        <div className="workflow-node-icon">
          <Database className="icon" size={20} />
        </div>
        <div className="workflow-node-info">
          <div className="workflow-node-label">Data Sources</div>
        </div>
      </div>
      
      <div className="context-provider-box-content">
        {/* Context Providers */}
        {displayedContextProviders.length > 0 && (
          <div className="context-section">
            <div className="context-items">
              {displayedContextProviders.map(({ id, name }) => {
                const IconComponent = getContextIcon(id)
                return (
                  <div key={id} className="context-item">
                    <IconComponent className="context-item-icon" size={14} />
                    <span className="context-item-name">{name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Knowledge Base */}
        {displayedKBEntries.length > 0 && (
          <div className="context-section">
            <div className="context-items">
              {displayedKBEntries.map(({ id, name }) => (
                <div key={id} className="context-item">
                  <Database className="context-item-icon" size={14} />
                  <span className="context-item-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


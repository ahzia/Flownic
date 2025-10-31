import React from 'react'
import { ChevronLeft, ChevronRight, MousePointer, FileText, Target, Zap, Database, Trash2 } from 'lucide-react'
import { DataPoint, KBEntry } from '@common/types'
import './DataPointsSidebar.css'

interface ProviderMeta {
  id: string
  name: string
  description: string
  outputType: string
}

interface DataPointsSidebarProps {
  isVisible: boolean
  dataPoints: DataPoint[]
  providerMetas: ProviderMeta[]
  onToggle: () => void
  onGatherContextData: (providerId: string) => void
  onRemoveDataPoint: (dataPointId: string) => void
  kbEntries?: KBEntry[]
  onAddKBToDataPoints?: (entry: KBEntry) => void
}

export const DataPointsSidebar: React.FC<DataPointsSidebarProps> = ({
  isVisible,
  dataPoints,
  providerMetas,
  onToggle,
  onGatherContextData,
  onRemoveDataPoint,
  kbEntries,
  onAddKBToDataPoints
}) => {
  return (
    <>
      {/* Toggle Button */}
      <button
        className={`data-points-sidebar-toggle ${isVisible ? 'visible' : ''}`}
        onClick={onToggle}
        aria-label={isVisible ? 'Hide data points' : 'Show data points'}
        type="button"
      >
        {isVisible ? <ChevronLeft className="icon" /> : <ChevronRight className="icon" />}
      </button>

      {/* Sidebar */}
      {isVisible && (
        <div className="data-points-sidebar">
          <div className="data-points-sidebar-header">
            <h3>Data Points</h3>
            <button
              className="data-points-sidebar-close"
              onClick={onToggle}
              aria-label="Close sidebar"
              type="button"
            >
              <ChevronLeft className="icon" />
            </button>
          </div>

          <div className="data-points-sidebar-content">
            {/* Context Providers */}
            <div className="data-points-section">
              <h4>Context Providers</h4>
              <div className="provider-list">
                {providerMetas.map(meta => (
                  <button
                    key={meta.id}
                    className="provider-item"
                    onClick={() => onGatherContextData(meta.id)}
                  >
                    <div className="provider-icon">
                      {meta.id === 'selected_text' && <MousePointer className="icon" />}
                      {meta.id === 'page_content' && <FileText className="icon" />}
                      {meta.id === 'extracted_text' && <Target className="icon" />}
                    </div>
                    <div className="provider-info">
                      <div className="provider-name">{meta.name}</div>
                      <div className="provider-description">{meta.description}</div>
                    </div>
                    <Zap className="icon provider-action" size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Knowledge Base */}
            {kbEntries && kbEntries.length > 0 && (
              <div className="data-points-section">
                <h4>Knowledge Base</h4>
                <div className="kb-list">
                  {kbEntries.map(e => (
                    <button
                      key={e.id}
                      className="kb-item"
                      onClick={() => onAddKBToDataPoints?.(e)}
                    >
                      <Database className="icon" size={16} />
                      <div className="kb-info">
                        <div className="kb-name">{e.name}</div>
                        <div className="kb-preview">
                          {e.content.substring(0, 50)}
                          {e.content.length > 50 ? '...' : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Data Points */}
            <div className="data-points-section">
              <h4>Current Data Points</h4>
              {dataPoints.length === 0 ? (
                <div className="empty-state">
                  <Database className="icon" size={24} />
                  <p>No data points yet</p>
                  <small>Use context providers to gather data</small>
                </div>
              ) : (
                <div className="data-points-list">
                  {dataPoints.map(dataPoint => (
                    <div key={dataPoint.id} className="data-point-item">
                      <div className="data-point-icon">
                        {dataPoint.type === 'context' && <Database className="icon" />}
                        {dataPoint.type === 'task_output' && <Zap className="icon" />}
                        {dataPoint.type === 'static' && <FileText className="icon" />}
                      </div>
                      <div className="data-point-info">
                        <div className="data-point-name">{dataPoint.name}</div>
                        <div className="data-point-meta">
                          {dataPoint.type} • {dataPoint.source}
                        </div>
                      </div>
                      <button
                        className="data-point-remove"
                        onClick={() => onRemoveDataPoint(dataPoint.id)}
                        aria-label="Remove data point"
                        type="button"
                      >
                        <Trash2 className="icon" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}


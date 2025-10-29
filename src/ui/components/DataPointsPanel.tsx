import React from 'react'
import { ChevronDown, ChevronRight, MousePointer, FileText, Target, Zap, Database, Trash2 } from 'lucide-react'
import { DataPoint } from '@common/types'

interface ProviderMeta {
  id: string
  name: string
  description: string
  outputType: string
}

interface DataPointsPanelProps {
  showDataPoints: boolean
  dataPoints: DataPoint[]
  providerMetas: ProviderMeta[]
  onToggleShow: () => void
  onGatherContextData: (providerId: string) => void
  onRemoveDataPoint: (dataPointId: string) => void
}

export const DataPointsPanel: React.FC<DataPointsPanelProps> = ({
  showDataPoints,
  dataPoints,
  providerMetas,
  onToggleShow,
  onGatherContextData,
  onRemoveDataPoint
}) => {
  return (
    <div className="editor-section">
      <div className="section-header">
        <h3>Data Points</h3>
        <button 
          className="btn btn-secondary"
          onClick={onToggleShow}
        >
          {showDataPoints ? <ChevronDown className="icon" /> : <ChevronRight className="icon" />}
          {showDataPoints ? 'Hide' : 'Show'} Data Points
        </button>
      </div>
      
      {showDataPoints && (
        <div className="data-points-container">
          <div className="data-points-header">
            <h4>Available Data Points</h4>
            <p>These are the data sources you can use in your workflow steps</p>
          </div>
          
          <div className="context-providers">
            <h5>Context Providers</h5>
            <div className="provider-grid">
              {providerMetas.map(meta => (
                <div key={meta.id} className="provider-card">
                  <div className="provider-icon">
                    {meta.id === 'selected_text' && <MousePointer className="icon" />}
                    {meta.id === 'page_content' && <FileText className="icon" />}
                    {meta.id === 'extracted_text' && <Target className="icon" />}
                  </div>
                  <div className="provider-info">
                    <h6>{meta.name}</h6>
                    <p>{meta.description}</p>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onGatherContextData(meta.id)}
                  >
                    <Zap className="icon" />
                    Gather
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="data-points-list">
            <h5>Current Data Points</h5>
            {dataPoints.length === 0 ? (
              <div className="empty-state">
                <Database className="icon" />
                <p>No data points yet. Use context providers to gather data.</p>
              </div>
            ) : (
              <div className="data-points-grid">
                {dataPoints.map(dataPoint => (
                  <div key={dataPoint.id} className="data-point-card">
                    <div className="data-point-header">
                      <div className="data-point-icon">
                        {dataPoint.type === 'context' && <Database className="icon" />}
                        {dataPoint.type === 'task_output' && <Zap className="icon" />}
                        {dataPoint.type === 'static' && <FileText className="icon" />}
                      </div>
                      <div className="data-point-info">
                        <h6>{dataPoint.name}</h6>
                        <span className="data-point-type">{dataPoint.type}</span>
                      </div>
                      <button
                        className="btn-icon danger"
                        onClick={() => onRemoveDataPoint(dataPoint.id)}
                        title="Remove data point"
                      >
                        <Trash2 className="icon" />
                      </button>
                    </div>
                    <div className="data-point-preview">
                      <code>
                        {typeof dataPoint.value === 'string' 
                          ? dataPoint.value.substring(0, 100) + (dataPoint.value.length > 100 ? '...' : '')
                          : JSON.stringify(dataPoint.value).substring(0, 100) + (JSON.stringify(dataPoint.value).length > 100 ? '...' : '')
                        }
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

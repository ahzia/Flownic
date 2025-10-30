import React, { useState, useMemo } from 'react'
import { ChevronDown, Search, Database, Clock, User } from 'lucide-react'
import { DataPointSelectorProps, DataPoint } from '@common/types'

export const DataPointSelector: React.FC<DataPointSelectorProps> = ({
  dataPoints,
  onSelect,
  selectedValue,
  placeholder = 'Select a data point...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredDataPoints = useMemo(() => {
    // Always show all data points - no type filtering for consistent experience
    // Only filter by search term
    return dataPoints.filter(dp => {
      const matchesSearch = dp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           dp.source.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [dataPoints, searchTerm])
  
  const selectedDataPoint = useMemo(() => {
    if (!selectedValue) return null
    return dataPoints.find(dp => dp.id === selectedValue.dataPointId) || null
  }, [selectedValue, dataPoints])
  
  const handleSelect = (dataPoint: DataPoint, field?: string) => {
    onSelect(dataPoint.id, field)
    setIsOpen(false)
    setSearchTerm('')
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'context':
        return <Database size={16} className="text-blue-500" />
      case 'task_output':
        return <Clock size={16} className="text-green-500" />
      case 'static':
        return <User size={16} className="text-purple-500" />
      default:
        return <Database size={16} className="text-gray-500" />
    }
  }
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'context':
        return 'Context'
      case 'task_output':
        return 'Task Output'
      case 'static':
        return 'Static'
      default:
        return type
    }
  }
  
  return (
    <div className="data-point-selector">
      <div className="data-point-selector-trigger">
        <button
          type="button"
          className={`data-point-selector-button ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className="data-point-selector-content">
            {selectedValue ? (
              <div className="data-point-selector-selected">
                {selectedDataPoint ? (
                  <>
                    {getTypeIcon(selectedDataPoint.type)}
                    <span className="data-point-selector-name">{selectedDataPoint.name}</span>
                    <span className="data-point-selector-type">
                      {getTypeLabel(selectedDataPoint.type)}
                    </span>
                  </>
                ) : (
                  <>
                    {getTypeIcon('static')}
                    <span className="data-point-selector-name">{selectedValue.dataPointId}</span>
                    <span className="data-point-selector-type">Unresolved</span>
                  </>
                )}
              </div>
            ) : (
              <span className="data-point-selector-placeholder">{placeholder}</span>
            )}
          </div>
          <ChevronDown size={16} className="data-point-selector-chevron" />
        </button>
      </div>
      
      {isOpen && (
        <div className="data-point-selector-dropdown">
          <div className="data-point-selector-search">
            <Search size={16} className="data-point-selector-search-icon" />
            <input
              type="text"
              placeholder="Search data points..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="data-point-selector-search-input"
            />
          </div>
          
          <div className="data-point-selector-list">
            {filteredDataPoints.length === 0 ? (
              <div className="data-point-selector-empty">
                <Database size={24} className="text-gray-400" />
                <p>No data points found</p>
                <small>Try adjusting your search or create a new data point</small>
              </div>
            ) : (
              filteredDataPoints.map((dataPoint) => (
                <button
                  key={dataPoint.id}
                  type="button"
                  className="data-point-selector-item"
                  onClick={() => handleSelect(dataPoint)}
                >
                  <div className="data-point-selector-item-content">
                    {getTypeIcon(dataPoint.type)}
                    <div className="data-point-selector-item-details">
                      <span className="data-point-selector-item-name">{dataPoint.name}</span>
                      <span className="data-point-selector-item-source">
                        {getTypeLabel(dataPoint.type)} • {dataPoint.source}
                      </span>
                    </div>
                  </div>
                  <div className="data-point-selector-item-meta">
                    <span className="data-point-selector-item-timestamp">
                      {new Date(dataPoint.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

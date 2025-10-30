import React, { useState, useMemo, useRef } from 'react'
import { DataPoint, DataPointReference } from '@common/types'
import { DataPointSelector } from './DataPointSelector'
import { TokenAutocomplete } from './TokenAutocomplete'

interface UniversalInputProps {
  value: any
  onChange: (value: any) => void
  type: 'text' | 'textarea' | 'number' | 'select' | 'data_point_selector'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  dataPoints?: DataPoint[]
  required?: boolean
  disabled?: boolean
  className?: string
  enableTokenAutocomplete?: boolean
}

export const UniversalInput: React.FC<UniversalInputProps> = ({
  value,
  onChange,
  type,
  placeholder,
  options = [],
  dataPoints = [],
  disabled = false,
  className = '',
  enableTokenAutocomplete = true
}) => {
  const [isDataPointMode, setIsDataPointMode] = useState(false)
  const textInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Use appropriate ref based on input type
  const inputRef = type === 'textarea' ? textareaRef : textInputRef

  const filteredDataPoints = useMemo(() => {
    // Always show all data points - no filtering by type
    // This ensures consistent experience across all input types
    return dataPoints
  }, [dataPoints])


  const getAvailableFields = (dataPoint: DataPoint): string[] => {
    if (dataPoint.value && typeof dataPoint.value === 'object') {
      return Object.keys(dataPoint.value)
    }
    return []
  }

  const renderManualInput = () => {
    const showAutocomplete = enableTokenAutocomplete && (type === 'text' || type === 'textarea') && !isDataPointMode
    
    switch (type) {
      case 'text':
        return (
          <div style={{ position: 'relative' }}>
            <input
              ref={textInputRef}
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={`universal-input-text ${className}`}
            />
            {showAutocomplete && (
              <TokenAutocomplete
                textareaRef={inputRef}
                dataPoints={dataPoints}
                onInsert={(text) => onChange(text)}
              />
            )}
          </div>
        )
      
      case 'textarea':
        return (
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={4}
              className={`universal-input-textarea ${className}`}
            />
            {showAutocomplete && (
              <TokenAutocomplete
                textareaRef={inputRef}
                dataPoints={dataPoints}
                onInsert={(text) => onChange(text)}
              />
            )}
          </div>
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={placeholder}
            disabled={disabled}
            className={`universal-input-number ${className}`}
          />
        )
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`universal-input-select ${className}`}
          >
            <option value="">{placeholder || 'Select an option...'}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      
      default:
        return null
    }
  }

  const renderDataPointInput = () => {
    return (
      <div className="universal-data-point-input">
        <DataPointSelector
          dataPoints={filteredDataPoints}
          onSelect={(dataPointId, fieldName) => {
            const dataPointRef: DataPointReference = {
              type: 'data_point',
              dataPointId,
              field: fieldName
            }
            onChange(dataPointRef)
          }}
          selectedValue={value as DataPointReference}
          placeholder="Select data point..."
        />
        
        {value && typeof value === 'object' && value.type === 'data_point' && value.dataPointId && (
          <div className="universal-field-selector">
            <label>Field:</label>
            <select
              value={value.field || ''}
              onChange={(e) => {
                const currentRef = value as DataPointReference
                onChange({ ...currentRef, field: e.target.value })
              }}
              className="universal-input-select"
            >
              <option value="">Select field...</option>
              <option value="__raw__">(Original JSON)</option>
              {(() => {
                const selectedDataPoint = dataPoints.find(dp => dp.id === value.dataPointId)
                if (selectedDataPoint) {
                  const fields = getAvailableFields(selectedDataPoint)
                  return fields.map(field => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))
                }
                return null
              })()}
            </select>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="universal-input-container">
      <div className="universal-input-tabs">
        <button
          type="button"
          className={`universal-input-tab ${!isDataPointMode ? 'active' : ''}`}
          onClick={() => setIsDataPointMode(false)}
          disabled={disabled}
        >
          Manual
        </button>
        <button
          type="button"
          className={`universal-input-tab ${isDataPointMode ? 'active' : ''}`}
          onClick={() => setIsDataPointMode(true)}
          disabled={disabled}
        >
          Data Point
        </button>
      </div>
      
      <div className="universal-input-content">
        {isDataPointMode ? renderDataPointInput() : renderManualInput()}
      </div>
    </div>
  )
}

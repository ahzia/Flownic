import React, { useState, useMemo, useRef, useEffect } from 'react'
import { DataPoint } from '@common/types'
import { DataPointSelector } from './DataPointSelector'
import { TokenAutocomplete } from './TokenAutocomplete'
import { parseToken, createToken, isPureToken } from '@utils/tokenUtils'

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
  // Convert value to string if it's an object (for backward compatibility during migration)
  const stringValue = useMemo(() => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object' && 'type' in value && value.type === 'data_point') {
      // Migrate old format to token on the fly
      const token = createToken(value.dataPointId || '', value.field)
      return token
    }
    return String(value || '')
  }, [value])
  
  const [isDataPointMode, setIsDataPointMode] = useState(false)
  const textInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Use appropriate ref based on input type
  const inputRef = type === 'textarea' ? textareaRef : textInputRef

  const filteredDataPoints = useMemo(() => {
    return dataPoints
  }, [dataPoints])

  // Parse token to get selected data point info (for data point tab display)
  const parsedToken = useMemo(() => {
    if (isPureToken(stringValue)) {
      return parseToken(stringValue)
    }
    return null
  }, [stringValue])

  const selectedDataPoint = useMemo(() => {
    if (!parsedToken) return null
    return dataPoints.find(dp => dp.id === parsedToken.dataPointId) || null
  }, [parsedToken, dataPoints])

  const getAvailableFields = (dataPoint: DataPoint): string[] => {
    if (dataPoint.value && typeof dataPoint.value === 'object') {
      return Object.keys(dataPoint.value)
    }
    return []
  }

  // Auto-switch to data point tab when switching from manual input to show field selector
  useEffect(() => {
    // If we're in data point mode and have a selected datapoint but no field selected,
    // the field selector will show automatically (handled in renderDataPointInput)
  }, [stringValue, parsedToken, selectedDataPoint, isDataPointMode])

  const handleValueChange = (newValue: string) => {
    // Always store as string (token notation)
    onChange(newValue)
  }

  const renderManualInput = () => {
    // Show autocomplete only for text/textarea when not in data point mode
    const showAutocomplete = enableTokenAutocomplete && (type === 'text' || type === 'textarea') && !isDataPointMode
    
    switch (type) {
      case 'text':
        return (
          <div style={{ position: 'relative' }}>
            <input
              ref={textInputRef}
              type="text"
              value={stringValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={`universal-input-text ${className}`}
            />
            {showAutocomplete && (
              <TokenAutocomplete
                textareaRef={inputRef}
                dataPoints={dataPoints}
                onInsert={(text) => handleValueChange(text)}
              />
            )}
          </div>
        )
      
      case 'textarea':
        return (
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={stringValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={4}
              className={`universal-input-textarea ${className}`}
            />
            {showAutocomplete && (
              <TokenAutocomplete
                textareaRef={inputRef}
                dataPoints={dataPoints}
                onInsert={(text) => handleValueChange(text)}
              />
            )}
          </div>
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={stringValue}
            onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value).toString() : '')}
            placeholder={placeholder}
            disabled={disabled}
            className={`universal-input-number ${className}`}
          />
        )
      
      case 'select':
        return (
          <>
            <select
              value={stringValue}
              onChange={(e) => handleValueChange(e.target.value)}
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
            {enableTokenAutocomplete && (
              <div style={{ marginTop: '8px' }}>
                <small style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                  Or use Manual/Data Point tabs below to enter a token
                </small>
              </div>
            )}
          </>
        )
      
      default:
        return null
    }
  }

  const renderDataPointInput = () => {
    // Create a mock DataPointReference for display (for backward compatibility with DataPointSelector)
    // But we'll convert it to token when selected
    const displayRef = parsedToken ? {
      type: 'data_point' as const,
      dataPointId: parsedToken.dataPointId,
      field: parsedToken.field
    } : undefined

    return (
      <div className="universal-data-point-input">
        <DataPointSelector
          dataPoints={filteredDataPoints}
          onSelect={(dataPointId, fieldName) => {
            // Convert to token notation when selected
            // If fieldName is already selected, switch to manual tab to show the token
            // Otherwise, stay on data point tab so user can select the field
            const token = createToken(dataPointId, fieldName)
            handleValueChange(token)
            // Only switch to manual tab if a field was already selected
            if (fieldName) {
              setIsDataPointMode(false)
            }
            // Otherwise, stay on data point tab so user can select field
          }}
          selectedValue={displayRef}
          placeholder="Select data point..."
        />
        
        {selectedDataPoint && parsedToken && (
          <div className="universal-field-selector" style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
              Field (optional):
            </label>
            <select
              value={parsedToken.field || ''}
              onChange={(e) => {
                // Update token with new field
                const token = createToken(parsedToken.dataPointId, e.target.value || undefined)
                handleValueChange(token)
                // After selecting field, optionally switch to manual tab to see the token
                if (e.target.value) {
                  // Small delay so user can see the selection
                  setTimeout(() => setIsDataPointMode(false), 300)
                }
              }}
              className="universal-input-select"
            >
              <option value="">(All data - no field)</option>
              <option value="__raw__">(Original JSON)</option>
              {(() => {
                const fields = getAvailableFields(selectedDataPoint)
                return fields.map(field => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))
              })()}
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: 'var(--color-text-secondary, #6b7280)' }}>
              Selected: {selectedDataPoint.name} ({parsedToken.dataPointId})
            </small>
          </div>
        )}
      </div>
    )
  }

  // For select type, only show tabs if token autocomplete is enabled (for language selector)
  // For other types, always show tabs
  const showTabs = type !== 'select' || enableTokenAutocomplete

  return (
    <div className="universal-input-container">
      {showTabs && (
        <div className="universal-input-tabs">
          <button
            type="button"
            className={`universal-input-tab ${!isDataPointMode ? 'active' : ''}`}
            onClick={() => setIsDataPointMode(false)}
            disabled={disabled}
          >
            {type === 'select' ? 'Manual/Select' : 'Manual'}
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
      )}
      
      <div className="universal-input-content">
        {showTabs && isDataPointMode ? renderDataPointInput() : renderManualInput()}
      </div>
    </div>
  )
}

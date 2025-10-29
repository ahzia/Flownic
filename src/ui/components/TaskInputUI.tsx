import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { TaskTemplate, HandlerTemplate, InputFieldConfig, DataPoint, DataPointReference } from '@common/types'
import { DataPointSelector } from './DataPointSelector'
import { UniversalInput } from './UniversalInput'

interface TaskInputUIProps {
  taskTemplate?: TaskTemplate | HandlerTemplate
  dataPoints: DataPoint[]
  input: Record<string, any>
  onInputChange: (input: Record<string, any>) => void
  errors?: Record<string, string>
}

export const TaskInputUI: React.FC<TaskInputUIProps> = ({
  taskTemplate,
  dataPoints,
  input,
  onInputChange,
  errors = {}
}) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  useEffect(() => {
    setFieldErrors(errors)
  }, [errors])
  
  const handleFieldChange = (fieldName: string, value: any) => {
    const newInput = { ...input, [fieldName]: value }
    onInputChange(newInput)
    
    // Clear field error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }
  
  const validateField = (field: InputFieldConfig, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`
    }
    
    if (value && field.validation) {
      if (field.validation.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
        return `${field.label} must be at least ${field.validation.minLength} characters long`
      }
      
      if (field.validation.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
        return `${field.label} must be no more than ${field.validation.maxLength} characters long`
      }
      
      if (field.validation.pattern && typeof value === 'string' && !new RegExp(field.validation.pattern).test(value)) {
        return `${field.label} does not match the required format`
      }
      
      if (field.validation.custom) {
        const customError = field.validation.custom(value)
        if (customError) return customError
      }
    }
    
    return null
  }
  
  const handleBlur = (field: InputFieldConfig) => {
    // Always validate on blur for now
    const error = validateField(field, input[field.name])
    if (error) {
      setFieldErrors(prev => ({ ...prev, [field.name]: error }))
    }
  }
  
  const renderField = (field: InputFieldConfig) => {
    const fieldError = fieldErrors[field.name] || errors[field.name]
    const hasError = !!fieldError
    
    return (
      <div key={field.name} className="task-input-field">
        <label className="task-input-label">
          {field.label}
          {field.required && <span className="task-input-required">*</span>}
        </label>
        
        <div className="task-input-field-container">
          {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'select') && (
            <UniversalInput
              value={input[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
              type={field.type}
              placeholder={field.placeholder}
              options={field.options}
              dataPoints={dataPoints}
              required={field.required}
              className={hasError ? 'error' : ''}
            />
          )}
          
          {field.type === 'boolean' && (
            <label className="task-input-checkbox">
              <input
                type="checkbox"
                checked={!!input[field.name]}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="task-input-checkbox-input"
              />
              <span className="task-input-checkbox-label">{field.label}</span>
            </label>
          )}
          
              {field.type === 'data_point_selector' && (
                <>
                  <DataPointSelector
                    dataPoints={dataPoints}
                    onSelect={(dataPointId, fieldName) => {
                      const dataPointRef: DataPointReference = {
                        type: 'data_point',
                        dataPointId,
                        field: fieldName
                      }
                      handleFieldChange(field.name, dataPointRef)
                    }}
                    selectedValue={input[field.name] as DataPointReference}
                    placeholder={field.placeholder}
                  />
                  
                  {input[field.name] && typeof input[field.name] === 'object' && (input[field.name] as DataPointReference).dataPointId && (
                    <div className="task-field-selector">
                      <label>Field:</label>
                      <select
                        value={(input[field.name] as DataPointReference).field || ''}
                        onChange={(e) => {
                          const currentRef = input[field.name] as DataPointReference
                          handleFieldChange(field.name, { ...currentRef, field: e.target.value })
                        }}
                        className="task-input-select"
                      >
                        <option value="">Select field...</option>
                        <option value="__raw__">(Original JSON)</option>
                        {(() => {
                          const selectedDataPoint = dataPoints.find(dp => dp.id === (input[field.name] as DataPointReference).dataPointId)
                          if (selectedDataPoint && selectedDataPoint.value && typeof selectedDataPoint.value === 'object') {
                            return Object.keys(selectedDataPoint.value).map(key => (
                              <option key={key} value={key}>{key}</option>
                            ))
                          }
                          return null
                        })()}
                      </select>
                    </div>
                  )}
                </>
              )}
          
          {field.type === 'language_selector' && (
            <div className="language-selector-container">
              <div className="language-selector-tabs">
                <button
                  type="button"
                  className={`language-selector-tab ${!input[field.name] || typeof input[field.name] === 'string' ? 'active' : ''}`}
                  onClick={() => handleFieldChange(field.name, '')}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className={`language-selector-tab ${input[field.name] && typeof input[field.name] === 'object' ? 'active' : ''}`}
                  onClick={() => {
                    // Switch to data point mode
                    if (typeof input[field.name] === 'string') {
                      handleFieldChange(field.name, { type: 'data_point', dataPointId: '', field: '' })
                    }
                  }}
                >
                  Data Point
                </button>
              </div>
              
              {!input[field.name] || typeof input[field.name] === 'string' ? (
                <select
                  value={input[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  className={`task-input-select ${hasError ? 'error' : ''}`}
                >
                  <option value="">{field.placeholder || 'Select language...'}</option>
                  <option value="auto">Auto-detect</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                </select>
              ) : (
                <div className="language-data-point-selector">
                  <DataPointSelector
                    dataPoints={dataPoints}
                    onSelect={(dataPointId, fieldName) => {
                      const dataPointRef: DataPointReference = {
                        type: 'data_point',
                        dataPointId,
                        field: fieldName
                      }
                      handleFieldChange(field.name, dataPointRef)
                    }}
                    selectedValue={input[field.name] as DataPointReference}
                    placeholder="Select data point..."
                  />
                  
                  {input[field.name] && typeof input[field.name] === 'object' && (input[field.name] as DataPointReference).dataPointId && (
                    <div className="language-field-selector">
                      <label>Field:</label>
                      <select
                        value={(input[field.name] as DataPointReference).field || ''}
                        onChange={(e) => {
                          const currentRef = input[field.name] as DataPointReference
                          handleFieldChange(field.name, { ...currentRef, field: e.target.value })
                        }}
                        className="task-input-select"
                      >
                        <option value="">Select field...</option>
                        <option value="__raw__">(Original JSON)</option>
                        {(() => {
                          const selectedDataPoint = dataPoints.find(dp => dp.id === (input[field.name] as DataPointReference).dataPointId)
                          if (selectedDataPoint && selectedDataPoint.value && typeof selectedDataPoint.value === 'object') {
                            return Object.keys(selectedDataPoint.value).map(key => (
                              <option key={key} value={key}>{key}</option>
                            ))
                          }
                          return null
                        })()}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {hasError && (
          <div className="task-input-error">
            <AlertCircle size={14} />
            <span>{fieldError}</span>
          </div>
        )}
      </div>
    )
  }
  
  if (!taskTemplate) {
    return <div className="task-input-ui">No task template selected</div>
  }

  return (
    <div className="task-input-ui task-input-ui--vertical">
      {taskTemplate.uiConfig.inputFields.map(renderField)}
    </div>
  )
}

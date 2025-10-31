import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { TaskTemplate, HandlerTemplate, InputFieldConfig, DataPoint } from '@common/types'
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
                <UniversalInput
                  value={input[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                  type="text"
                  dataPoints={dataPoints}
                  placeholder={field.placeholder || 'Select data point or type ${...}'}
                  enableTokenAutocomplete={true}
                  required={field.required}
                  className={hasError ? 'error' : ''}
                />
              )}
          
          {field.type === 'language_selector' && (
            <div className="language-selector-container">
              <UniversalInput
                value={input[field.name] || ''}
                onChange={(value) => {
                  // If value is empty string and it's a valid language code, keep it as language
                  // Otherwise, store as token string
                  handleFieldChange(field.name, value)
                }}
                type="select"
                dataPoints={dataPoints}
                options={field.options && field.options.length > 0
                  ? field.options
                  : [
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Spanish' },
                      { value: 'fr', label: 'French' },
                      { value: 'de', label: 'German' },
                      { value: 'it', label: 'Italian' },
                      { value: 'pt', label: 'Portuguese' },
                      { value: 'ru', label: 'Russian' },
                      { value: 'ja', label: 'Japanese' },
                      { value: 'ko', label: 'Korean' },
                      { value: 'zh', label: 'Chinese' },
                      { value: 'ar', label: 'Arabic' },
                      { value: 'hi', label: 'Hindi' }
                    ]}
                placeholder={field.placeholder || 'Select language or data point...'}
                enableTokenAutocomplete={true}
                required={field.required}
                className={hasError ? 'error' : ''}
              />
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

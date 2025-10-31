import React, { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, Info, ChevronDown, ChevronUp, Settings, Clock } from 'lucide-react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint } from '@common/types'
import { TaskInputUI } from './TaskInputUI'
import { TokenAutocomplete } from './TokenAutocomplete'

interface StepsEditorProps {
  steps: WorkflowStep[]
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onAddStep: (type: 'task' | 'handler') => void
  onRemoveStep: (stepId: string) => void
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void
}

// Separate component for condition input with autocomplete
interface ConditionInputProps {
  value: string
  onChange: (value: string) => void
  dataPoints: DataPoint[]
  placeholder?: string
}

const ConditionInput: React.FC<ConditionInputProps> = ({
  value,
  onChange,
  dataPoints,
  placeholder
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
      <TokenAutocomplete
        textareaRef={inputRef}
        dataPoints={dataPoints}
        onInsert={(text) => onChange(text)}
      />
    </div>
  )
}

export const StepsEditor: React.FC<StepsEditorProps> = ({
  steps,
  availableTasks,
  availableHandlers,
  dataPoints,
  onAddStep,
  onRemoveStep,
  onUpdateStep
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(steps.map(s => s.id)))
  const [collapsedSections, setCollapsedSections] = useState<Map<string, Set<string>>>(new Map())

  // Update expanded steps when steps change
  useEffect(() => {
    setExpandedSteps(new Set(steps.map(s => s.id)))
  }, [steps.length])

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const toggleSection = (stepId: string, section: string) => {
    setCollapsedSections(prev => {
      const next = new Map(prev)
      const stepSections = next.get(stepId) || new Set()
      const updated = new Set(stepSections)
      if (updated.has(section)) {
        updated.delete(section)
      } else {
        updated.add(section)
      }
      next.set(stepId, updated)
      return next
    })
  }

  const isStepExpanded = (stepId: string) => expandedSteps.has(stepId)
  const isSectionCollapsed = (stepId: string, section: string) => {
    return collapsedSections.get(stepId)?.has(section) || false
  }

  return (
    <div className="steps-editor-wrapper">
      <div className="section-header steps-header">
        <div className="steps-header-left">
          <h3>Workflow Steps</h3>
          <span className="steps-count">{steps.length} {steps.length === 1 ? 'step' : 'steps'}</span>
        </div>
        <div className="step-actions">
          <button className="btn btn-secondary" onClick={() => onAddStep('task')}>
            <Plus className="icon" />
            Add Task
          </button>
          <button className="btn btn-secondary" onClick={() => onAddStep('handler')}>
            <Plus className="icon" />
            Add Handler
          </button>
        </div>
      </div>

      <div className="steps-container">
        {steps.map((step, index) => {
          const isExpanded = isStepExpanded(step.id)
          const hasConfig = (step.type === 'task' && step.taskId) || (step.type === 'handler' && step.handlerId)
          const configCollapsed = isSectionCollapsed(step.id, 'config')
          const advancedCollapsed = isSectionCollapsed(step.id, 'advanced')
          
          return (
            <div key={step.id} className="workflow-step-editor">
              <div className="step-header" onClick={() => toggleStep(step.id)}>
                <div className="step-header-left">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-info">
                    <div className="step-type-badge">{step.type}</div>
                    {step.type === 'task' && step.taskId && (
                      <span className="step-title">
                        {availableTasks.find(t => t.id === step.taskId)?.name || 'Task'}
                      </span>
                    )}
                    {step.type === 'handler' && step.handlerId && (
                      <span className="step-title">
                        {availableHandlers.find(h => h.id === step.handlerId)?.name || 'Handler'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="step-header-actions">
                  <button
                    className="btn-icon step-toggle"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStep(step.id)
                    }}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveStep(step.id)
                    }}
                    title="Delete step"
                  >
                    <Trash2 className="icon" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="step-content">
                  {/* Primary Configuration */}
                  <div className="step-section-primary">
                    {step.type === 'task' && (
                      <div className="form-group step-select-group">
                        <label>
                          <Settings className="icon-small" />
                          Task Template
                        </label>
                        <select
                          value={step.taskId || ''}
                          onChange={(e) => onUpdateStep(step.id, { taskId: e.target.value })}
                          className="form-select step-select"
                        >
                          <option value="">Select a task...</option>
                          {availableTasks.map(task => (
                            <option key={task.id} value={task.id}>
                              {task.name} - {task.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {step.type === 'handler' && (
                      <div className="form-group step-select-group">
                        <label>
                          <Settings className="icon-small" />
                          Handler
                        </label>
                        <select
                          value={step.handlerId || ''}
                          onChange={(e) => onUpdateStep(step.id, { handlerId: e.target.value })}
                          className="form-select step-select"
                        >
                          <option value="">Select a handler...</option>
                          {availableHandlers.map(handler => (
                            <option key={handler.id} value={handler.id}>
                              {handler.name} - {handler.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {hasConfig && (
                      <div className={`step-config-section ${configCollapsed ? 'collapsed' : ''}`}>
                        <button
                          className="step-section-toggle"
                          onClick={() => toggleSection(step.id, 'config')}
                        >
                          <span className="step-section-title">
                            {step.type === 'task' ? 'Task Configuration' : 'Handler Configuration'}
                          </span>
                          {configCollapsed ? <ChevronDown className="icon-small" /> : <ChevronUp className="icon-small" />}
                        </button>
                        {!configCollapsed && (
                          <div className="step-section-content">
                            {step.taskId && (
                              <TaskInputUI
                                taskTemplate={availableTasks.find(t => t.id === step.taskId)}
                                dataPoints={dataPoints}
                                input={step.input || {}}
                                onInputChange={(input) => onUpdateStep(step.id, { input })}
                              />
                            )}
                            {step.handlerId && (
                              <TaskInputUI
                                taskTemplate={availableHandlers.find(h => h.id === step.handlerId)}
                                dataPoints={dataPoints}
                                input={step.input || {}}
                                onInputChange={(input) => onUpdateStep(step.id, { input })}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Advanced Options */}
                  <div className={`step-section-advanced ${advancedCollapsed ? 'collapsed' : ''}`}>
                    <button
                      className="step-section-toggle"
                      onClick={() => toggleSection(step.id, 'advanced')}
                    >
                      <span className="step-section-title">
                        <Clock className="icon-small" />
                        Advanced Options
                      </span>
                      {advancedCollapsed ? <ChevronDown className="icon-small" /> : <ChevronUp className="icon-small" />}
                    </button>
                    {!advancedCollapsed && (
                      <div className="step-section-content">
                        <div className="form-group">
                          <label>
                            <Info className="icon-small" />
                            Condition (optional)
                            <span className="form-hint" title="Boolean expression to determine if this step runs. Use ${dataPointId.field} to reference data points. Examples: '${selected_text.text}'.length > 0, '${step_output.languageCode}' == 'en'">
                              <Info className="icon-hint" />
                            </span>
                          </label>
                          <div className="condition-hint-box">
                            <div className="condition-hint-content">
                              <span className="condition-hint-label">Supports:</span>
                              <code className="condition-hint-operators">==, !=, &gt;, &gt;=, &lt;, &lt;=, &&, ||, !</code>
                            </div>
                            <div className="condition-hint-examples">
                              <span className="condition-hint-label">Examples:</span>
                              <code className="condition-hint-example">{' "${selected_text.text}" != ""'}</code>
                              <code className="condition-hint-example">{' "${lang}" == "en"'}</code>
                              <code className="condition-hint-example">{' "${score}" > 0.5'}</code>
                            </div>
                          </div>
                          <ConditionInput
                            value={step.condition || ''}
                            onChange={(value) => onUpdateStep(step.id, { condition: value })}
                            dataPoints={dataPoints}
                            placeholder='e.g., "${selected_text.text}" != ""'
                          />
                        </div>

                        <div className="form-group">
                          <label>
                            <Clock className="icon-small" />
                            Delay (seconds)
                          </label>
                          <input
                            type="number"
                            value={step.delay || 0}
                            onChange={(e) => onUpdateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                            className="form-input"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {steps.length === 0 && (
          <div className="empty-steps">
            <div className="empty-steps-icon">
              <Plus className="icon" />
            </div>
            <h4>No workflow steps yet</h4>
            <p>Add tasks and handlers to build your automation workflow</p>
            <div className="empty-steps-actions">
              <button className="btn btn-primary" onClick={() => onAddStep('task')}>
                <Plus className="icon" />
                Add Your First Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

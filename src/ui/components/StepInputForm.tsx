import React, { useRef } from 'react'
import { Info } from 'lucide-react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint } from '@common/types'
import { TaskInputUI } from './TaskInputUI'
import { TokenAutocomplete } from './TokenAutocomplete'

interface StepInputFormProps {
  step: WorkflowStep
  taskTemplate?: TaskTemplate
  handlerTemplate?: HandlerTemplate
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onUpdate: (updates: Partial<WorkflowStep>) => void
  showCondition?: boolean
  showDelay?: boolean
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
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        placeholder={placeholder}
      />
      <TokenAutocomplete
        textareaRef={inputRef}
        dataPoints={dataPoints}
        onInsert={(text) => onChange(text)}
      />
    </div>
  )
}

export const StepInputForm: React.FC<StepInputFormProps> = ({
  step,
  taskTemplate,
  handlerTemplate,
  availableTasks,
  availableHandlers,
  dataPoints,
  onUpdate,
  showCondition = true,
  showDelay = true
}) => {
  const handleTypeSelection = (type: 'task' | 'handler', id: string) => {
    if (type === 'task') {
      onUpdate({ taskId: id, input: {} })
    } else {
      onUpdate({ handlerId: id, input: {} })
    }
  }

  const handleInputChange = (input: Record<string, any>) => {
    onUpdate({ input })
  }

  return (
    <div className="step-input-form">
      {/* Type Selection */}
      <div className="form-group">
        <label>Type</label>
        <select
          value={step.type}
          onChange={(e) => {
            const newType = e.target.value as 'task' | 'handler'
            onUpdate({
              type: newType,
              taskId: undefined,
              handlerId: undefined,
              input: {}
            })
          }}
          className="form-select"
        >
          <option value="task">Task</option>
          <option value="handler">Handler</option>
        </select>
      </div>

      {/* Task/Handler Selection */}
      {step.type === 'task' && (
        <div className="form-group">
          <label>Task Template</label>
          <select
            value={step.taskId || ''}
            onChange={(e) => handleTypeSelection('task', e.target.value)}
            className="form-select"
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
        <div className="form-group">
          <label>Handler</label>
          <select
            value={step.handlerId || ''}
            onChange={(e) => handleTypeSelection('handler', e.target.value)}
            className="form-select"
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

      {/* Input Fields */}
      {step.type === 'task' && step.taskId && taskTemplate && (
        <div className="task-input-section">
          <h5>Task Configuration</h5>
          <TaskInputUI
            taskTemplate={taskTemplate}
            dataPoints={dataPoints}
            input={step.input || {}}
            onInputChange={handleInputChange}
          />
        </div>
      )}

      {step.type === 'handler' && step.handlerId && handlerTemplate && (
        <div className="handler-input-section">
          <h5>Handler Configuration</h5>
          <TaskInputUI
            taskTemplate={handlerTemplate}
            dataPoints={dataPoints}
            input={step.input || {}}
            onInputChange={handleInputChange}
          />
        </div>
      )}

      {/* Condition */}
      {showCondition && (
        <div className="form-group">
          <label>
            Condition (optional)
            <span className="form-hint" title="Boolean expression to determine if this step runs. Use ${dataPointId.field} to reference data points.">
              <Info className="icon-small" />
            </span>
          </label>
          <ConditionInput
            value={step.condition || ''}
            onChange={(value) => onUpdate({ condition: value })}
            dataPoints={dataPoints}
            placeholder='e.g., "${selected_text.text}" != ""'
          />
          <div className="form-hint-text">
            Supports: ==, !=, &gt;, &gt;=, &lt;, &lt;=, &&, ||, !
            <br />Examples: {'"${selected_text.text}"'} != "", {'"${lang}"'} == "en", {'"${score}"'} &gt; 0.5
          </div>
        </div>
      )}

      {/* Delay */}
      {showDelay && (
        <div className="form-group">
          <label>Delay (seconds)</label>
          <input
            type="number"
            value={step.delay || 0}
            onChange={(e) => onUpdate({ delay: parseInt(e.target.value) || 0 })}
            className="form-input"
            min="0"
          />
        </div>
      )}
    </div>
  )
}


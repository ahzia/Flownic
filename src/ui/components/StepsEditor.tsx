import React from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint } from '@common/types'
import { TaskInputUI } from './TaskInputUI'

interface StepsEditorProps {
  steps: WorkflowStep[]
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onAddStep: (type: 'task' | 'handler') => void
  onRemoveStep: (stepId: string) => void
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void
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
  return (
    <div className="editor-section">
      <div className="section-header">
        <h3>Workflow Steps</h3>
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
        {steps.map((step, index) => (
          <div key={step.id} className="workflow-step-editor">
            <div className="step-header">
              <div className="step-number">{index + 1}</div>
              <div className="step-type-badge">{step.type}</div>
              <button
                className="btn-icon danger"
                onClick={() => onRemoveStep(step.id)}
              >
                <Trash2 className="icon" />
              </button>
            </div>

            <div className="step-content">
              {step.type === 'task' && (
                <>
                  <div className="form-group">
                    <label>Task Template</label>
                    <select
                      value={step.taskId || ''}
                      onChange={(e) => onUpdateStep(step.id, { taskId: e.target.value })}
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

                  {step.taskId && (
                    <div className="task-input-section">
                      <h5>Task Configuration</h5>
                      <TaskInputUI
                        taskTemplate={availableTasks.find(t => t.id === step.taskId)}
                        dataPoints={dataPoints}
                        input={step.input || {}}
                        onInputChange={(input) => onUpdateStep(step.id, { input })}
                      />
                    </div>
                  )}
                </>
              )}

              {step.type === 'handler' && (
                <>
                  <div className="form-group">
                    <label>Handler</label>
                    <select
                      value={step.handlerId || ''}
                      onChange={(e) => onUpdateStep(step.id, { handlerId: e.target.value })}
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

                  {step.handlerId && (
                    <div className="handler-input-section">
                      <h5>Handler Configuration</h5>
                      <TaskInputUI
                        taskTemplate={availableHandlers.find(h => h.id === step.handlerId)}
                        dataPoints={dataPoints}
                        input={step.input || {}}
                        onInputChange={(input) => onUpdateStep(step.id, { input })}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>Delay (seconds)</label>
                <input
                  type="number"
                  value={step.delay || 0}
                  onChange={(e) => onUpdateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="empty-steps">
            <Info className="icon" />
            <p>No steps yet. Add prompts and actions to build your workflow.</p>
          </div>
        )}
      </div>
    </div>
  )
}

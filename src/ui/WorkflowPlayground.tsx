import React, { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Settings, Globe, Keyboard, Clock, Eye, Code } from 'lucide-react'
import { Workflow, WorkflowStep } from '@common/types'

interface WorkflowPlaygroundProps {
  onClose: () => void
}

export const WorkflowPlayground: React.FC<WorkflowPlaygroundProps> = ({ onClose }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state for creating/editing workflows
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: {
      type: 'manual' as 'manual' | 'onPageLoad' | 'onSelection' | 'schedule',
      pattern: '',
      selector: '',
      schedule: '',
      shortcut: ''
    },
    steps: [] as WorkflowStep[]
  })

  // Available handlers and prompt templates removed - will be replaced with task/handler system

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
      if (response.success) {
        setWorkflows(response.data || [])
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    }
  }

  const saveWorkflow = async () => {
    try {
      // Convert form trigger to WorkflowTrigger interface
      const trigger = {
        type: formData.trigger.type,
        pattern: formData.trigger.pattern || undefined,
        selector: formData.trigger.selector || undefined,
        schedule: formData.trigger.schedule || undefined
      }

      const workflow: Workflow = {
        id: selectedWorkflow?.id || `workflow_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        steps: formData.steps,
        triggers: [trigger],
        dataPoints: [],
        enabled: true,
        createdAt: selectedWorkflow?.createdAt || Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0'
      }

      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_WORKFLOW',
        data: { workflow }
      })

      if (response.success) {
        await loadWorkflows()
        setSelectedWorkflow(workflow)
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_WORKFLOW',
        data: { workflowId }
      })

      if (response.success) {
        await loadWorkflows()
        if (selectedWorkflow?.id === workflowId) {
          setSelectedWorkflow(null)
        }
      }
    } catch (error) {
      console.error('Error deleting workflow:', error)
    }
  }

  const addStep = (type: 'task' | 'handler') => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      taskId: type === 'task' ? '' : undefined,
      handlerId: type === 'handler' ? '' : undefined,
      input: {},
      condition: '',
      delay: 0
    }

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
  }

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }))
  }

  const removeStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }))
  }

  const startCreating = () => {
    setFormData({
      name: '',
      description: '',
      trigger: {
        type: 'manual',
        pattern: '',
        selector: '',
        schedule: '',
        shortcut: ''
      },
      steps: []
    })
    setSelectedWorkflow(null)
    setIsCreating(true)
  }

  const editWorkflow = (workflow: Workflow) => {
    setFormData({
      name: workflow.name,
      description: workflow.description,
      trigger: {
        type: (workflow.triggers[0]?.type === 'onFocus' ? 'manual' : workflow.triggers[0]?.type) || 'manual',
        pattern: workflow.triggers[0]?.pattern || '',
        selector: workflow.triggers[0]?.selector || '',
        schedule: workflow.triggers[0]?.schedule || '',
        shortcut: '' // This is a UI-only field for manual triggers
      },
      steps: workflow.steps
    })
    setSelectedWorkflow(workflow)
    setIsCreating(true)
  }

  // const testWorkflow = async () => {
  //   try {
  //     const response = await chrome.runtime.sendMessage({
  //       type: 'TEST_WORKFLOW',
  //       data: { workflow: selectedWorkflow }
  //     })

  //     if (response.success) {
  //       console.log('Workflow test result:', response.data)
  //     }
  //   } catch (error) {
  //     console.error('Error testing workflow:', error)
  //   }
  // }

  return (
    <div className="flownic-playground">
      {/* Header */}
      <div className="flownic-playground-header">
        <div className="flownic-playground-title">
          <Code className="flownic-icon" />
          <span>Workflow Playground</span>
        </div>
        <div className="flownic-playground-actions">
          <button
            className="flownic-btn flownic-btn-secondary"
            onClick={onClose}
          >
            Back
          </button>
        </div>
      </div>

      <div className="flownic-playground-content">
        {!isCreating ? (
          /* Workflow List */
          <div className="flownic-workflow-list">
            <div className="flownic-workflow-list-header">
              <h3>Your Workflows</h3>
              <button
                className="flownic-btn flownic-btn-primary"
                onClick={startCreating}
              >
                <Plus className="flownic-icon" />
                Create Workflow
              </button>
            </div>

            <div className="flownic-workflow-grid">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="flownic-workflow-card">
                  <div className="flownic-workflow-card-header">
                    <h4>{workflow.name}</h4>
                    <div className="flownic-workflow-actions">
                      <button
                        className="flownic-btn flownic-btn-ghost"
                        onClick={() => editWorkflow(workflow)}
                        title="Edit"
                      >
                        <Settings className="flownic-icon" />
                      </button>
                      <button
                        className="flownic-btn flownic-btn-ghost"
                        onClick={() => deleteWorkflow(workflow.id)}
                        title="Delete"
                      >
                        <Trash2 className="flownic-icon" />
                      </button>
                    </div>
                  </div>
                  <p className="flownic-workflow-description">{workflow.description}</p>
                  <div className="flownic-workflow-meta">
                    <span className="flownic-workflow-trigger">
                      {workflow.triggers[0]?.type === 'onPageLoad' && <Globe className="flownic-icon" />}
                      {workflow.triggers[0]?.type === 'manual' && <Keyboard className="flownic-icon" />}
                      {workflow.triggers[0]?.type === 'schedule' && <Clock className="flownic-icon" />}
                      {workflow.triggers[0]?.type || 'Manual'}
                    </span>
                    <span className="flownic-workflow-steps">
                      {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}

              {workflows.length === 0 && (
                <div className="flownic-empty-state">
                  <Code className="flownic-icon flownic-icon-large" />
                  <h3>No workflows yet</h3>
                  <p>Create your first workflow to automate tasks across websites</p>
                  <button
                    className="flownic-btn flownic-btn-primary"
                    onClick={startCreating}
                  >
                    <Plus className="flownic-icon" />
                    Create Your First Workflow
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Workflow Editor */
          <div className="flownic-workflow-editor">
            <div className="flownic-editor-header">
              <h3>{selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}</h3>
              <div className="flownic-editor-actions">
                <button
                  className="flownic-btn flownic-btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  className="flownic-btn flownic-btn-primary"
                  onClick={saveWorkflow}
                >
                  <Save className="flownic-icon" />
                  Save Workflow
                </button>
              </div>
            </div>

            <div className="flownic-editor-content">
              {/* Basic Info */}
              <div className="flownic-editor-section">
                <h4>Basic Information</h4>
                <div className="flownic-form-group">
                  <label>Workflow Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Medium Article Summarizer"
                    className="flownic-input"
                  />
                </div>
                <div className="flownic-form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this workflow does..."
                    className="flownic-textarea"
                    rows={3}
                  />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="flownic-editor-section">
                <h4>Trigger</h4>
                <div className="flownic-form-group">
                  <label>When to run</label>
                  <select
                    value={formData.trigger.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger: { ...prev.trigger, type: e.target.value as any }
                    }))}
                    className="flownic-select"
                  >
                    <option value="manual">Manual (keyboard shortcut)</option>
                    <option value="onPageLoad">On page load</option>
                    <option value="onSelection">On text selection</option>
                    <option value="schedule">Scheduled</option>
                  </select>
                </div>

                {formData.trigger.type === 'manual' && (
                  <div className="flownic-form-group">
                    <label>Keyboard Shortcut</label>
                    <input
                      type="text"
                      value={formData.trigger.shortcut}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, shortcut: e.target.value }
                      }))}
                      placeholder="e.g., Ctrl+Shift+S"
                      className="flownic-input"
                    />
                  </div>
                )}

                {formData.trigger.type === 'onPageLoad' && (
                  <div className="flownic-form-group">
                    <label>Website Pattern</label>
                    <input
                      type="text"
                      value={formData.trigger.pattern}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, pattern: e.target.value }
                      }))}
                      placeholder="e.g., medium.com, *.github.com"
                      className="flownic-input"
                    />
                    <small>Use * for wildcards. Leave empty for all sites.</small>
                  </div>
                )}

                {formData.trigger.type === 'onSelection' && (
                  <div className="flownic-form-group">
                    <label>CSS Selector (optional)</label>
                    <input
                      type="text"
                      value={formData.trigger.selector}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, selector: e.target.value }
                      }))}
                      placeholder="e.g., .article-content, #main"
                      className="flownic-input"
                    />
                  </div>
                )}
              </div>

              {/* Workflow Steps */}
              <div className="flownic-editor-section">
                <div className="flownic-steps-header">
                  <h4>Workflow Steps</h4>
                  <div className="flownic-step-actions">
                    <button
                      className="flownic-btn flownic-btn-secondary"
                      onClick={() => addStep('task')}
                    >
                      <Plus className="flownic-icon" />
                      Add Task
                    </button>
                    <button
                      className="flownic-btn flownic-btn-secondary"
                      onClick={() => addStep('handler')}
                    >
                      <Plus className="flownic-icon" />
                      Add Handler
                    </button>
                  </div>
                </div>

                <div className="flownic-steps-list">
                  {formData.steps.map((step, index) => (
                    <div key={step.id} className="flownic-step">
                      <div className="flownic-step-header">
                        <span className="flownic-step-number">{index + 1}</span>
                        <span className="flownic-step-type">{step.type}</span>
                        <button
                          className="flownic-btn flownic-btn-ghost"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="flownic-icon" />
                        </button>
                      </div>

                      {step.type === 'task' && (
                        <div className="flownic-step-content">
                          <div className="flownic-form-group">
                            <label>Task Template</label>
                            <select
                              value={step.taskId || ''}
                              onChange={(e) => updateStep(step.id, { taskId: e.target.value })}
                              className="flownic-select"
                            >
                              <option value="">Select a task...</option>
                              <option value="translation">Translation</option>
                              <option value="language_detection">Language Detection</option>
                              <option value="custom_prompt">Custom Prompt</option>
                            </select>
                          </div>
                          {step.taskId && (
                            <div className="flownic-task-preview">
                              <h5>Task Selected:</h5>
                              <p>{step.taskId}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {step.type === 'handler' && (
                        <div className="flownic-step-content">
                          <div className="flownic-form-group">
                            <label>Handler</label>
                            <select
                              value={step.handlerId || ''}
                              onChange={(e) => updateStep(step.id, { handlerId: e.target.value })}
                              className="flownic-select"
                            >
                              <option value="">Select a handler...</option>
                              <option value="show_modal">Show Modal</option>
                              <option value="insert_text">Insert Text</option>
                              <option value="modify_css">Modify CSS</option>
                              <option value="download_file">Download File</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="flownic-form-group">
                        <label>Delay (seconds)</label>
                        <input
                          type="number"
                          value={step.delay || 0}
                          onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                          className="flownic-input"
                          min="0"
                        />
                      </div>
                    </div>
                  ))}

                  {formData.steps.length === 0 && (
                    <div className="flownic-empty-steps">
                      <p>No steps yet. Add prompts and actions to build your workflow.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="flownic-editor-section">
                <div className="flownic-preview-header">
                  <h4>Preview</h4>
                  <button
                    className="flownic-btn flownic-btn-secondary"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="flownic-icon" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>

                {showPreview && (
                  <div className="flownic-workflow-preview">
                    <h5>{formData.name || 'Untitled Workflow'}</h5>
                    <p>{formData.description || 'No description'}</p>
                    <div className="flownic-preview-trigger">
                      <strong>Trigger:</strong> {formData.trigger.type}
                      {formData.trigger.pattern && ` (${formData.trigger.pattern})`}
                      {formData.trigger.shortcut && ` (${formData.trigger.shortcut})`}
                    </div>
                    <div className="flownic-preview-steps">
                      <strong>Steps:</strong>
                      {formData.steps.map((step, index) => (
                        <div key={step.id} className="flownic-preview-step">
                          {index + 1}. {step.type} - {step.taskId || step.handlerId}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

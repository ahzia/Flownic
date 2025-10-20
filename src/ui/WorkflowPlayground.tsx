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

  // Available handlers
  const availableHandlers = [
    { id: 'show_modal', name: 'Show Modal', description: 'Display content in a modal dialog' },
    { id: 'insert_text', name: 'Insert Text', description: 'Fill form fields with text' },
    { id: 'modify_css', name: 'Modify CSS', description: 'Inject or toggle CSS styles' },
    { id: 'parse_table_to_csv', name: 'Parse Table to CSV', description: 'Extract table data and download as CSV' },
    { id: 'download_file', name: 'Download File', description: 'Download content as a file' },
    { id: 'save_capture', name: 'Save Capture', description: 'Store structured data for later use' }
  ]

  // Built-in prompt templates
  const promptTemplates = [
    {
      id: 'summarize_content',
      name: 'Summarize Content',
      description: 'Extract key points from page content',
      prompt: 'Summarize the main content of this webpage in 3-5 key points. Focus on the most important information and insights.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false }
    },
    {
      id: 'extract_quotes',
      name: 'Extract Quotes',
      description: 'Find and extract notable quotes from the page',
      prompt: 'Extract the most notable quotes from this webpage. Include the context and author if available.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false }
    },
    {
      id: 'analyze_sentiment',
      name: 'Analyze Sentiment',
      description: 'Analyze the emotional tone of the content',
      prompt: 'Analyze the sentiment and emotional tone of this webpage content. Provide insights on the overall mood and key emotional themes.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false }
    },
    {
      id: 'extract_links',
      name: 'Extract Links',
      description: 'Find and categorize all links on the page',
      prompt: 'Extract all links from this webpage and categorize them by type (internal, external, social media, etc.).',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false }
    }
  ]

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
        enabled: true,
        createdAt: selectedWorkflow?.createdAt || Date.now(),
        updatedAt: Date.now()
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

  const addStep = (type: 'prompt' | 'action') => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      promptId: type === 'prompt' ? '' : undefined,
      action: type === 'action' ? { op: 'SHOW_MODAL', params: {} } : undefined,
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
    <div className="promptflow-playground">
      {/* Header */}
      <div className="promptflow-playground-header">
        <div className="promptflow-playground-title">
          <Code className="promptflow-icon" />
          <span>Workflow Playground</span>
        </div>
        <div className="promptflow-playground-actions">
          <button
            className="promptflow-btn promptflow-btn-secondary"
            onClick={onClose}
          >
            Back
          </button>
        </div>
      </div>

      <div className="promptflow-playground-content">
        {!isCreating ? (
          /* Workflow List */
          <div className="promptflow-workflow-list">
            <div className="promptflow-workflow-list-header">
              <h3>Your Workflows</h3>
              <button
                className="promptflow-btn promptflow-btn-primary"
                onClick={startCreating}
              >
                <Plus className="promptflow-icon" />
                Create Workflow
              </button>
            </div>

            <div className="promptflow-workflow-grid">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="promptflow-workflow-card">
                  <div className="promptflow-workflow-card-header">
                    <h4>{workflow.name}</h4>
                    <div className="promptflow-workflow-actions">
                      <button
                        className="promptflow-btn promptflow-btn-ghost"
                        onClick={() => editWorkflow(workflow)}
                        title="Edit"
                      >
                        <Settings className="promptflow-icon" />
                      </button>
                      <button
                        className="promptflow-btn promptflow-btn-ghost"
                        onClick={() => deleteWorkflow(workflow.id)}
                        title="Delete"
                      >
                        <Trash2 className="promptflow-icon" />
                      </button>
                    </div>
                  </div>
                  <p className="promptflow-workflow-description">{workflow.description}</p>
                  <div className="promptflow-workflow-meta">
                    <span className="promptflow-workflow-trigger">
                      {workflow.triggers[0]?.type === 'onPageLoad' && <Globe className="promptflow-icon" />}
                      {workflow.triggers[0]?.type === 'manual' && <Keyboard className="promptflow-icon" />}
                      {workflow.triggers[0]?.type === 'schedule' && <Clock className="promptflow-icon" />}
                      {workflow.triggers[0]?.type || 'Manual'}
                    </span>
                    <span className="promptflow-workflow-steps">
                      {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}

              {workflows.length === 0 && (
                <div className="promptflow-empty-state">
                  <Code className="promptflow-icon promptflow-icon-large" />
                  <h3>No workflows yet</h3>
                  <p>Create your first workflow to automate tasks across websites</p>
                  <button
                    className="promptflow-btn promptflow-btn-primary"
                    onClick={startCreating}
                  >
                    <Plus className="promptflow-icon" />
                    Create Your First Workflow
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Workflow Editor */
          <div className="promptflow-workflow-editor">
            <div className="promptflow-editor-header">
              <h3>{selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}</h3>
              <div className="promptflow-editor-actions">
                <button
                  className="promptflow-btn promptflow-btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  className="promptflow-btn promptflow-btn-primary"
                  onClick={saveWorkflow}
                >
                  <Save className="promptflow-icon" />
                  Save Workflow
                </button>
              </div>
            </div>

            <div className="promptflow-editor-content">
              {/* Basic Info */}
              <div className="promptflow-editor-section">
                <h4>Basic Information</h4>
                <div className="promptflow-form-group">
                  <label>Workflow Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Medium Article Summarizer"
                    className="promptflow-input"
                  />
                </div>
                <div className="promptflow-form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this workflow does..."
                    className="promptflow-textarea"
                    rows={3}
                  />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="promptflow-editor-section">
                <h4>Trigger</h4>
                <div className="promptflow-form-group">
                  <label>When to run</label>
                  <select
                    value={formData.trigger.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger: { ...prev.trigger, type: e.target.value as any }
                    }))}
                    className="promptflow-select"
                  >
                    <option value="manual">Manual (keyboard shortcut)</option>
                    <option value="onPageLoad">On page load</option>
                    <option value="onSelection">On text selection</option>
                    <option value="schedule">Scheduled</option>
                  </select>
                </div>

                {formData.trigger.type === 'manual' && (
                  <div className="promptflow-form-group">
                    <label>Keyboard Shortcut</label>
                    <input
                      type="text"
                      value={formData.trigger.shortcut}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, shortcut: e.target.value }
                      }))}
                      placeholder="e.g., Ctrl+Shift+S"
                      className="promptflow-input"
                    />
                  </div>
                )}

                {formData.trigger.type === 'onPageLoad' && (
                  <div className="promptflow-form-group">
                    <label>Website Pattern</label>
                    <input
                      type="text"
                      value={formData.trigger.pattern}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, pattern: e.target.value }
                      }))}
                      placeholder="e.g., medium.com, *.github.com"
                      className="promptflow-input"
                    />
                    <small>Use * for wildcards. Leave empty for all sites.</small>
                  </div>
                )}

                {formData.trigger.type === 'onSelection' && (
                  <div className="promptflow-form-group">
                    <label>CSS Selector (optional)</label>
                    <input
                      type="text"
                      value={formData.trigger.selector}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, selector: e.target.value }
                      }))}
                      placeholder="e.g., .article-content, #main"
                      className="promptflow-input"
                    />
                  </div>
                )}
              </div>

              {/* Workflow Steps */}
              <div className="promptflow-editor-section">
                <div className="promptflow-steps-header">
                  <h4>Workflow Steps</h4>
                  <div className="promptflow-step-actions">
                    <button
                      className="promptflow-btn promptflow-btn-secondary"
                      onClick={() => addStep('prompt')}
                    >
                      <Plus className="promptflow-icon" />
                      Add Prompt
                    </button>
                    <button
                      className="promptflow-btn promptflow-btn-secondary"
                      onClick={() => addStep('action')}
                    >
                      <Plus className="promptflow-icon" />
                      Add Action
                    </button>
                  </div>
                </div>

                <div className="promptflow-steps-list">
                  {formData.steps.map((step, index) => (
                    <div key={step.id} className="promptflow-step">
                      <div className="promptflow-step-header">
                        <span className="promptflow-step-number">{index + 1}</span>
                        <span className="promptflow-step-type">{step.type}</span>
                        <button
                          className="promptflow-btn promptflow-btn-ghost"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="promptflow-icon" />
                        </button>
                      </div>

                      {step.type === 'prompt' && (
                        <div className="promptflow-step-content">
                          <div className="promptflow-form-group">
                            <label>Prompt Template</label>
                            <select
                              value={step.promptId || ''}
                              onChange={(e) => updateStep(step.id, { promptId: e.target.value })}
                              className="promptflow-select"
                            >
                              <option value="">Select a template...</option>
                              {promptTemplates.map(template => (
                                <option key={template.id} value={template.id}>
                                  {template.name} - {template.description}
                                </option>
                              ))}
                            </select>
                          </div>
                          {step.promptId && (
                            <div className="promptflow-prompt-preview">
                              <h5>Preview:</h5>
                              <p>{promptTemplates.find(t => t.id === step.promptId)?.prompt}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {step.type === 'action' && (
                        <div className="promptflow-step-content">
                          <div className="promptflow-form-group">
                            <label>Action</label>
                            <select
                              value={step.action?.op || ''}
                              onChange={(e) => updateStep(step.id, {
                                action: { op: e.target.value, params: {} }
                              })}
                              className="promptflow-select"
                            >
                              <option value="">Select an action...</option>
                              {availableHandlers.map(handler => (
                                <option key={handler.id} value={handler.id.toUpperCase()}>
                                  {handler.name} - {handler.description}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="promptflow-form-group">
                        <label>Delay (seconds)</label>
                        <input
                          type="number"
                          value={step.delay || 0}
                          onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                          className="promptflow-input"
                          min="0"
                        />
                      </div>
                    </div>
                  ))}

                  {formData.steps.length === 0 && (
                    <div className="promptflow-empty-steps">
                      <p>No steps yet. Add prompts and actions to build your workflow.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="promptflow-editor-section">
                <div className="promptflow-preview-header">
                  <h4>Preview</h4>
                  <button
                    className="promptflow-btn promptflow-btn-secondary"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="promptflow-icon" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>

                {showPreview && (
                  <div className="promptflow-workflow-preview">
                    <h5>{formData.name || 'Untitled Workflow'}</h5>
                    <p>{formData.description || 'No description'}</p>
                    <div className="promptflow-preview-trigger">
                      <strong>Trigger:</strong> {formData.trigger.type}
                      {formData.trigger.pattern && ` (${formData.trigger.pattern})`}
                      {formData.trigger.shortcut && ` (${formData.trigger.shortcut})`}
                    </div>
                    <div className="promptflow-preview-steps">
                      <strong>Steps:</strong>
                      {formData.steps.map((step, index) => (
                        <div key={step.id} className="promptflow-preview-step">
                          {index + 1}. {step.type} - {step.promptId || step.action?.op}
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

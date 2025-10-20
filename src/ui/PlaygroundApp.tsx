import React, { useState, useEffect } from 'react'
import { 
  Plus, Save, Trash2, Settings, Globe, Keyboard, Clock, Eye, Code, 
  Play, Download, Upload, Search, Grid, List,
  AlertCircle, CheckCircle, Info
} from 'lucide-react'
import { Workflow, WorkflowStep } from '@common/types'

export const PlaygroundApp: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'onPageLoad' | 'onSelection' | 'schedule'>('all')

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

  // Available handlers with more details
  const availableHandlers = [
    { 
      id: 'show_modal', 
      name: 'Show Modal', 
      description: 'Display content in a modal dialog',
      category: 'UI',
      icon: '📱'
    },
    { 
      id: 'insert_text', 
      name: 'Insert Text', 
      description: 'Fill form fields with text',
      category: 'Form',
      icon: '✏️'
    },
    { 
      id: 'modify_css', 
      name: 'Modify CSS', 
      description: 'Inject or toggle CSS styles',
      category: 'Styling',
      icon: '🎨'
    },
    { 
      id: 'parse_table_to_csv', 
      name: 'Parse Table to CSV', 
      description: 'Extract table data and download as CSV',
      category: 'Data',
      icon: '📊'
    },
    { 
      id: 'download_file', 
      name: 'Download File', 
      description: 'Download content as a file',
      category: 'File',
      icon: '💾'
    },
    { 
      id: 'save_capture', 
      name: 'Save Capture', 
      description: 'Store structured data for later use',
      category: 'Data',
      icon: '💾'
    }
  ]

  // Enhanced prompt templates
  const promptTemplates = [
    {
      id: 'summarize_content',
      name: 'Summarize Content',
      description: 'Extract key points from page content',
      prompt: 'Summarize the main content of this webpage in 3-5 key points. Focus on the most important information and insights.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Content',
      icon: '📝'
    },
    {
      id: 'extract_quotes',
      name: 'Extract Quotes',
      description: 'Find and extract notable quotes from the page',
      prompt: 'Extract the most notable quotes from this webpage. Include the context and author if available.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Content',
      icon: '💬'
    },
    {
      id: 'analyze_sentiment',
      name: 'Analyze Sentiment',
      description: 'Analyze the emotional tone of the content',
      prompt: 'Analyze the sentiment and emotional tone of this webpage content. Provide insights on the overall mood and key emotional themes.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Analysis',
      icon: '😊'
    },
    {
      id: 'extract_links',
      name: 'Extract Links',
      description: 'Find and categorize all links on the page',
      prompt: 'Extract all links from this webpage and categorize them by type (internal, external, social media, etc.).',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Data',
      icon: '🔗'
    },
    {
      id: 'translate_content',
      name: 'Translate Content',
      description: 'Translate page content to another language',
      prompt: 'Translate the main content of this webpage to {language}. Maintain the original formatting and structure.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Content',
      icon: '🌐'
    },
    {
      id: 'extract_contact_info',
      name: 'Extract Contact Info',
      description: 'Find contact information on the page',
      prompt: 'Extract all contact information from this webpage including emails, phone numbers, and addresses.',
      context: { usePageContent: true, useSelectedText: false, useKB: false, useLastCapture: false },
      category: 'Data',
      icon: '📞'
    }
  ]

  useEffect(() => {
    loadWorkflows()
    
    // Handle back button
    const backButton = document.getElementById('backButton')
    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.preventDefault()
        window.close()
      })
    }
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
    if (confirm('Are you sure you want to delete this workflow?')) {
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

  const testWorkflow = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_WORKFLOW',
        data: { workflow: selectedWorkflow }
      })

      if (response.success) {
        alert(`Workflow test completed: ${response.data.message}`)
      }
    } catch (error) {
      console.error('Error testing workflow:', error)
    }
  }

  const exportWorkflow = (workflow: Workflow) => {
    const dataStr = JSON.stringify(workflow, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importWorkflow = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const workflow = JSON.parse(e.target?.result as string)
            editWorkflow(workflow)
          } catch (error) {
            alert('Invalid workflow file')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || workflow.triggers[0]?.type === filterType
    return matchesSearch && matchesFilter
  })

  if (!isCreating) {
    return (
      <div className="playground-app">
        {/* Header Controls */}
        <div className="playground-controls">
          <div className="playground-controls-left">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="manual">Manual</option>
              <option value="onPageLoad">On Page Load</option>
              <option value="onSelection">On Selection</option>
              <option value="schedule">Scheduled</option>
            </select>
          </div>

          <div className="playground-controls-right">
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="icon" />
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="icon" />
              </button>
            </div>

            <button className="btn btn-secondary" onClick={importWorkflow}>
              <Upload className="icon" />
              Import
            </button>

            <button className="btn btn-primary" onClick={startCreating}>
              <Plus className="icon" />
              Create Workflow
            </button>
          </div>
        </div>

        {/* Workflow List */}
        <div className={`workflow-container ${viewMode}`}>
          {filteredWorkflows.length === 0 ? (
            <div className="empty-state">
              <Code className="empty-icon" />
              <h3>No workflows found</h3>
              <p>
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first workflow to automate tasks across websites'
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <button className="btn btn-primary" onClick={startCreating}>
                  <Plus className="icon" />
                  Create Your First Workflow
                </button>
              )}
            </div>
          ) : (
            filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="workflow-card">
                <div className="workflow-card-header">
                  <div className="workflow-info">
                    <h3>{workflow.name}</h3>
                    <p>{workflow.description}</p>
                  </div>
                  <div className="workflow-actions">
                    <button
                      className="btn-icon"
                      onClick={() => testWorkflow()}
                      title="Test Workflow"
                    >
                      <Play className="icon" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => exportWorkflow(workflow)}
                      title="Export"
                    >
                      <Download className="icon" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => editWorkflow(workflow)}
                      title="Edit"
                    >
                      <Settings className="icon" />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => deleteWorkflow(workflow.id)}
                      title="Delete"
                    >
                      <Trash2 className="icon" />
                    </button>
                  </div>
                </div>

                <div className="workflow-meta">
                  <div className="workflow-trigger">
                    {workflow.triggers[0]?.type === 'onPageLoad' && <Globe className="icon" />}
                    {workflow.triggers[0]?.type === 'manual' && <Keyboard className="icon" />}
                    {workflow.triggers[0]?.type === 'schedule' && <Clock className="icon" />}
                    <span>{workflow.triggers[0]?.type || 'Manual'}</span>
                    {workflow.triggers[0]?.pattern && (
                      <span className="trigger-pattern">({workflow.triggers[0].pattern})</span>
                    )}
                  </div>
                  <div className="workflow-stats">
                    <span>{workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}</span>
                    <span className="workflow-status">
                      {workflow.enabled ? (
                        <><CheckCircle className="icon" /> Enabled</>
                      ) : (
                        <><AlertCircle className="icon" /> Disabled</>
                      )}
                    </span>
                  </div>
                </div>

                {viewMode === 'list' && (
                  <div className="workflow-steps">
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="workflow-step">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-type">{step.type}</span>
                        <span className="step-detail">
                          {step.type === 'prompt' 
                            ? promptTemplates.find(t => t.id === step.promptId)?.name || 'Custom Prompt'
                            : step.action?.op || 'Unknown Action'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="workflow-editor">
      {/* Editor Header */}
      <div className="editor-header">
        <div className="editor-title">
          <h2>{selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}</h2>
          <p>Design your AI-powered automation workflow</p>
        </div>
        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>
            Cancel
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="icon" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button className="btn btn-primary" onClick={saveWorkflow}>
            <Save className="icon" />
            Save Workflow
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          {/* Basic Information */}
          <div className="editor-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Workflow Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Medium Article Summarizer"
                  className="form-input"
                />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="editor-section">
            <h3>Trigger Configuration</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>When to run</label>
                <select
                  value={formData.trigger.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trigger: { ...prev.trigger, type: e.target.value as any }
                  }))}
                  className="form-select"
                >
                  <option value="manual">Manual (keyboard shortcut)</option>
                  <option value="onPageLoad">On page load</option>
                  <option value="onSelection">On text selection</option>
                  <option value="schedule">Scheduled</option>
                </select>
              </div>

              {formData.trigger.type === 'manual' && (
                <div className="form-group">
                  <label>Keyboard Shortcut</label>
                  <input
                    type="text"
                    value={formData.trigger.shortcut}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger: { ...prev.trigger, shortcut: e.target.value }
                    }))}
                    placeholder="e.g., Ctrl+Shift+S"
                    className="form-input"
                  />
                </div>
              )}

              {formData.trigger.type === 'onPageLoad' && (
                <div className="form-group">
                  <label>Website Pattern</label>
                  <input
                    type="text"
                    value={formData.trigger.pattern}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger: { ...prev.trigger, pattern: e.target.value }
                    }))}
                    placeholder="e.g., medium.com, *.github.com"
                    className="form-input"
                  />
                  <small>Use * for wildcards. Leave empty for all sites.</small>
                </div>
              )}

              {formData.trigger.type === 'onSelection' && (
                <div className="form-group">
                  <label>CSS Selector (optional)</label>
                  <input
                    type="text"
                    value={formData.trigger.selector}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger: { ...prev.trigger, selector: e.target.value }
                    }))}
                    placeholder="e.g., .article-content, #main"
                    className="form-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="editor-section">
            <div className="section-header">
              <h3>Workflow Steps</h3>
              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => addStep('prompt')}>
                  <Plus className="icon" />
                  Add Prompt
                </button>
                <button className="btn btn-secondary" onClick={() => addStep('action')}>
                  <Plus className="icon" />
                  Add Action
                </button>
              </div>
            </div>

            <div className="steps-container">
              {formData.steps.map((step, index) => (
                <div key={step.id} className="workflow-step-editor">
                  <div className="step-header">
                    <div className="step-number">{index + 1}</div>
                    <div className="step-type-badge">{step.type}</div>
                    <button
                      className="btn-icon danger"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="icon" />
                    </button>
                  </div>

                  <div className="step-content">
                    {step.type === 'prompt' && (
                      <div className="form-group">
                        <label>Prompt Template</label>
                        <select
                          value={step.promptId || ''}
                          onChange={(e) => updateStep(step.id, { promptId: e.target.value })}
                          className="form-select"
                        >
                          <option value="">Select a template...</option>
                          {promptTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.icon} {template.name} - {template.description}
                            </option>
                          ))}
                        </select>
                        {step.promptId && (
                          <div className="prompt-preview">
                            <h5>Preview:</h5>
                            <p>{promptTemplates.find(t => t.id === step.promptId)?.prompt}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {step.type === 'action' && (
                      <div className="form-group">
                        <label>Action</label>
                        <select
                          value={step.action?.op || ''}
                          onChange={(e) => updateStep(step.id, {
                            action: { op: e.target.value, params: {} }
                          })}
                          className="form-select"
                        >
                          <option value="">Select an action...</option>
                          {availableHandlers.map(handler => (
                            <option key={handler.id} value={handler.id.toUpperCase()}>
                              {handler.icon} {handler.name} - {handler.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Delay (seconds)</label>
                      <input
                        type="number"
                        value={step.delay || 0}
                        onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                        className="form-input"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.steps.length === 0 && (
                <div className="empty-steps">
                  <Info className="icon" />
                  <p>No steps yet. Add prompts and actions to build your workflow.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="editor-preview">
            <h3>Workflow Preview</h3>
            <div className="preview-content">
              <h4>{formData.name || 'Untitled Workflow'}</h4>
              <p>{formData.description || 'No description'}</p>
              
              <div className="preview-section">
                <h5>Trigger:</h5>
                <div className="preview-trigger">
                  {formData.trigger.type === 'onPageLoad' && <Globe className="icon" />}
                  {formData.trigger.type === 'manual' && <Keyboard className="icon" />}
                  {formData.trigger.type === 'schedule' && <Clock className="icon" />}
                  <span>{formData.trigger.type}</span>
                  {formData.trigger.pattern && <span>({formData.trigger.pattern})</span>}
                  {formData.trigger.shortcut && <span>({formData.trigger.shortcut})</span>}
                </div>
              </div>

              <div className="preview-section">
                <h5>Steps:</h5>
                {formData.steps.map((step, index) => (
                  <div key={step.id} className="preview-step">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-type">{step.type}</span>
                    <span className="step-detail">
                      {step.type === 'prompt' 
                        ? promptTemplates.find(t => t.id === step.promptId)?.name || 'Custom Prompt'
                        : step.action?.op || 'Unknown Action'
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

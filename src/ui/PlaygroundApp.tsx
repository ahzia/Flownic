import React, { useState, useEffect } from 'react'
import { 
  Plus, Save, Trash2, Settings, Globe, Keyboard, Clock, Eye, Code, 
  Play, Download, Upload, Search, Grid, List,
  AlertCircle, CheckCircle, Info, Database, FileText, MousePointer,
  Target, Zap, ChevronDown, ChevronRight
} from 'lucide-react'
import { Workflow, WorkflowStep, DataPoint, TaskTemplate, HandlerTemplate } from '@common/types'
import { ToastContainer, useToast } from './components/Toast'
import { TaskInputUI } from '@ui/components/TaskInputUI'

export const PlaygroundApp: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const toast = useToast()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'onPageLoad' | 'onSelection' | 'schedule'>('all')
  
  // Data points and templates
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([])
  const [availableTasks, setAvailableTasks] = useState<TaskTemplate[]>([])
  const [availableHandlers, setAvailableHandlers] = useState<HandlerTemplate[]>([])
  const [showDataPoints, setShowDataPoints] = useState(false)

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
    websiteConfig: {
      type: 'all' as 'all' | 'specific' | 'exclude',
      patterns: ''
    },
    steps: [] as WorkflowStep[]
  })

  // Task templates
  const taskTemplates: TaskTemplate[] = [
    {
      id: 'translation',
      name: 'Translate Text',
      description: 'Translate text from one language to another',
      category: 'language',
      apiType: 'translation',
      inputSchema: {
        type: 'object',
        required: ['text', 'targetLanguage'],
        properties: {
          text: { type: 'string', description: 'Text to translate' },
          sourceLanguage: { type: 'string', description: 'Source language (optional)' },
          targetLanguage: { type: 'string', description: 'Target language' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          translatedText: { type: 'string' },
          sourceLanguage: { type: 'string' },
          targetLanguage: { type: 'string' },
          confidence: { type: 'number' }
        }
      },
      uiConfig: {
        inputFields: [
          {
            name: 'text',
            label: 'Text to Translate',
            type: 'textarea',
            dataPointTypes: ['text', 'html'],
            required: true,
            placeholder: 'Enter text to translate or select from data points...'
          },
          {
            name: 'sourceLanguage',
            label: 'Source Language',
            type: 'language_selector',
            required: false
          },
          {
            name: 'targetLanguage',
            label: 'Target Language',
            type: 'language_selector',
            required: true
          }
        ],
        outputPreview: { type: 'structured' }
      },
      implementation: 'TranslationTask'
    },
    {
      id: 'language_detection',
      name: 'Detect Language',
      description: 'Detect the language of the input text',
      category: 'language',
      apiType: 'language_detection',
      inputSchema: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', description: 'Text to analyze' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          languageCode: { type: 'string' },
          confidence: { type: 'number' }
        }
      },
      uiConfig: {
        inputFields: [
          {
            name: 'text',
            label: 'Text to Analyze',
            type: 'textarea',
            dataPointTypes: ['text', 'html'],
            required: true,
            placeholder: 'Enter text to analyze or select from data points...'
          }
        ],
        outputPreview: { type: 'structured' }
      },
      implementation: 'LanguageDetectionTask'
    },
    {
      id: 'custom_prompt',
      name: 'Custom Prompt',
      description: 'Use a custom prompt with the AI',
      category: 'ai',
      apiType: 'prompt',
      inputSchema: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', description: 'Your custom prompt' },
          context: { type: 'string', description: 'Additional context (optional)' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          response: { type: 'string' },
          tokens: { type: 'number' },
          confidence: { type: 'number' }
        }
      },
      uiConfig: {
        inputFields: [
          {
            name: 'prompt',
            label: 'Prompt',
            type: 'textarea',
            required: true,
            placeholder: 'Enter your prompt here...'
          },
          {
            name: 'context',
            label: 'Context',
            type: 'textarea',
            dataPointTypes: ['text', 'html', 'json'],
            required: false,
            placeholder: 'Enter additional context or select from data points...'
          }
        ],
        outputPreview: { type: 'text' }
      },
      implementation: 'CustomPromptTask'
    }
  ]

  // Handler templates
  const handlerTemplates: HandlerTemplate[] = [
    {
      id: 'show_modal',
      name: 'Show Modal',
      description: 'Display text or HTML in a modal',
      category: 'ui',
      inputSchema: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' }
        }
      },
      permissions: ['activeTab'],
      uiConfig: {
        inputFields: [
          {
            name: 'title',
            label: 'Modal Title',
            type: 'text',
            required: true
          },
          {
            name: 'content',
            label: 'Modal Content',
            type: 'textarea',
            dataPointTypes: ['text', 'html'],
            required: true,
            placeholder: 'Enter modal content or select from data points...'
          }
        ]
      },
      implementation: 'show_modal'
    },
    {
      id: 'insert_text',
      name: 'Insert Text',
      description: 'Insert text into an input field',
      category: 'ui',
      inputSchema: {
        type: 'object',
        required: ['selector', 'text'],
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' }
        }
      },
      permissions: ['activeTab'],
      uiConfig: {
        inputFields: [
          {
            name: 'selector',
            label: 'CSS Selector',
            type: 'text',
            required: true,
            placeholder: 'e.g., #input-field'
          },
          {
            name: 'text',
            label: 'Text to Insert',
            type: 'text',
            dataPointTypes: ['text'],
            required: true,
            placeholder: 'Enter text or select from data points...'
          }
        ]
      },
      implementation: 'insert_text'
    }
  ]

  // Context providers for data points
  const contextProviders = [
    {
      id: 'selected_text',
      name: 'Selected Text',
      description: 'Currently selected text on the page',
      icon: <MousePointer className="icon" />,
      type: 'text'
    },
    {
      id: 'page_content',
      name: 'Page Content',
      description: 'Full HTML content of the current page',
      icon: <FileText className="icon" />,
      type: 'html'
    },
    {
      id: 'extracted_text',
      name: 'Extracted Text',
      description: 'Plain text extracted from the page (no HTML)',
      icon: <Target className="icon" />,
      type: 'text'
    }
  ]

  useEffect(() => {
    loadWorkflows()
    loadDataPoints()
    setAvailableTasks(taskTemplates)
    setAvailableHandlers(handlerTemplates)
    
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
      console.log('--- Loading workflows ---')
      const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
      console.log('GET_WORKFLOWS response:', response)
      
      if (response && response.success) {
        const workflows = response.data || []
        console.log('Loaded workflows count:', workflows.length)
        console.log('Loaded workflows:', workflows.map((w: Workflow) => ({ id: w.id, name: w.name })))
        setWorkflows(workflows)
        console.log('✅ Workflows state updated')
      } else {
        console.warn('Failed to load workflows, response:', response)
      }
    } catch (error) {
      console.error('❌ Error loading workflows:', error)
    }
  }

  const loadDataPoints = async () => {
    try {
      // Load data points from the current workflow or create default context data points
      const defaultDataPoints: DataPoint[] = contextProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: 'context',
        value: null,
        source: 'context_provider',
        timestamp: Date.now()
      }))
      
      setDataPoints(defaultDataPoints)
    } catch (error) {
      console.error('Error loading data points:', error)
    }
  }

  const addDataPoint = (dataPoint: DataPoint) => {
    setDataPoints(prev => [...prev, dataPoint])
  }

  const removeDataPoint = (dataPointId: string) => {
    setDataPoints(prev => prev.filter(dp => dp.id !== dataPointId))
  }

  const gatherContextData = async (providerId: string) => {
    try {
      // This would normally call the content script to gather data
      // For now, we'll simulate it
      const mockData = {
        selected_text: {
          text: 'This is selected text from the page',
          length: 40,
          source: 'user_selection'
        },
        page_content: {
          html: '<html><body><h1>Page Title</h1><p>Page content...</p></body></html>',
          title: 'Page Title',
          url: window.location.href,
          source: 'page_dom'
        },
        extracted_text: {
          text: 'Page Title\n\nPage content...',
          length: 25,
          source: 'text_extraction'
        }
      }

      const provider = contextProviders.find(p => p.id === providerId)
      const value = mockData[providerId as keyof typeof mockData] || { text: 'No data available' }

      const dataPoint: DataPoint = {
        id: `${providerId}_${Date.now()}`,
        name: provider?.name || providerId,
        type: 'context',
        value: value,
        source: providerId,
        timestamp: Date.now()
      }

      addDataPoint(dataPoint)
      return dataPoint
    } catch (error) {
      console.error('Error gathering context data:', error)
      return null
    }
  }

  // Normalize data point references: map dynamic playground IDs to stable runtime IDs
  const normalizeWorkflowDataPointReferences = (workflow: Workflow): Workflow => {
    const normalized = JSON.parse(JSON.stringify(workflow)) // Deep clone
    
    // Map to track step outputs
    const stepOutputMap: Record<string, string> = {}
    
    normalized.steps = normalized.steps.map((step: WorkflowStep, index: number) => {
      const normalizedStep = { ...step }
      normalizedStep.input = normalizeDataPointReferences(step.input, stepOutputMap, index)
      
      // Map this step's output ID for future steps
      if (step.type === 'task' && step.id) {
        stepOutputMap[step.id] = `${step.id}_output`
      }
      
      return normalizedStep
    })
    
    return normalized
  }
  
  const normalizeDataPointReferences = (input: any, stepOutputMap: Record<string, string>, currentStepIndex: number): any => {
    if (typeof input !== 'object' || input === null) {
      return input
    }
    
    // If this is a data point reference
    if (input.type === 'data_point') {
      const dataPointId = input.dataPointId
      
      // Check if it's a context provider (starts with context provider ID)
      if (dataPointId.startsWith('selected_text') || dataPointId === 'selected_text') {
        return {
          type: 'data_point',
          dataPointId: 'selected_text', // Stable runtime ID
          field: input.field
        }
      } else if (dataPointId.startsWith('page_content') || dataPointId === 'page_content') {
        return {
          type: 'data_point',
          dataPointId: 'page_content',
          field: input.field
        }
      } else if (dataPointId.startsWith('extracted_text') || dataPointId === 'extracted_text') {
        return {
          type: 'data_point',
          dataPointId: 'extracted_text',
          field: input.field
        }
      }
      // Check if it's a task output from a previous step
      else if (dataPointId.includes('_output_')) {
        // Extract the step ID from the output ID
        const stepId = dataPointId.split('_output_')[0]
        const normalizedOutputId = stepOutputMap[stepId] || `${stepId}_output`
        
        return {
          type: 'data_point',
          dataPointId: normalizedOutputId,
          field: input.field
        }
      }
      
      // Return as-is if we can't normalize
      return input
    }
    
    // Recursively normalize nested objects
    const normalized: any = {}
    for (const [key, value] of Object.entries(input)) {
      normalized[key] = normalizeDataPointReferences(value, stepOutputMap, currentStepIndex)
    }
    
    return normalized
  }

  const saveWorkflow = async () => {
    try {
      console.log('Saving workflow with form data:', formData)
      
      // Validate required fields
      if (!formData.name.trim()) {
        alert('Please enter a workflow name')
        return
      }
      
      if (formData.steps.length === 0) {
        alert('Please add at least one step to the workflow')
        return
      }

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
        dataPoints: [], // Workflows are templates - no actual data points
        enabled: true,
        createdAt: selectedWorkflow?.createdAt || Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
        websiteConfig: formData.websiteConfig
      }

      // Normalize data point references to use stable IDs
      const normalizedWorkflow = normalizeWorkflowDataPointReferences(workflow)
      console.log('Sending workflow to background:', normalizedWorkflow)

      // Send message with timeout
      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: 'SAVE_WORKFLOW',
          data: { workflow: normalizedWorkflow }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Save timeout: No response from background script')), 5000)
        )
      ]) as any

      console.log('Save response received:', response)
      console.log('Response type:', typeof response)
      console.log('Response keys:', response ? Object.keys(response) : 'null')

      if (response && response.success) {
        console.log('Save successful, reloading workflows...')
        toast.success('Workflow saved successfully!')
        await loadWorkflows()
        setSelectedWorkflow(normalizedWorkflow)
        setIsCreating(false)
      } else {
        const errorMsg = response?.error || 'Unknown error'
        console.error('Save failed:', errorMsg, 'Full response:', response)
        toast.error(`Failed to save workflow: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Error saving workflow: ${errorMessage}`)
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

  const toggleWorkflowEnabled = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId)
      if (!workflow) return

      const updatedWorkflow = { ...workflow, enabled: !workflow.enabled }
      
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_WORKFLOW',
        data: { workflow: updatedWorkflow }
      })

      if (response.success) {
        await loadWorkflows()
        alert(`Workflow ${updatedWorkflow.enabled ? 'enabled' : 'disabled'} successfully!`)
      } else {
        alert('Failed to update workflow status')
      }
    } catch (error) {
      console.error('Error toggling workflow status:', error)
      alert('Error updating workflow status')
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

  // Simulate task execution and add output data points
  const simulateTaskExecution = (step: WorkflowStep) => {
    if (step.type === 'task' && step.taskId) {
      const taskTemplate = availableTasks.find(t => t.id === step.taskId)
      if (taskTemplate) {
        // Create mock output based on task type
        let mockOutput: any = {}
        
        if (step.taskId === 'language_detection') {
          mockOutput = {
            language: 'Spanish',
            languageCode: 'es',
            confidence: 0.95,
            allResults: [
              { language: 'Spanish', languageCode: 'es', confidence: 0.95 },
              { language: 'Portuguese', languageCode: 'pt', confidence: 0.03 },
              { language: 'Italian', languageCode: 'it', confidence: 0.02 }
            ]
          }
        } else if (step.taskId === 'translation') {
          mockOutput = {
            translatedText: 'This is the translated text',
            sourceLanguage: 'es',
            targetLanguage: 'en',
            confidence: 0.9
          }
        } else if (step.taskId === 'custom_prompt') {
          mockOutput = {
            response: 'This is the AI response to your custom prompt',
            tokens: 150,
            confidence: 0.85
          }
        }

        // Add task output as data point
        const outputDataPoint: DataPoint = {
          id: `${step.id}_output_${Date.now()}`,
          name: `${taskTemplate.name} Output`,
          type: 'task_output',
          value: mockOutput,
          source: step.id,
          timestamp: Date.now()
        }

        addDataPoint(outputDataPoint)
      }
    }
  }

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setFormData(prev => {
      const updatedSteps = prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
      
      // If a task was just selected, simulate its execution to create output data point
      const updatedStep = updatedSteps.find(step => step.id === stepId)
      if (updatedStep && updates.taskId && updatedStep.type === 'task') {
        // Delay the simulation to allow the UI to update first
        setTimeout(() => {
          simulateTaskExecution(updatedStep)
        }, 100)
      }
      
      return {
        ...prev,
        steps: updatedSteps
      }
    })
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
      websiteConfig: {
        type: 'all',
        patterns: ''
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
      websiteConfig: workflow.websiteConfig || {
        type: 'all',
        patterns: ''
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
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
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
                    <div className="workflow-status">
                      <button
                        className={`status-toggle ${workflow.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => toggleWorkflowEnabled(workflow.id)}
                        title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                      >
                        {workflow.enabled ? (
                          <><CheckCircle className="icon" /> Enabled</>
                        ) : (
                          <><AlertCircle className="icon" /> Disabled</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === 'list' && (
                  <div className="workflow-steps">
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="workflow-step">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-type">{step.type}</span>
                        <span className="step-detail">
                          {step.type === 'task' 
                            ? 'Task'
                            : 'Handler'
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
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
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

          {/* Data Points Management */}
          <div className="editor-section">
            <div className="section-header">
              <h3>Data Points</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDataPoints(!showDataPoints)}
              >
                {showDataPoints ? <ChevronDown className="icon" /> : <ChevronRight className="icon" />}
                {showDataPoints ? 'Hide' : 'Show'} Data Points
              </button>
            </div>
            
            {showDataPoints && (
              <div className="data-points-container">
                <div className="data-points-header">
                  <h4>Available Data Points</h4>
                  <p>These are the data sources you can use in your workflow steps</p>
                </div>
                
                <div className="context-providers">
                  <h5>Context Providers</h5>
                  <div className="provider-grid">
                    {contextProviders.map(provider => (
                      <div key={provider.id} className="provider-card">
                        <div className="provider-icon">{provider.icon}</div>
                        <div className="provider-info">
                          <h6>{provider.name}</h6>
                          <p>{provider.description}</p>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => gatherContextData(provider.id)}
                        >
                          <Zap className="icon" />
                          Gather
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="data-points-list">
                  <h5>Current Data Points</h5>
                  {dataPoints.length === 0 ? (
                    <div className="empty-state">
                      <Database className="icon" />
                      <p>No data points yet. Use context providers to gather data.</p>
                    </div>
                  ) : (
                    <div className="data-points-grid">
                      {dataPoints.map(dataPoint => (
                        <div key={dataPoint.id} className="data-point-card">
                          <div className="data-point-header">
                            <div className="data-point-icon">
                              {dataPoint.type === 'context' && <Database className="icon" />}
                              {dataPoint.type === 'task_output' && <Zap className="icon" />}
                              {dataPoint.type === 'static' && <FileText className="icon" />}
                            </div>
                            <div className="data-point-info">
                              <h6>{dataPoint.name}</h6>
                              <span className="data-point-type">{dataPoint.type}</span>
                            </div>
                            <button
                              className="btn-icon danger"
                              onClick={() => removeDataPoint(dataPoint.id)}
                              title="Remove data point"
                            >
                              <Trash2 className="icon" />
                            </button>
                          </div>
                          <div className="data-point-preview">
                            <code>
                              {typeof dataPoint.value === 'string' 
                                ? dataPoint.value.substring(0, 100) + (dataPoint.value.length > 100 ? '...' : '')
                                : JSON.stringify(dataPoint.value).substring(0, 100) + (JSON.stringify(dataPoint.value).length > 100 ? '...' : '')
                              }
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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

          {/* Website Configuration */}
          <div className="editor-section">
            <h3>Website Configuration</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Run on websites</label>
                <select
                  value={formData.websiteConfig.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    websiteConfig: { ...prev.websiteConfig, type: e.target.value as any }
                  }))}
                  className="form-select"
                >
                  <option value="all">All websites</option>
                  <option value="specific">Specific websites only</option>
                  <option value="exclude">All websites except</option>
                </select>
              </div>

              {(formData.websiteConfig.type === 'specific' || formData.websiteConfig.type === 'exclude') && (
                <div className="form-group">
                  <label>
                    {formData.websiteConfig.type === 'specific' ? 'Website patterns' : 'Excluded patterns'}
                  </label>
                  <textarea
                    value={formData.websiteConfig.patterns}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      websiteConfig: { ...prev.websiteConfig, patterns: e.target.value }
                    }))}
                    placeholder="Enter one pattern per line:&#10;medium.com&#10;*.github.com&#10;example.com/path"
                    className="form-textarea"
                    rows={4}
                  />
                  <small>
                    Use * for wildcards. One pattern per line. Examples: medium.com, *.github.com, example.com/path
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="editor-section">
            <div className="section-header">
              <h3>Workflow Steps</h3>
              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => addStep('task')}>
                  <Plus className="icon" />
                  Add Task
                </button>
                <button className="btn btn-secondary" onClick={() => addStep('handler')}>
                  <Plus className="icon" />
                  Add Handler
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
                    {step.type === 'task' && (
                      <>
                        <div className="form-group">
                          <label>Task Template</label>
                          <select
                            value={step.taskId || ''}
                            onChange={(e) => updateStep(step.id, { taskId: e.target.value })}
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
                              onInputChange={(input) => updateStep(step.id, { input })}
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
                            onChange={(e) => updateStep(step.id, { handlerId: e.target.value })}
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
                              onInputChange={(input) => updateStep(step.id, { input })}
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
                      {step.type === 'task' 
                        ? 'Task'
                        : 'Handler'
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

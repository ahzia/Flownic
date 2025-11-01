import React, { useState, useEffect } from 'react'
import { 
  Plus, Save, Trash2, Settings, Globe, Keyboard, Clock, Eye, Code, 
  Play, Download, Upload, Search, Grid, List,
  AlertCircle, CheckCircle, Database
} from 'lucide-react'
import { Workflow, WorkflowStep, DataPoint, TaskTemplate, HandlerTemplate, WorkflowTrigger } from '@common/types'
import { migrateWorkflowToTokenNotation, needsMigration } from '@utils/workflowMigration'
import { extractTokens, parseToken } from '@utils/tokenUtils'
import { repairWorkflow } from '@core/utils/WorkflowRepair'
import { WorkflowValidator } from '@core/utils/WorkflowValidator'
import { ToastContainer, useToast } from './components/Toast'
import { DataPointsSidebar } from '@ui/components/DataPointsSidebar'
import { WorkflowEditorTabs, WorkflowEditorTab } from '@ui/components/WorkflowEditorTabs'
import { AIWorkflowGeneratorModal } from '@ui/components/AIWorkflowGeneratorModal'
import { KnowledgeBasePanel } from '@ui/components/KnowledgeBasePanel'
import { KBEntry } from '@common/types'
import { getKBEntries } from '@utils/kb'
import { TaskRegistry } from '@core/TaskRegistry'
import { HandlerRegistry } from '@core/HandlerRegistry'
import { ContextProviderRegistry } from '@context/ContextProviderRegistry'

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
  const [activeTab, setActiveTab] = useState<WorkflowEditorTab>('visual')
  const [providerMetas, setProviderMetas] = useState<{ id: string; name: string; description: string; outputType: string }[]>([])
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([])
  const [showKBManager, setShowKBManager] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  // Form state for creating/editing workflows
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: {
      type: 'manual' as 'manual' | 'onPageLoad' | 'onSelection' | 'onFocus' | 'schedule',
      pattern: '',
      selector: '',
      schedule: '',
      shortcut: ''
    } as WorkflowTrigger,
    websiteConfig: {
      type: 'all' as 'all' | 'specific' | 'exclude',
      patterns: ''
    },
    steps: [] as WorkflowStep[]
  })


  // Load context provider metadata from registry
  const loadContextProviders = () => {
    try {
      const registry = new ContextProviderRegistry()
      const metas = registry.getAllMeta()
      setProviderMetas(metas)
    } catch (error) {
      console.error('❌ Error loading context providers:', error)
      // Fallback to minimal built-ins if registry fails
      setProviderMetas([
        { id: 'selected_text', name: 'Selected Text', description: 'Currently selected text on the page', outputType: 'text' },
        { id: 'page_content', name: 'Page Content', description: 'Full HTML content of the current page', outputType: 'html' },
        { id: 'extracted_text', name: 'Extracted Text', description: 'Plain text extracted from the page (no HTML tags)', outputType: 'text' }
      ])
    }
  }

  useEffect(() => {
    loadWorkflows()
    loadDataPoints()
    loadContextProviders()
    loadTasks()
    loadHandlers()
    loadKB()
    
    // Handle back button
    const backButton = document.getElementById('backButton')
    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.preventDefault()
        window.close()
      })
    }
  }, [])
  const loadKB = async () => {
    try {
      const list = await getKBEntries()
      setKbEntries(list)
    } catch (e) {
      console.warn('Failed to load KB entries:', e)
    }
  }
  
  const loadTasks = () => {
    try {
      // Load tasks from TaskRegistry (now statically imported)
      const registry = new TaskRegistry()
      const templates = registry.getAllTemplates()
      
      if (!templates || templates.length === 0) {
        throw new Error('No templates returned from TaskRegistry')
      }
      
      console.log('✅ Loaded tasks from TaskRegistry:', templates.length, 'tasks:', templates.map((t: TaskTemplate) => t.name))
      setAvailableTasks(templates)
    } catch (error) {
      console.error('❌ Error loading tasks from TaskRegistry:', error)
      setAvailableTasks([])
      // Show error to user instead of fallback
      alert('Failed to load task templates. Please refresh the page.')
    }
  }
  
  const loadHandlers = () => {
    try {
      // Load handlers from HandlerRegistry (now statically imported)
      const registry = new HandlerRegistry()
      const templates = registry.getAllTemplates()
      setAvailableHandlers(templates)
      console.log('✅ Loaded handlers:', templates.length, 'handlers:', templates.map(h => h.id))
    } catch (error) {
      console.error('❌ Error loading handlers:', error)
      setAvailableHandlers([])
      // Show error to user instead of fallback
      alert('Failed to load handler templates. Please refresh the page.')
    }
  }

  const loadWorkflows = async () => {
    try {
      console.log('--- Loading workflows ---')
      const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
      console.log('GET_WORKFLOWS response:', response)
      
      if (response && response.success) {
        const workflows = (response.data || []).map((w: Workflow) => {
          // Auto-migrate old format workflows to token notation
          if (needsMigration(w)) {
            console.log(`🔄 Migrating workflow ${w.id} to token notation`)
            const migrated = migrateWorkflowToTokenNotation(w)
            // Save migrated version back
            chrome.runtime.sendMessage({
              type: 'SAVE_WORKFLOW',
              data: { workflow: migrated }
            }).catch(err => console.warn('Failed to save migrated workflow:', err))
            return migrated
          }
          return w
        })
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
      const defaultDataPoints: DataPoint[] = providerMetas.map(meta => ({
        id: meta.id,
        name: meta.name,
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

  const hydrateTaskOutputDataPoints = (workflow: Workflow) => {
    try {
      const registry = new TaskRegistry()
      const synthesized: DataPoint[] = []

      for (const step of workflow.steps) {
        if (step.type === 'task' && step.taskId) {
          const task = registry.getTask(step.taskId)
          if (!task || !step.id) continue
          const mockOutput = task.generateMockOutput()
          const dpId = `${step.id}_output`
          // Avoid duplicates if already present
          const exists = dataPoints.some(dp => dp.id === dpId)
          if (!exists) {
            synthesized.push({
              id: dpId,
              name: `${task.name} Output`,
              type: 'task_output',
              value: mockOutput,
              source: step.id,
              timestamp: Date.now()
            })
          }
        }
      }

      if (synthesized.length > 0) {
        setDataPoints(prev => [...prev, ...synthesized])
      }
    } catch (e) {
      console.warn('Hydration of task output data points failed:', e)
    }
  }

  const collectReferencedDataPointIdsFromTokens = (obj: any, acc: Set<string>) => {
    if (typeof obj === 'string') {
      // Extract tokens from string using token utils
      const tokens = extractTokens(obj)
      for (const token of tokens) {
        const parsed = parseToken(token)
        if (parsed) {
          acc.add(parsed.dataPointId)
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => collectReferencedDataPointIdsFromTokens(item, acc))
    } else if (obj && typeof obj === 'object') {
      // Also check for legacy DataPointReference format (for backward compatibility)
      if (obj.type === 'data_point' && typeof obj.dataPointId === 'string') {
        acc.add(obj.dataPointId)
      }
      // Recurse into object values
      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
          collectReferencedDataPointIdsFromTokens(value, acc)
        } else if (typeof value === 'string') {
          collectReferencedDataPointIdsFromTokens(value, acc)
        }
      }
    }
  }

  const hydrateContextProviderDataPoints = async (workflow: Workflow) => {
    try {
      // Gather all referenced dataPointIds from tokens in step inputs and conditions
      const referenced = new Set<string>()
      for (const step of workflow.steps) {
        // Check step input
        if (step.input) {
          collectReferencedDataPointIdsFromTokens(step.input, referenced)
        }
        // Check step condition
        if (step.condition && typeof step.condition === 'string') {
          collectReferencedDataPointIdsFromTokens(step.condition, referenced)
        }
      }

      // Determine provider ids dynamically from registry metadata, with safe fallbacks
      const providerIds = new Set<string>(
        (providerMetas && providerMetas.length > 0
          ? providerMetas.map(p => p.id)
          : ['selected_text', 'page_content', 'extracted_text'])
      )

      const missingProviderIds: string[] = []
      const missingKBIds: string[] = []

      referenced.forEach(id => {
        // Check if it's a KB entry (starts with kb_)
        if (id.startsWith('kb_')) {
          const kbId = id.replace('kb_', '')
          const exists = dataPoints.some(dp => dp.id === id || dp.id.startsWith(id + '_'))
          if (!exists) {
            missingKBIds.push(kbId)
          }
        }
        // Check if it's a context provider (not a step output or KB)
        else if (providerIds.has(id) && !id.includes('_output')) {
          const exists = dataPoints.some(dp => dp.id === id || dp.id.startsWith(id + '_'))
          if (!exists) {
            missingProviderIds.push(id)
          }
        }
      })

      // Add missing KB entries to data points
      if (missingKBIds.length > 0) {
        missingKBIds.forEach(kbId => {
          const kbEntry = kbEntries.find(kb => kb.id === kbId)
          if (kbEntry) {
            addDataPoint({
              id: `kb_${kbEntry.id}`,
              name: `KB: ${kbEntry.name}`,
              type: 'context',
              value: { text: kbEntry.content, title: kbEntry.name, source: 'kb' },
              source: 'kb',
              timestamp: Date.now()
            })
          }
        })
      }

      // Add missing context providers
      if (missingProviderIds.length > 0) {
        await Promise.all(missingProviderIds.map(pid => gatherContextData(pid, true)))
      }
    } catch (e) {
      console.warn('Hydration of context provider data points failed:', e)
    }
  }

  const gatherContextData = async (providerId: string, stableId = false) => {
    try {
      // Prefer real execution via background -> content script in future; for now keep mock for UX
      const meta = providerMetas.find(p => p.id === providerId)
      const value: any = meta?.outputType === 'html'
        ? { html: '<html><body><h1>Example</h1><p>Content...</p></body></html>', source: providerId }
        : { text: 'Sample context value', source: providerId }

      const dataPoint: DataPoint = {
        id: stableId ? providerId : `${providerId}_${Date.now()}`,
        name: meta?.name || providerId,
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
        schedule: formData.trigger.schedule || undefined,
        shortcut: formData.trigger.shortcut || undefined
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

      // Workflow is already in token notation format
      console.log('Sending workflow to background:', workflow)

      // Send message with timeout
      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: 'SAVE_WORKFLOW',
          data: { workflow }
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
        setSelectedWorkflow(workflow)
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
        try {
          // Get the actual task instance from TaskRegistry
          const taskRegistry = new TaskRegistry()
          const taskInstance = taskRegistry.getTask(taskTemplate.id)
          
          if (taskInstance) {
            // Generate mock output using the task instance
            const mockOutput = taskInstance.generateMockOutput()
            
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
            console.log('✅ Added task output data point:', outputDataPoint.name)
          } else {
            console.warn('⚠️ Task instance not found for:', taskTemplate.id)
          }
        } catch (error) {
          console.error('❌ Error simulating task execution:', error)
        }
      } else {
        console.warn('⚠️ Task template not found for:', step.taskId)
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
        // Call simulation after state update
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

  // Reset form to default empty values
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger: {
        type: 'manual' as 'manual' | 'onPageLoad' | 'onSelection' | 'onFocus' | 'schedule',
        pattern: '',
        selector: '',
        schedule: '',
        shortcut: ''
      } as WorkflowTrigger,
      websiteConfig: {
        type: 'all' as 'all' | 'specific' | 'exclude',
        patterns: ''
      },
      steps: []
    })
    setSelectedWorkflow(null)
    setDataPoints([])
    setActiveTab('visual')
  }

  const editWorkflow = (workflow: Workflow) => {
    setFormData({
      name: workflow.name,
      description: workflow.description,
      trigger: {
        type: (workflow.triggers && workflow.triggers[0]?.type) || 'manual',
        pattern: workflow.triggers && (workflow.triggers[0]?.pattern || ''),
        selector: workflow.triggers && (workflow.triggers[0]?.selector || ''),
        schedule: workflow.triggers && (workflow.triggers[0]?.schedule || ''),
        shortcut: workflow.triggers && (workflow.triggers[0]?.shortcut || '')
      },
      websiteConfig: workflow.websiteConfig || {
        type: 'all',
        patterns: ''
      },
      steps: workflow.steps
    })
    setSelectedWorkflow(workflow)
    setIsCreating(true)
    // Hydrate synthesized data points for task outputs so selectors resolve
    hydrateTaskOutputDataPoints(workflow)
    // Hydrate context provider data points that are referenced
    hydrateContextProviderDataPoints(workflow)
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
            let workflow = JSON.parse(e.target?.result as string)
            
            // Migrate if needed
            if (needsMigration(workflow)) {
              workflow = migrateWorkflowToTokenNotation(workflow)
              toast.info('Workflow migrated to token notation')
            }
            
            // Repair broken step output references
            const repairResult = repairWorkflow(workflow)
            if (repairResult.repaired) {
              workflow = repairResult.workflow
              toast.success(`Repaired ${repairResult.fixedCount} step output reference(s)`)
              
              // Show repair suggestions
              if (repairResult.suggestions.length > 0) {
                const suggestionsList = repairResult.suggestions
                  .slice(0, 3)
                  .map(s => `• ${s.field}: ${s.reason}`)
                  .join('\n')
                console.log('🔧 Repair suggestions:', suggestionsList)
              }
            }
            
            // Validate workflow
            const validator = new WorkflowValidator()
            const validationResult = validator.validateWorkflow(workflow)
            
            if (validationResult.errors.length > 0) {
              const errorCount = validationResult.errors.length
              const warningCount = validationResult.warnings.length
              toast.warning(`Imported workflow has ${errorCount} error(s) and ${warningCount} warning(s). Please review before saving.`)
              console.warn('Validation errors:', validationResult.errors)
              console.warn('Validation warnings:', validationResult.warnings)
            } else if (validationResult.warnings.length > 0) {
              toast.info(`Imported workflow has ${validationResult.warnings.length} warning(s)`)
            }
            
            editWorkflow(workflow)
          } catch (error) {
            toast.error('Invalid workflow file')
            console.error('Error importing workflow:', error)
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

            <button className="btn btn-secondary" onClick={() => setShowKBManager(true)}>
              <Database className="icon" />
              Manage Knowledge Base
            </button>

            <button className="btn btn-primary" onClick={() => setShowAIGenerator(true)}>
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
                <button className="btn btn-primary" onClick={() => setShowAIGenerator(true)}>
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

        {showKBManager && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h3>Manage Knowledge Base</h3>
                <button className="btn btn-secondary" onClick={async () => { setShowKBManager(false); await loadKB() }}>Close</button>
              </div>
              <div className="modal-body">
                <KnowledgeBasePanel />
              </div>
            </div>
          </div>
        )}

        {/* AI Workflow Generator Modal */}
        <AIWorkflowGeneratorModal
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onWorkflowGenerated={(workflow) => {
            editWorkflow(workflow)
            setShowAIGenerator(false)
            toast.success('Workflow generated successfully! You can now review and edit it.')
          }}
          onManualCreate={() => {
            resetForm()
            setIsCreating(true)
            setShowAIGenerator(false)
          }}
        />
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
          <button className="btn btn-secondary" onClick={() => {
            resetForm()
            setIsCreating(false)
          }}>
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
        {/* Data Points Sidebar */}
        <DataPointsSidebar
          isVisible={showDataPoints}
          dataPoints={dataPoints}
          providerMetas={providerMetas}
          onToggle={() => setShowDataPoints(!showDataPoints)}
          onGatherContextData={gatherContextData}
          onRemoveDataPoint={removeDataPoint}
          kbEntries={kbEntries}
          onAddKBToDataPoints={(entry) => addDataPoint({
            id: `kb_${entry.id}`,
            name: `KB: ${entry.name}`,
            type: 'context',
            value: { text: entry.content, title: entry.name, source: 'kb' },
            source: 'kb',
            timestamp: Date.now()
          })}
        />

        {/* Main Editor Area */}
        <div className={`editor-main ${showDataPoints ? 'with-sidebar' : ''}`}>
          <WorkflowEditorTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            config={{
              name: formData.name,
              description: formData.description,
              trigger: formData.trigger,
              websiteConfig: formData.websiteConfig
            }}
            onConfigChange={(updates) => {
              setFormData(prev => ({
                ...prev,
                name: updates.name ?? prev.name,
                description: updates.description ?? prev.description,
                trigger: updates.trigger ?? prev.trigger,
                websiteConfig: updates.websiteConfig ?? prev.websiteConfig
              }))
            }}
            steps={formData.steps}
            availableTasks={availableTasks}
            availableHandlers={availableHandlers}
            dataPoints={dataPoints}
            providerMetas={providerMetas}
            kbEntries={kbEntries}
            onToggleDataPoints={() => setShowDataPoints(!showDataPoints)}
            onAddStep={addStep}
            onRemoveStep={removeStep}
            onUpdateStep={updateStep}
            onUpdateTrigger={(trigger) => setFormData(prev => ({ ...prev, trigger }))}
          />
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

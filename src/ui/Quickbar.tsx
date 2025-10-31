import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Sparkles, Settings, History, X, Play, Clock, Globe } from 'lucide-react'
import { Workflow } from '@common/types'
import { clsx } from 'clsx'

interface QuickbarProps {
  isOpen: boolean
  onClose: () => void
  onWorkflowExecute: (workflow: Workflow) => void
}

export const Quickbar: React.FC<QuickbarProps> = ({
  isOpen,
  onClose,
  onWorkflowExecute
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const quickbarRef = useRef<HTMLDivElement>(null)

  // Load workflows from storage
  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' })
      
      if (response?.success) {
        const loadedWorkflows = (response.data || []) as Workflow[]
        // Only show enabled workflows in Quickbar
        const enabledWorkflows = loadedWorkflows.filter(w => w.enabled)
        setWorkflows(enabledWorkflows)
        setFilteredWorkflows(enabledWorkflows)
      } else {
        setError('Failed to load workflows')
        setWorkflows([])
        setFilteredWorkflows([])
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
      setError('Error loading workflows')
      setWorkflows([])
      setFilteredWorkflows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Search/filter workflows
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWorkflows(workflows)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = workflows.filter(workflow => {
      const nameMatch = workflow.name.toLowerCase().includes(query)
      const descMatch = workflow.description?.toLowerCase().includes(query)
      
      // Search in trigger shortcuts
      const shortcutMatch = workflow.triggers?.some(t => 
        t.shortcut?.toLowerCase().includes(query)
      )
      
      return nameMatch || descMatch || shortcutMatch
    })

    setFilteredWorkflows(filtered)
  }, [searchQuery, workflows])

  // Load workflows when Quickbar opens
  useEffect(() => {
    if (isOpen) {
      loadWorkflows()
    }
  }, [isOpen, loadWorkflows])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Get workflow shortcut display
  const getWorkflowShortcut = (workflow: Workflow): string | null => {
    const manualTrigger = workflow.triggers?.find(t => t.type === 'manual')
    return manualTrigger?.shortcut || null
  }

  // Get trigger type display
  const getTriggerTypes = (workflow: Workflow): string[] => {
    const types: string[] = []
    workflow.triggers?.forEach(trigger => {
      if (trigger.type === 'onPageLoad') types.push('On Page Load')
      if (trigger.type === 'onSelection') types.push('On Selection')
      if (trigger.type === 'manual' && trigger.shortcut) types.push(`Shortcut: ${trigger.shortcut}`)
    })
    return types
  }

  // Handle workflow execution
  const handleExecuteWorkflow = useCallback((workflow: Workflow) => {
    if (workflow && onWorkflowExecute) {
      onWorkflowExecute(workflow)
      onClose()
    }
  }, [onWorkflowExecute, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown' && filteredWorkflows.length > 0) {
        e.preventDefault()
        const currentIndex = selectedWorkflow 
          ? filteredWorkflows.findIndex(w => w.id === selectedWorkflow.id)
          : -1
        const nextIndex = currentIndex < filteredWorkflows.length - 1 ? currentIndex + 1 : 0
        setSelectedWorkflow(filteredWorkflows[nextIndex])
      } else if (e.key === 'ArrowUp' && filteredWorkflows.length > 0) {
        e.preventDefault()
        const currentIndex = selectedWorkflow
          ? filteredWorkflows.findIndex(w => w.id === selectedWorkflow.id)
          : -1
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredWorkflows.length - 1
        setSelectedWorkflow(filteredWorkflows[prevIndex])
      } else if (e.key === 'Enter' && selectedWorkflow) {
        e.preventDefault()
        handleExecuteWorkflow(selectedWorkflow)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, filteredWorkflows, selectedWorkflow, onClose, handleExecuteWorkflow])

  // Handle workflow click/selection
  const handleWorkflowClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    handleExecuteWorkflow(workflow)
  }

  if (!isOpen) return null

  return (
    <div className="flownic-quickbar-overlay" onClick={onClose}>
      <div 
        ref={quickbarRef}
        className="flownic-quickbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flownic-quickbar-header">
          <div className="flownic-quickbar-title">
            <Sparkles className="flownic-icon" />
            <span>Flownic</span>
          </div>
          <div className="flownic-quickbar-actions">
            <button
              className="flownic-btn flownic-btn-ghost"
              onClick={() => {/* TODO: Open settings */}}
              title="Settings"
            >
              <Settings className="flownic-icon" />
            </button>
            <button
              className="flownic-btn flownic-btn-ghost"
              onClick={() => {/* TODO: Open history */}}
              title="History"
            >
              <History className="flownic-icon" />
            </button>
            <button
              className="flownic-btn flownic-btn-ghost"
              onClick={onClose}
              title="Close"
            >
              <X className="flownic-icon" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flownic-quickbar-content">
          {/* Search Input */}
          <div className="flownic-input-group">
            <Search className="flownic-input-icon" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className="flownic-input"
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="flownic-error">
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flownic-loading">
              <div className="flownic-spinner" />
              <span>Loading workflows...</span>
            </div>
          )}

          {/* Workflows List */}
          {!isLoading && (
            <div className="flownic-workflows-list">
              {filteredWorkflows.length === 0 ? (
                <div className="flownic-empty-state">
                  <Sparkles className="flownic-icon" style={{ opacity: 0.5 }} />
                  <p>
                    {searchQuery 
                      ? 'No workflows found matching your search'
                      : 'No enabled workflows found. Create workflows in the Playground.'}
                  </p>
                </div>
              ) : (
                filteredWorkflows.map((workflow) => {
                  const shortcut = getWorkflowShortcut(workflow)
                  const triggerTypes = getTriggerTypes(workflow)
                  const isSelected = selectedWorkflow?.id === workflow.id

                  return (
                    <button
                      key={workflow.id}
                      className={clsx(
                        'flownic-workflow-item',
                        isSelected && 'flownic-workflow-item-selected'
                      )}
                      onClick={() => handleWorkflowClick(workflow)}
                      onMouseEnter={() => setSelectedWorkflow(workflow)}
                    >
                      <div className="flownic-workflow-header">
                        <div className="flownic-workflow-info">
                          <h3 className="flownic-workflow-name">{workflow.name}</h3>
                          {workflow.description && (
                            <p className="flownic-workflow-description">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                        <Play className="flownic-icon flownic-icon-play" />
                      </div>
                      
                      <div className="flownic-workflow-meta">
                        {shortcut && (
                          <span className="flownic-workflow-shortcut">
                            <Clock className="flownic-icon-small" />
                            {shortcut}
                          </span>
                        )}
                        {workflow.websiteConfig && workflow.websiteConfig.type !== 'all' && (
                          <span className="flownic-workflow-website">
                            <Globe className="flownic-icon-small" />
                            {workflow.websiteConfig.type === 'specific' ? 'Specific sites' : 'Excluded sites'}
                          </span>
                        )}
                        {workflow.steps && (
                          <span className="flownic-workflow-steps">
                            {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {triggerTypes.length > 0 && (
                        <div className="flownic-workflow-triggers">
                          {triggerTypes.map((type, idx) => (
                            <span key={idx} className="flownic-trigger-tag">
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flownic-quickbar-footer">
          <div className="flownic-quickbar-hints">
            <span>↑↓ Navigate</span>
            <span>Enter Run</span>
            <span>Esc Close</span>
          </div>
          {filteredWorkflows.length > 0 && (
            <div className="flownic-workflow-count">
              {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

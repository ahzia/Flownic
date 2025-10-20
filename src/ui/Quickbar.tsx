import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Sparkles, Settings, History, X, Check, AlertTriangle } from 'lucide-react'
import { ActionPlan, PromptTemplate } from '@common/types'
import { validateActionPlan } from '@common/schemas'
import { clsx } from 'clsx'

interface QuickbarProps {
  isOpen: boolean
  onClose: () => void
  onActionPlanGenerated: (actionPlan: ActionPlan) => void
}

interface ContextState {
  selectedText: string
  pageContent: string
  kbContent: string
  lastCapture: unknown
}

export const Quickbar: React.FC<QuickbarProps> = ({
  isOpen,
  onClose,
  onActionPlanGenerated
}) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<ContextState>({
    selectedText: '',
    pageContent: '',
    kbContent: '',
    lastCapture: null
  })
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const quickbarRef = useRef<HTMLDivElement>(null)

  // Built-in templates
  const builtInTemplates: PromptTemplate[] = [
    {
      id: 'summarize',
      name: 'Summarize',
      description: 'Summarize the selected text or page content',
      prompt: 'Summarize the following content in 2-3 key points:',
      category: 'content',
      tags: ['summarize', 'content'],
      context: {
        useSelectedText: true,
        usePageContent: true,
        useKB: false,
        useLastCapture: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'translate',
      name: 'Translate',
      description: 'Translate text to another language',
      prompt: 'Translate the following text to English (or specify language):',
      category: 'language',
      tags: ['translate', 'language'],
      context: {
        useSelectedText: true,
        usePageContent: false,
        useKB: false,
        useLastCapture: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'capture_job',
      name: 'Capture Job',
      description: 'Extract job requirements and details',
      prompt: 'Extract key information from this job posting including requirements, responsibilities, and company details:',
      category: 'workflow',
      tags: ['job', 'capture', 'workflow'],
      context: {
        useSelectedText: false,
        usePageContent: true,
        useKB: false,
        useLastCapture: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'tailor_cv',
      name: 'Tailor CV',
      description: 'Tailor CV content for a specific job',
      prompt: 'Based on this job description, tailor my CV to highlight relevant experience and skills:',
      category: 'workflow',
      tags: ['cv', 'tailor', 'workflow'],
      context: {
        useSelectedText: false,
        usePageContent: false,
        useKB: true,
        useLastCapture: true
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'proofread',
      name: 'Proofread',
      description: 'Check grammar and improve writing',
      prompt: 'Proofread and improve the grammar, style, and clarity of this text:',
      category: 'writing',
      tags: ['proofread', 'grammar', 'writing'],
      context: {
        useSelectedText: true,
        usePageContent: false,
        useKB: false,
        useLastCapture: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'rewrite',
      name: 'Rewrite',
      description: 'Rewrite text with different style or tone',
      prompt: 'Rewrite the following text with a more professional tone:',
      category: 'writing',
      tags: ['rewrite', 'style', 'writing'],
      context: {
        useSelectedText: true,
        usePageContent: false,
        useKB: false,
        useLastCapture: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]

  useEffect(() => {
    setTemplates(builtInTemplates)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const loadContext = useCallback(async () => {
    try {
      // Get selected text
      const selectedText = window.getSelection()?.toString() || ''
      
      // Get page content (simplified)
      const pageContent = document.body.innerText.substring(0, 2000)
      
      // Get KB content (placeholder)
      const kbContent = ''
      
      // Get last capture (placeholder)
      const lastCapture = null

      setContext({
        selectedText,
        pageContent,
        kbContent,
        lastCapture
      })
    } catch (error) {
      console.error('Error loading context:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadContext()
    }
  }, [isOpen, loadContext])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setActionPlan(null)

    try {
      // Use selected template or raw query
      const prompt = selectedTemplate 
        ? `${selectedTemplate.prompt}\n\n${buildContextString(selectedTemplate.context)}`
        : query

      // Send to background script for AI processing
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_ACTION_PLAN',
        data: { prompt, context }
      })

      if (response.success) {
        const plan = response.data
        if (validateActionPlan(plan)) {
          setActionPlan(plan)
          setShowPreview(true)
        } else {
          setError('Invalid action plan received from AI')
        }
      } else {
        setError(response.error || 'Failed to generate action plan')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const buildContextString = (templateContext: PromptTemplate['context']): string => {
    let contextString = ''
    
    if (templateContext.useSelectedText && context.selectedText) {
      contextString += `Selected Text:\n${context.selectedText}\n\n`
    }
    
    if (templateContext.usePageContent && context.pageContent) {
      contextString += `Page Content:\n${context.pageContent}\n\n`
    }
    
    if (templateContext.useKB && context.kbContent) {
      contextString += `Knowledge Base:\n${context.kbContent}\n\n`
    }
    
    if (templateContext.useLastCapture && context.lastCapture) {
      contextString += `Last Capture:\n${JSON.stringify(context.lastCapture, null, 2)}\n\n`
    }
    
    return contextString.trim()
  }

  const handleExecuteActionPlan = () => {
    if (actionPlan) {
      onActionPlanGenerated(actionPlan)
      onClose()
    }
  }

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setQuery(template.prompt)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="promptflow-quickbar-overlay">
      <div 
        ref={quickbarRef}
        className="promptflow-quickbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="promptflow-quickbar-header">
          <div className="promptflow-quickbar-title">
            <Sparkles className="promptflow-icon" />
            <span>PromptFlow</span>
          </div>
          <div className="promptflow-quickbar-actions">
            <button
              className="promptflow-btn promptflow-btn-ghost"
              onClick={() => {/* TODO: Open settings */}}
              title="Settings"
            >
              <Settings className="promptflow-icon" />
            </button>
            <button
              className="promptflow-btn promptflow-btn-ghost"
              onClick={() => {/* TODO: Open history */}}
              title="History"
            >
              <History className="promptflow-icon" />
            </button>
            <button
              className="promptflow-btn promptflow-btn-ghost"
              onClick={onClose}
              title="Close"
            >
              <X className="promptflow-icon" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="promptflow-quickbar-content">
          {/* Templates */}
          <div className="promptflow-templates">
            {templates.map((template) => (
              <button
                key={template.id}
                className={clsx(
                  'promptflow-template',
                  selectedTemplate?.id === template.id && 'promptflow-template-selected'
                )}
                onClick={() => handleTemplateSelect(template)}
                title={template.description}
              >
                <span className="promptflow-template-name">{template.name}</span>
                <span className="promptflow-template-desc">{template.description}</span>
              </button>
            ))}
          </div>

          {/* Query Input */}
          <form onSubmit={handleSubmit} className="promptflow-query-form">
            <div className="promptflow-input-group">
              <Search className="promptflow-input-icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask AI to do something..."
                className="promptflow-input"
                disabled={isLoading}
              />
              <button
                type="submit"
                className={clsx(
                  'promptflow-btn promptflow-btn-primary',
                  isLoading && 'promptflow-btn-loading'
                )}
                disabled={!query.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="promptflow-spinner" />
                ) : (
                  <Sparkles className="promptflow-icon" />
                )}
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="promptflow-error">
              <AlertTriangle className="promptflow-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Plan Preview */}
          {showPreview && actionPlan && (
            <div className="promptflow-preview">
              <div className="promptflow-preview-header">
                <h3>Action Plan Preview</h3>
                <div className="promptflow-confidence">
                  Confidence: {Math.round(actionPlan.metadata.confidence * 100)}%
                </div>
              </div>
              
              <div className="promptflow-actions">
                {actionPlan.actions.map((action, index) => (
                  <div key={index} className="promptflow-action">
                    <div className="promptflow-action-op">{action.op}</div>
                    <div className="promptflow-action-params">
                      {JSON.stringify(action.params, null, 2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="promptflow-preview-actions">
                <button
                  className="promptflow-btn promptflow-btn-secondary"
                  onClick={() => setShowPreview(false)}
                >
                  Cancel
                </button>
                <button
                  className="promptflow-btn promptflow-btn-primary"
                  onClick={handleExecuteActionPlan}
                >
                  <Check className="promptflow-icon" />
                  Execute
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Context Info */}
        <div className="promptflow-context-info">
          <div className="promptflow-context-item">
            <span className="promptflow-context-label">Selected:</span>
            <span className="promptflow-context-value">
              {context.selectedText ? `${context.selectedText.length} chars` : 'None'}
            </span>
          </div>
          <div className="promptflow-context-item">
            <span className="promptflow-context-label">Page:</span>
            <span className="promptflow-context-value">
              {context.pageContent ? 'Available' : 'None'}
            </span>
          </div>
          <div className="promptflow-context-item">
            <span className="promptflow-context-label">KB:</span>
            <span className="promptflow-context-value">
              {context.kbContent ? 'Available' : 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

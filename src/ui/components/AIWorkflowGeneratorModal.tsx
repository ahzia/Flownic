import React, { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { Modal } from './common/Modal'
import { AIWorkflowGenerator, GenerateWorkflowResult } from '@core/utils/AIWorkflowGenerator'
import './AIWorkflowGeneratorModal.css'

interface AIWorkflowGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onWorkflowGenerated: (workflow: any) => void
  onManualCreate?: () => void
}

type GenerationState = 'idle' | 'generating' | 'success' | 'error' | 'validation_warning'

export const AIWorkflowGeneratorModal: React.FC<AIWorkflowGeneratorModalProps> = ({
  isOpen,
  onClose,
  onWorkflowGenerated,
  onManualCreate
}) => {
  const [userQuery, setUserQuery] = useState('')
  const [state, setState] = useState<GenerationState>('idle')
  const [result, setResult] = useState<GenerateWorkflowResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generator = new AIWorkflowGenerator()

  const handleGenerate = async () => {
    if (!userQuery.trim()) {
      return
    }

    setIsGenerating(true)
    setState('generating')

    try {
      const generationResult = await generator.generateWorkflow({ userQuery })

      setResult(generationResult)

      // Determine state based on result
      if (generationResult.workflow && generationResult.validationResult) {
        // If workflow exists but has validation issues
        if (generationResult.validationResult.errors.length > 0) {
          setState('validation_warning') // Show warnings/errors but allow user to review and fix
        } else if (generationResult.validationResult.warnings.length > 0) {
          setState('validation_warning')
        } else {
          setState('success')
        }
      } else if (generationResult.success && generationResult.workflow) {
        setState('success')
      } else {
        setState('error')
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
      setState('error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAccept = () => {
    if (result?.workflow) {
      onWorkflowGenerated(result.workflow)
      handleClose()
    }
  }

  const handleRegenerate = () => {
    setResult(null)
    setState('idle')
  }

  const handleClose = () => {
    setUserQuery('')
    setResult(null)
    setState('idle')
    setIsGenerating(false)
    onClose()
  }

  const canGenerate = userQuery.trim().length > 0 && !isGenerating

  return (
      <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workflow"
      size="large"
      closeOnOutsideClick={!isGenerating}
    >
      <div className="ai-workflow-generator-modal">
        {state === 'idle' && (
          <div className="generator-input">
            <label className="generator-label">
              <Sparkles className="icon" size={20} />
              Describe what you want your workflow to do
            </label>
            <textarea
              className="generator-textarea"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="e.g., Translate selected text to English and show result in a modal, or Summarize the current page content and save it to knowledge base..."
              rows={6}
              disabled={isGenerating}
            />
            <div className="generator-examples">
              <p className="examples-title">Examples:</p>
              <ul className="examples-list">
                <li>"Translate selected text to Spanish and show in modal"</li>
                <li>"Detect language of selected text, if not English then translate to English"</li>
                <li>"Summarize page content and save to knowledge base"</li>
                <li>"Proofread selected text and replace it with corrected version"</li>
              </ul>
            </div>
            <div className="generator-actions">
              {onManualCreate && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    handleClose()
                    onManualCreate()
                  }}
                  disabled={isGenerating}
                  type="button"
                >
                  Create Manual Workflow
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isGenerating}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={!canGenerate}
                type="button"
              >
                <Sparkles className="icon" size={16} />
                Generate with AI
              </button>
            </div>
          </div>
        )}

        {state === 'generating' && (
          <div className="generator-loading">
            <Loader2 className="loading-spinner" size={48} />
            <h3>Generating Workflow...</h3>
            <p>AI is creating your workflow based on your description. This may take a few seconds.</p>
            <button
              className="btn btn-secondary"
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        )}

        {state === 'success' && result?.workflow && (
          <div className="generator-result success">
            <div className="result-header">
              <CheckCircle className="icon success-icon" size={24} />
              <h3>Workflow Generated Successfully!</h3>
            </div>
            <div className="result-preview">
              <div className="preview-item">
                <strong>Name:</strong> {result.workflow.name}
              </div>
              <div className="preview-item">
                <strong>Description:</strong> {result.workflow.description || 'No description'}
              </div>
              <div className="preview-item">
                <strong>Trigger:</strong> {result.workflow.triggers[0]?.type || 'manual'}
              </div>
              <div className="preview-item">
                <strong>Steps:</strong> {result.workflow.steps.length} step(s)
              </div>
              {result.workflow.steps.length > 0 && (
                <div className="preview-steps">
                  {result.workflow.steps.map((step, index) => (
                    <div key={step.id || index} className="preview-step">
                      {index + 1}. {step.type === 'task' ? `Task: ${step.taskId}` : `Handler: ${step.handlerId}`}
                    </div>
                  ))}
                </div>
              )}
              {result.repairResult && result.repairResult.repaired && (
                <div className="result-repairs">
                  <AlertCircle className="icon" size={16} style={{ color: '#3b82f6' }} />
                  <strong>Auto-repaired:</strong> Fixed {result.repairResult.fixedCount} step output reference(s)
                  {result.repairResult.suggestions.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.9em' }}>View repair details</summary>
                      <ul style={{ marginTop: '8px', fontSize: '0.85em', paddingLeft: '20px' }}>
                        {result.repairResult.suggestions.slice(0, 5).map((suggestion, idx) => (
                          <li key={idx}>
                            <strong>{suggestion.field}:</strong> {suggestion.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              {result.validationResult && result.validationResult.warnings.length > 0 && (
                <div className="result-warnings">
                  <h4>Warnings:</h4>
                  <ul>
                    {result.validationResult.warnings.map((warning, index) => (
                      <li key={index}><strong>{warning.field}:</strong> {warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="result-actions">
              <button
                className="btn btn-secondary"
                onClick={handleRegenerate}
                type="button"
              >
                <RefreshCw className="icon" size={16} />
                Regenerate
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                type="button"
              >
                Use This Workflow
              </button>
            </div>
          </div>
        )}

        {state === 'validation_warning' && result?.workflow && (
          <div className="generator-result warning">
            <div className="result-header">
              <AlertCircle className="icon warning-icon" size={24} />
              <h3>Workflow Generated with Issues</h3>
            </div>
            <div className="result-preview">
              <div className="preview-item">
                <strong>Name:</strong> {result.workflow.name}
              </div>
              {result.repairResult && result.repairResult.repaired && (
                <div className="result-repairs" style={{ marginTop: '12px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #3b82f6' }}>
                  <AlertCircle className="icon" size={16} style={{ color: '#3b82f6', display: 'inline', marginRight: '8px' }} />
                  <strong>Auto-repaired:</strong> Fixed {result.repairResult.fixedCount} step output reference(s)
                </div>
              )}
              {result.validationResult && result.validationResult.errors.length > 0 && (
                <div className="result-errors" style={{ marginTop: '12px' }}>
                  <h4 style={{ color: '#dc2626' }}>Errors (must be fixed):</h4>
                  <ul>
                    {result.validationResult.errors.map((error, index) => (
                      <li key={index} style={{ color: '#dc2626' }}>
                        <strong>{error.field}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.validationResult && result.validationResult.warnings.length > 0 && (
                <div className="result-warnings" style={{ marginTop: '12px' }}>
                  <h4>Warnings (can be fixed manually):</h4>
                  <ul>
                    {result.validationResult.warnings.map((warning, index) => (
                      <li key={index}><strong>{warning.field}:</strong> {warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="result-actions">
              <button
                className="btn btn-secondary"
                onClick={handleRegenerate}
                type="button"
              >
                <RefreshCw className="icon" size={16} />
                Regenerate
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                type="button"
              >
                Use & Edit Manually
              </button>
            </div>
          </div>
        )}

        {state === 'error' && result && (
          <div className="generator-result error">
            <div className="result-header">
              <AlertCircle className="icon error-icon" size={24} />
              <h3>Generation Failed</h3>
            </div>
            <div className="result-error">
              <p className="error-message">{result.error || 'Unknown error occurred'}</p>
              {result.validationResult && result.validationResult.errors.length > 0 && (
                <div className="validation-errors">
                  <h4>Validation Errors:</h4>
                  <ul>
                    {result.validationResult.errors.map((error, index) => (
                      <li key={index}>
                        <strong>{error.field}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.rawResponse && (
                <details className="raw-response">
                  <summary>Show Raw Response</summary>
                  <pre>{result.rawResponse}</pre>
                </details>
              )}
            </div>
            <div className="result-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                type="button"
              >
                Close
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRegenerate}
                type="button"
              >
                <RefreshCw className="icon" size={16} />
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}


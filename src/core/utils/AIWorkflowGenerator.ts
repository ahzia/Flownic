import { Workflow } from '@common/types'
import { WorkflowPromptBuilder } from './WorkflowPromptBuilder'
import { parseJSONWithRepair } from './JSONRepair'
import { WorkflowValidator, ValidationResult } from './WorkflowValidator'
import { migrateWorkflowToTokenNotation } from '@utils/workflowMigration'
import { repairWorkflow, RepairResult } from './WorkflowRepair'

export interface GenerateWorkflowOptions {
  userQuery: string
}

export interface GenerateWorkflowResult {
  success: boolean
  workflow?: Workflow
  rawResponse?: string
  validationResult?: ValidationResult
  repairResult?: RepairResult
  error?: string
  needsMigration?: boolean
}

/**
 * Service for generating workflows using AI
 */
export class AIWorkflowGenerator {
  private promptBuilder: WorkflowPromptBuilder
  private validator: WorkflowValidator

  constructor() {
    this.promptBuilder = new WorkflowPromptBuilder()
    this.validator = new WorkflowValidator()
  }

  /**
   * Generate a workflow from user query using Chrome Prompt API
   */
  async generateWorkflow(options: GenerateWorkflowOptions): Promise<GenerateWorkflowResult> {
    try {
      // Build the system prompt
      const systemPrompt = this.promptBuilder.buildPrompt(options.userQuery)

      // Call Chrome Prompt API
      const rawResponse = await this.callPromptAPI(systemPrompt)

      if (!rawResponse) {
        return {
          success: false,
          error: 'No response from AI. Please try again.',
          rawResponse
        }
      }

      // Parse JSON from response
      const parseResult = parseJSONWithRepair(rawResponse)

      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse JSON response',
          rawResponse,
          needsMigration: false
        }
      }

      let workflowData = parseResult.data

      // Add required fields if missing
      workflowData = this.normalizeWorkflow(workflowData)

      // Check if migration is needed (for token notation)
      const needsMigration = this.needsTokenMigration(workflowData)
      if (needsMigration) {
        workflowData = migrateWorkflowToTokenNotation(workflowData)
      }

      // Repair broken step output references
      const repairResult = repairWorkflow(workflowData)
      if (repairResult.repaired) {
        console.log(`🔧 Repaired ${repairResult.fixedCount} step output reference(s)`)
        workflowData = repairResult.workflow
      }

      // Validate the workflow
      const validationResult = this.validator.validateWorkflow(workflowData)

      // Convert to Workflow type
      const workflow: Workflow = {
        id: workflowData.id || `workflow_${Date.now()}`,
        name: workflowData.name || 'Untitled Workflow',
        description: workflowData.description || '',
        steps: workflowData.steps || [],
        triggers: workflowData.triggers || [],
        dataPoints: workflowData.dataPoints || [],
        enabled: workflowData.enabled !== undefined ? workflowData.enabled : true,
        createdAt: workflowData.createdAt || Date.now(),
        updatedAt: workflowData.updatedAt || Date.now(),
        version: workflowData.version || '1.0.0',
        websiteConfig: workflowData.websiteConfig
      }

      // Consider it successful if workflow is created, even with warnings
      // Errors should prevent use, but warnings are acceptable
      const hasErrors = validationResult.errors.length > 0

      return {
        success: !hasErrors,
        workflow: !hasErrors ? workflow : undefined,
        rawResponse,
        validationResult,
        repairResult,
        needsMigration,
        error: hasErrors
          ? `Validation failed: ${validationResult.errors.map(e => e.message).join('; ')}`
          : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        needsMigration: false
      }
    }
  }

  /**
   * Call Chrome Prompt API via background script or directly if available
   */
  private async callPromptAPI(prompt: string): Promise<string> {
    try {
      // Try direct access first (for content scripts)
      if (typeof (self as any).LanguageModel !== 'undefined') {
        const availability = await (self as any).LanguageModel.availability({})
        if (availability === 'unavailable') {
          throw new Error('Chrome LanguageModel is not available on this device')
        }

        const session = await (self as any).LanguageModel.create({})
        const response = await session.prompt(prompt, {})
        session.destroy()
        return response || ''
      }

      // Fallback: Use background script
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GENERATE_WORKFLOW_AI',
          data: { prompt }
        })

        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to generate workflow via background script')
        }

        return response.data || ''
      } catch (msgError) {
        throw new Error(`Chrome LanguageModel API is not available and background script call failed: ${msgError instanceof Error ? msgError.message : 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error calling Prompt API:', error)
      throw new Error(`Failed to call Prompt API: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Normalize workflow data - add missing required fields
   */
  private normalizeWorkflow(data: any): any {
    const normalized = { ...data }

    // Ensure triggers array exists
    if (!normalized.triggers || !Array.isArray(normalized.triggers)) {
      normalized.triggers = [{ type: 'manual' }]
    }

    // Ensure steps array exists
    if (!normalized.steps || !Array.isArray(normalized.steps)) {
      normalized.steps = []
    }

    // Ensure websiteConfig exists
    if (!normalized.websiteConfig) {
      normalized.websiteConfig = { type: 'all', patterns: '' }
    }

    // Normalize step IDs if needed
    normalized.steps = normalized.steps.map((step: any, index: number) => {
      if (!step.id || typeof step.id !== 'string') {
        step.id = `step_${Date.now()}_${index}`
      }
      return step
    })

    return normalized
  }

  /**
   * Check if workflow needs token migration
   */
  private needsTokenMigration(workflow: any): boolean {
    // Simple check - if workflow has object notation references, it needs migration
    // This is a heuristic since migrateWorkflowToTokenNotation will handle the actual conversion
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      return false
    }

    return workflow.steps.some((step: any) => {
      if (!step.input || typeof step.input !== 'object') {
        return false
      }

      // Check if input contains object notation
      const inputStr = JSON.stringify(step.input)
      return inputStr.includes('"type":"data_point"')
    })
  }
}


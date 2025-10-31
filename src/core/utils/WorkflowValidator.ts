import { TaskRegistry } from '@core/TaskRegistry'
import { HandlerRegistry } from '@core/HandlerRegistry'
import { parseToken } from '@utils/tokenUtils'

export interface ValidationError {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Enhanced validator for AI-generated workflows
 */
export class WorkflowValidator {
  private taskRegistry: TaskRegistry
  private handlerRegistry: HandlerRegistry

  constructor(taskRegistry?: TaskRegistry, handlerRegistry?: HandlerRegistry) {
    this.taskRegistry = taskRegistry || new TaskRegistry()
    this.handlerRegistry = handlerRegistry || new HandlerRegistry()
  }

  /**
   * Validate a complete workflow
   */
  validateWorkflow(workflow: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Validate basic structure
    if (!workflow || typeof workflow !== 'object') {
      errors.push({ field: 'workflow', message: 'Workflow must be an object', level: 'error' })
      return { valid: false, errors, warnings }
    }

    // Validate required top-level fields
    if (!workflow.name || typeof workflow.name !== 'string') {
      errors.push({ field: 'name', message: 'Workflow name is required and must be a string', level: 'error' })
    }

    if (!workflow.description || typeof workflow.description !== 'string') {
      warnings.push({ field: 'description', message: 'Workflow description is recommended', level: 'warning' })
    }

    // Validate triggers
    if (!Array.isArray(workflow.triggers) || workflow.triggers.length === 0) {
      errors.push({ field: 'triggers', message: 'At least one trigger is required', level: 'error' })
    } else {
      workflow.triggers.forEach((trigger: any, index: number) => {
        this.validateTrigger(trigger, index, errors, warnings)
      })
    }

    // Validate websiteConfig
    if (workflow.websiteConfig) {
      this.validateWebsiteConfig(workflow.websiteConfig, errors, warnings)
    }

    // Validate steps
    if (!Array.isArray(workflow.steps)) {
      errors.push({ field: 'steps', message: 'Steps must be an array', level: 'error' })
    } else if (workflow.steps.length === 0) {
      warnings.push({ field: 'steps', message: 'Workflow has no steps', level: 'warning' })
    } else {
      workflow.steps.forEach((step: any, index: number) => {
        this.validateStep(step, index, workflow.steps, errors, warnings)
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate a trigger
   */
  private validateTrigger(trigger: any, index: number, errors: ValidationError[], warnings: ValidationError[]): void {
    const prefix = `triggers[${index}]`

    if (!trigger.type || typeof trigger.type !== 'string') {
      errors.push({ field: `${prefix}.type`, message: 'Trigger type is required', level: 'error' })
      return
    }

    const validTypes = ['manual', 'onPageLoad', 'onSelection', 'onFocus', 'schedule']
    if (!validTypes.includes(trigger.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Invalid trigger type '${trigger.type}'. Must be one of: ${validTypes.join(', ')}`,
        level: 'error'
      })
    }

    // Validate type-specific fields
    if (trigger.type === 'manual' && trigger.shortcut && typeof trigger.shortcut !== 'string') {
      errors.push({ field: `${prefix}.shortcut`, message: 'Shortcut must be a string', level: 'error' })
    }

    if (trigger.type === 'onPageLoad' && trigger.pattern && typeof trigger.pattern !== 'string') {
      errors.push({ field: `${prefix}.pattern`, message: 'Pattern must be a string', level: 'error' })
    }

    if (trigger.type === 'onSelection' && trigger.selector && typeof trigger.selector !== 'string') {
      errors.push({ field: `${prefix}.selector`, message: 'Selector must be a string', level: 'error' })
    }

    if (trigger.type === 'schedule' && !trigger.schedule) {
      warnings.push({ field: `${prefix}.schedule`, message: 'Schedule trigger should have a schedule field', level: 'warning' })
    }
  }

  /**
   * Validate websiteConfig
   */
  private validateWebsiteConfig(config: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!config.type || !['all', 'specific', 'exclude'].includes(config.type)) {
      errors.push({
        field: 'websiteConfig.type',
        message: "Website config type must be 'all', 'specific', or 'exclude'",
        level: 'error'
      })
    }

    if ((config.type === 'specific' || config.type === 'exclude') && !config.patterns) {
      warnings.push({
        field: 'websiteConfig.patterns',
        message: 'Patterns should be provided for specific/exclude types',
        level: 'warning'
      })
    }
  }

  /**
   * Validate a workflow step
   */
  private validateStep(step: any, index: number, allSteps: any[], errors: ValidationError[], warnings: ValidationError[]): void {
    const prefix = `steps[${index}]`

    // Validate step ID
    if (!step.id || typeof step.id !== 'string') {
      errors.push({ field: `${prefix}.id`, message: 'Step ID is required and must be a string', level: 'error' })
    } else if (!step.id.startsWith('step_')) {
      warnings.push({ field: `${prefix}.id`, message: "Step ID should start with 'step_'", level: 'warning' })
    }

    // Validate step type
    if (!step.type || !['task', 'handler'].includes(step.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: "Step type must be 'task' or 'handler'",
        level: 'error'
      })
      return
    }

    // Validate taskId or handlerId
    if (step.type === 'task') {
      if (!step.taskId || typeof step.taskId !== 'string') {
        errors.push({ field: `${prefix}.taskId`, message: 'Task step must have a taskId', level: 'error' })
      } else {
        const taskTemplate = this.taskRegistry.getTemplate(step.taskId)
        if (!taskTemplate) {
          errors.push({
            field: `${prefix}.taskId`,
            message: `Task '${step.taskId}' not found. Available tasks: ${this.taskRegistry.getAllTemplates().map(t => t.id).join(', ')}`,
            level: 'error'
          })
        } else {
          // Validate input against task schema
          this.validateStepInput(step, taskTemplate.inputSchema as any, prefix, errors, warnings)
        }
      }
    } else if (step.type === 'handler') {
      if (!step.handlerId || typeof step.handlerId !== 'string') {
        errors.push({ field: `${prefix}.handlerId`, message: 'Handler step must have a handlerId', level: 'error' })
      } else {
        const handlerTemplate = this.handlerRegistry.getTemplate(step.handlerId)
        if (!handlerTemplate) {
          errors.push({
            field: `${prefix}.handlerId`,
            message: `Handler '${step.handlerId}' not found. Available handlers: ${this.handlerRegistry.getAllTemplates().map(h => h.id).join(', ')}`,
            level: 'error'
          })
        } else {
          // Validate input against handler schema
          this.validateStepInput(step, handlerTemplate.inputSchema as any, prefix, errors, warnings)
        }
      }
    }

    // Validate input object
    if (!step.input || typeof step.input !== 'object') {
      errors.push({ field: `${prefix}.input`, message: 'Step input must be an object', level: 'error' })
    }

    // Validate condition if present
    if (step.condition !== undefined && step.condition !== null && typeof step.condition !== 'string') {
      errors.push({ field: `${prefix}.condition`, message: 'Condition must be a string', level: 'error' })
    } else if (step.condition) {
      this.validateTokensInString(step.condition, `${prefix}.condition`, allSteps, errors, warnings)
    }

    // Validate delay if present
    if (step.delay !== undefined && step.delay !== null && typeof step.delay !== 'number') {
      errors.push({ field: `${prefix}.delay`, message: 'Delay must be a number', level: 'error' })
    }

    // Validate tokens in input
    if (step.input && typeof step.input === 'object') {
      this.validateInputTokens(step.input, `${prefix}.input`, allSteps, errors, warnings)
    }
  }

  /**
   * Validate step input against schema
   */
  private validateStepInput(step: any, schema: any, prefix: string, errors: ValidationError[], _warnings: ValidationError[]): void {
    if (!schema || !schema.properties) return

    const input = step.input || {}
    const required = schema.required || []

    // Check required fields
    required.forEach((fieldName: string) => {
      if (!(fieldName in input)) {
        errors.push({
          field: `${prefix}.input.${fieldName}`,
          message: `Required field '${fieldName}' is missing`,
          level: 'error'
        })
      }
    })

    // Validate field types and values
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const value = input[fieldName]
      if (value !== undefined && value !== null) {
        const expectedType = fieldSchema.type
        const actualType = typeof value

        if (expectedType === 'string' && actualType !== 'string') {
          errors.push({
            field: `${prefix}.input.${fieldName}`,
            message: `Field '${fieldName}' must be a string, got ${actualType}`,
            level: 'error'
          })
        } else if (expectedType === 'number' && actualType !== 'number') {
          errors.push({
            field: `${prefix}.input.${fieldName}`,
            message: `Field '${fieldName}' must be a number, got ${actualType}`,
            level: 'error'
          })
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          errors.push({
            field: `${prefix}.input.${fieldName}`,
            message: `Field '${fieldName}' must be a boolean, got ${actualType}`,
            level: 'error'
          })
        }

        // Validate enum values
        if (fieldSchema.enum && Array.isArray(fieldSchema.enum) && !fieldSchema.enum.includes(value)) {
          errors.push({
            field: `${prefix}.input.${fieldName}`,
            message: `Field '${fieldName}' must be one of: ${fieldSchema.enum.join(', ')}`,
            level: 'error'
          })
        }
      }
    })
  }

  /**
   * Validate tokens in a string value
   */
  private validateTokensInString(value: string, fieldPath: string, allSteps: any[], errors: ValidationError[], _warnings: ValidationError[]): void {
    const tokenRegex = /\$\{([^}]+)\}/g
    let match

    while ((match = tokenRegex.exec(value)) !== null) {
      const tokenContent = match[1]
      const parsed = parseToken(match[0])

      if (!parsed) {
        errors.push({
          field: fieldPath,
          message: `Invalid token syntax: ${match[0]}`,
          level: 'error'
        })
        continue
      }

      // Check if it's a step output reference
      if (tokenContent.includes('_output')) {
        // Extract the step ID from the token (handles both step_xxx_output.field and step_xxx_output formats)
        const stepOutputMatch = tokenContent.match(/^(step_[\d_]+?)(?:_output)/)
        if (stepOutputMatch) {
          const referencedStepId = stepOutputMatch[1] // e.g., "step_123" from "step_123_output.field"
          const stepExists = allSteps.some(s => s.id === referencedStepId)
          
          if (!stepExists) {
            // Try to find a close match to provide helpful error message
            const closeMatches = allSteps
              .map(s => s.id)
              .filter(id => {
                const idBase = id.match(/^step_([\d_]+)/)?.[1]
                const refBase = referencedStepId.match(/^step_([\d_]+)/)?.[1]
                return idBase && refBase && (idBase.startsWith(refBase) || refBase.startsWith(idBase))
              })
            
            const suggestion = closeMatches.length > 0
              ? ` Did you mean: ${closeMatches[0]}? Expected format: \${${closeMatches[0]}_output${tokenContent.includes('.') ? '.' + tokenContent.split('.')[1] : ''}}`
              : ''
            
            errors.push({
              field: fieldPath,
              message: `Token references non-existent step: ${referencedStepId}${suggestion}`,
              level: 'error'
            })
          }
        }
      }
    }
  }

  /**
   * Validate tokens in input object recursively
   */
  private validateInputTokens(input: any, fieldPath: string, allSteps: any[], errors: ValidationError[], warnings: ValidationError[]): void {
    if (typeof input === 'string') {
      this.validateTokensInString(input, fieldPath, allSteps, errors, warnings)
    } else if (Array.isArray(input)) {
      input.forEach((item, index) => {
        this.validateInputTokens(item, `${fieldPath}[${index}]`, allSteps, errors, warnings)
      })
    } else if (typeof input === 'object' && input !== null) {
      Object.entries(input).forEach(([key, value]) => {
        this.validateInputTokens(value, `${fieldPath}.${key}`, allSteps, errors, warnings)
      })
    }
  }
}


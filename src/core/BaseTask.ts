import { 
  TaskInput, 
  TaskOutput, 
  ValidationResult, 
  ExecutionContext,
  TaskInputUI,
  TaskTemplate,
  InputFieldConfig
} from '@common/types'
import { SchemaValidator } from './utils/SchemaValidator'

export abstract class BaseTask {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly category: string
  abstract readonly inputSchema: Record<string, unknown>
  abstract readonly outputSchema: Record<string, unknown>
  abstract readonly apiType: 'prompt' | 'translation' | 'summarizer' | 'proofreader' | 'writer' | 'rewriter' | 'language_detection'
  
  abstract execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput>
  abstract getInputUI(): TaskInputUI
  
  validateInput(input: unknown): ValidationResult {
    const errors: string[] = []
    
    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object')
      return { valid: false, errors }
    }
    
    const inputObj = input as Record<string, unknown>
    
    // Check required fields
    if (this.inputSchema.required && Array.isArray(this.inputSchema.required)) {
      for (const field of this.inputSchema.required as string[]) {
        if (!(field in inputObj)) {
          errors.push(`Required field '${field}' is missing`)
        }
      }
    }
    
    // Validate field types
    if (this.inputSchema.properties) {
      const properties = this.inputSchema.properties as Record<string, any>
      for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const value = inputObj[fieldName]
        
        if (value !== undefined) {
          const fieldError = this.validateField(fieldName, value, fieldSchema)
          if (fieldError) {
            errors.push(fieldError)
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  private validateField(fieldName: string, value: unknown, schema: any): string | null {
    return SchemaValidator.validateField(fieldName, value, schema)
  }
  
  processOutput(rawOutput: unknown): TaskOutput {
    return {
      data: rawOutput,
      type: 'structured',
      metadata: {
        confidence: 1.0,
        processingTime: 0,
        source: this.apiType
      }
    }
  }
  
  getTemplate(): TaskTemplate {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      apiType: this.apiType,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      uiConfig: {
        inputFields: this.getInputUI().fields,
        outputPreview: {
          type: 'structured',
          fields: Object.keys(this.outputSchema.properties || {})
        }
      },
      implementation: this.constructor.name
    }
  }
  
  protected createInputField(config: {
    name: string
    label: string
    type: InputFieldConfig['type']
    required?: boolean
    placeholder?: string
    options?: Array<{ value: string; label: string }>
    dataPointTypes?: string[]
    validation?: {
      minLength?: number
      maxLength?: number
      pattern?: string
    }
  }): InputFieldConfig {
    return {
      name: config.name,
      label: config.label,
      type: config.type,
      required: config.required || false,
      placeholder: config.placeholder,
      options: config.options,
      dataPointTypes: config.dataPointTypes,
      validation: config.validation
    }
  }

  // Generate a mock output object for this task based on its outputSchema.
  // Child tasks may override getTaskSpecificMockDefaults to provide richer defaults.
  generateMockOutput(): any {
    const schema: any = this.outputSchema || {}
    const properties: Record<string, any> = schema.properties || {}
    const mockOutput: Record<string, any> = {}

    for (const [key, propSchema] of Object.entries(properties)) {
      const type = (propSchema as any).type || 'string'
      const taskDefault = this.getTaskSpecificMockDefaults(key)
      if (taskDefault !== undefined) {
        mockOutput[key] = taskDefault
        continue
      }

      mockOutput[key] = this.getDefaultValueForType(type)
    }

    return mockOutput
  }

  // Override in concrete tasks to provide task-specific mock defaults for certain keys
  // Return undefined to fall back to generic defaults
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getTaskSpecificMockDefaults(_key: string): any {
    return undefined
  }

  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string':
        return 'Sample value'
      case 'number':
        return 0
      case 'boolean':
        return false
      case 'array':
        return []
      case 'object':
        return {}
      default:
        return null
    }
  }

}

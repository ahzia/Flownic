import { 
  HandlerInput, 
  HandlerResult, 
  ValidationResult, 
  HelpersAPI,
  HandlerInputUI,
  HandlerTemplate,
  InputFieldConfig
} from '@common/types'

export abstract class BaseHandler {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly category: string
  abstract readonly inputSchema: Record<string, unknown>
  abstract readonly permissions: string[]
  
  abstract execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult>
  abstract getInputUI(): HandlerInputUI
  
  undo?(lastRunState: unknown, helpers: HelpersAPI): Promise<void>
  
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
    if (schema.type === 'string' && typeof value !== 'string') {
      return `Field '${fieldName}' must be a string`
    }
    
    if (schema.type === 'number' && typeof value !== 'number') {
      return `Field '${fieldName}' must be a number`
    }
    
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      return `Field '${fieldName}' must be a boolean`
    }
    
    if (schema.type === 'array' && !Array.isArray(value)) {
      return `Field '${fieldName}' must be an array`
    }
    
    if (schema.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      return `Field '${fieldName}' must be an object`
    }
    
    // String-specific validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        return `Field '${fieldName}' must be at least ${schema.minLength} characters long`
      }
      
      if (schema.maxLength && value.length > schema.maxLength) {
        return `Field '${fieldName}' must be no more than ${schema.maxLength} characters long`
      }
      
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        return `Field '${fieldName}' does not match the required pattern`
      }
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`
    }
    
    return null
  }
  
  getTemplate(): HandlerTemplate {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      inputSchema: this.inputSchema,
      permissions: this.permissions,
      uiConfig: {
        inputFields: this.getInputUI().fields
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
}

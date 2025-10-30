export class SchemaValidator {
  static validateField(fieldName: string, value: unknown, schema: any): string | null {
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
}



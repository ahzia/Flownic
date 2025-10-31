import { createToken } from './tokenUtils'

/**
 * Migrates workflow from object notation to token notation
 * Converts { type: 'data_point', dataPointId: '...', field: '...' } to "${...}"
 */
export function migrateWorkflowToTokenNotation(workflow: any): any {
  const migrated = { ...workflow }
  
  if (migrated.steps) {
    migrated.steps = migrated.steps.map((step: any) => {
      if (step.input) {
        step.input = migrateInputToTokenNotation(step.input)
      }
      return step
    })
  }
  
  return migrated
}

/**
 * Recursively migrates input object from data point references to token notation
 */
function migrateInputToTokenNotation(input: any): any {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return input
  }
  
  // Handle primitives
  if (typeof input !== 'object') {
    return input
  }
  
  // Check if it's a data point reference object
  if (input.type === 'data_point' && input.dataPointId) {
    return createToken(input.dataPointId, input.field)
  }
  
  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(item => migrateInputToTokenNotation(item))
  }
  
  // Handle objects - recursively migrate all properties
  const migrated: any = {}
  for (const [key, value] of Object.entries(input)) {
    migrated[key] = migrateInputToTokenNotation(value)
  }
  
  return migrated
}

/**
 * Checks if a workflow needs migration (contains object notation)
 */
export function needsMigration(workflow: any): boolean {
  if (!workflow || !workflow.steps) {
    return false
  }
  
  return workflow.steps.some((step: any) => 
    containsDataPointReference(step.input)
  )
}

/**
 * Checks if an input object contains data point references
 */
function containsDataPointReference(input: any): boolean {
  if (input === null || input === undefined) {
    return false
  }
  
  // Check if it's a data point reference
  if (typeof input === 'object' && input.type === 'data_point') {
    return true
  }
  
  // Check arrays
  if (Array.isArray(input)) {
    return input.some(item => containsDataPointReference(item))
  }
  
  // Check nested objects
  if (typeof input === 'object') {
    return Object.values(input).some(value => containsDataPointReference(value))
  }
  
  return false
}


import { DataPoint } from '@common/types'
import { interpolateTextWithDataPoints } from './TokenInterpolation'

/**
 * Resolves data point references in step inputs
 * Now only supports token notation (${...}) - all data point references should be strings with tokens
 */
export function resolveDataPointReferences(input: any, dataPoints: DataPoint[]): any {
  // Handle strings - interpolate tokens if present
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
  // Handle primitives
  if (input === null || typeof input !== 'object') {
    return input
  }
  
  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(item => resolveDataPointReferences(item, dataPoints))
  }
  
  // Recursively resolve nested objects
  const resolved: any = {}
  for (const [key, value] of Object.entries(input)) {
    resolved[key] = resolveDataPointReferences(value, dataPoints)
  }
  
  return resolved
}


import { DataPoint, DataPointReference } from '@common/types'
import { interpolateTextWithDataPoints } from './TokenInterpolation'

/**
 * Resolves data point references in step inputs
 * Supports both old format (DataPointReference objects) and new format (token strings)
 */
export function resolveDataPointReferences(input: any, dataPoints: DataPoint[]): any {
  // Handle strings - interpolate tokens if present
  if (typeof input === 'string') {
    return interpolateTextWithDataPoints(input, dataPoints)
  }
  
  if (typeof input !== 'object' || input === null) {
    return input
  }
  
  // Handle old format: { type: 'data_point', dataPointId: '...', field: '...' }
  if (input.type === 'data_point') {
    const ref = input as DataPointReference
    const dataPoint = dataPoints.find(dp => dp.id === ref.dataPointId)
    
    if (!dataPoint) {
      console.warn(`⚠️ Data point not found: ${ref.dataPointId}`)
      console.warn('Available data point IDs:', dataPoints.map(dp => dp.id))
      return null
    }
    
    // Handle raw JSON option
    if (ref.field === '__raw__') {
      if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
        return JSON.stringify(dataPoint.value, null, 2)
      }
      return dataPoint.value
    }
    
    // Handle specific field
    if (ref.field && dataPoint.value && typeof dataPoint.value === 'object') {
      const fieldValue = (dataPoint.value as Record<string, any>)[ref.field]
      if (fieldValue !== null && fieldValue !== undefined) {
        // If field value is an object/array, stringify it
        if (typeof fieldValue !== 'string' && typeof fieldValue !== 'number' && typeof fieldValue !== 'boolean') {
          return JSON.stringify(fieldValue, null, 2)
        }
        return fieldValue
      }
      return null
    }
    
    // If value is an object but no field specified, return JSON string
    if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
      return JSON.stringify(dataPoint.value, null, 2)
    }
    
    // If value is a string, return it directly
    return dataPoint.value
  }
  
  // Recursively resolve nested objects and strings
  const resolved: any = {}
  for (const [key, value] of Object.entries(input)) {
    // If value is a string, interpolate it; if object, recurse
    if (typeof value === 'string') {
      resolved[key] = interpolateTextWithDataPoints(value, dataPoints)
    } else {
      resolved[key] = resolveDataPointReferences(value, dataPoints)
    }
  }
  
  return resolved
}


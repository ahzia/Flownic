import { DataPoint } from '@common/types'

/**
 * Resolves a single ${dataPointId.field} token to its actual value
 */
function resolveToken(token: string, dataPoints: DataPoint[]): string {
  // Extract dataPointId and optional field from token like: ${dataPointId.field} or ${dataPointId}
  const match = token.match(/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/)
  if (!match) {
    return token // Return as-is if not a valid token
  }
  
  const [, dataPointId, field] = match
  const dataPoint = dataPoints.find(dp => dp.id === dataPointId)
  
  if (!dataPoint) {
    console.warn(`⚠️ Token interpolation: Data point not found: ${dataPointId}`)
    return token // Return original token if data point not found
  }
  
  // Handle __raw__ field
  if (field === '__raw__') {
    if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
      return JSON.stringify(dataPoint.value, null, 2)
    }
    return String(dataPoint.value ?? '')
  }
  
  // Handle specific field
  if (field && dataPoint.value && typeof dataPoint.value === 'object') {
    const fieldValue = (dataPoint.value as Record<string, any>)[field]
    if (fieldValue !== null && fieldValue !== undefined) {
      // Stringify objects/arrays, return primitives as strings
      if (typeof fieldValue !== 'string' && typeof fieldValue !== 'number' && typeof fieldValue !== 'boolean') {
        return JSON.stringify(fieldValue, null, 2)
      }
      return String(fieldValue)
    }
  }
  
  // No field specified or field not found - return entire value
  if (typeof dataPoint.value === 'object' && dataPoint.value !== null) {
    return JSON.stringify(dataPoint.value, null, 2)
  }
  
  return String(dataPoint.value ?? '')
}

/**
 * Interpolates ${dataPointId.field} tokens in a string with actual data point values
 * Example: "Hello ${selected_text.text}" -> "Hello World"
 */
export function interpolateTextWithDataPoints(text: string, dataPoints: DataPoint[]): string {
  if (typeof text !== 'string') {
    return String(text ?? '')
  }
  
  // Find all ${...} tokens in the text
  const tokenRegex = /\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g
  const tokens: string[] = []
  let match
  
  // Collect all unique tokens
  while ((match = tokenRegex.exec(text)) !== null) {
    const fullToken = match[0]
    if (!tokens.includes(fullToken)) {
      tokens.push(fullToken)
    }
  }
  
  // Replace each token with its resolved value
  let result = text
  for (const token of tokens) {
    const resolved = resolveToken(token, dataPoints)
    result = result.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), resolved)
  }
  
  return result
}

/**
 * Checks if a string contains any ${...} tokens
 */
export function hasTokens(text: string): boolean {
  if (typeof text !== 'string') {
    return false
  }
  return /\$\{[a-zA-Z0-9_\-]+(?:\.[ hippocampus-zA-Z0-9_\-]+|__raw__)?\}/.test(text)
}

/**
 * Extracts all token references from a string
 * Returns array of { dataPointId, field } objects
 */
export function extractTokenReferences(text: string): Array<{ dataPointId: string; field?: string }> {
  if (typeof text !== 'string') {
    return []
  }
  
  const tokenRegex = /\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/g
  const references: Array<{ dataPointId: string; field?: string }> = []
  let match
  
  while ((match = tokenRegex.exec(text)) !== null) {
    const [, dataPointId, field] = match
    references.push({
      dataPointId,
      field: field && field !== '__raw__' ? field : undefined
    })
  }
  
  return references
}


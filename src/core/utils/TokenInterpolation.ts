import { DataPoint } from '@common/types'

/**
 * Get default context provider IDs (fallback when registry is not available)
 * This should match the IDs defined in context providers
 */
export function getDefaultContextProviderIds(): string[] {
  return ['selected_text', 'extracted_text', 'page_content']
}

/**
 * Normalizes a data point ID by trying different formats (handles timestamp suffixes, etc.)
 * @param dataPointId - The ID to normalize
 * @param availableIds - List of available data point IDs
 * @param contextProviderIds - Optional list of context provider base IDs (e.g., ['selected_text', 'extracted_text'])
 */
function normalizeDataPointId(
  dataPointId: string, 
  availableIds: string[],
  contextProviderIds?: string[]
): string | null {
  // Try exact match first
  if (availableIds.includes(dataPointId)) {
    return dataPointId
  }
  
  // Try 1: If it's an output ID with timestamp, try normalized format
  if (dataPointId.includes('_output_')) {
    const stepId = dataPointId.split('_output_')[0]
    const normalizedId = `${stepId}_output`
    if (availableIds.includes(normalizedId)) {
      return normalizedId
    }
  }
  
  // Try 2: If it's a context provider with timestamp, try stable ID
  const contextProviderPrefixes = contextProviderIds || getDefaultContextProviderIds()
  for (const prefix of contextProviderPrefixes) {
    if (dataPointId.startsWith(prefix) && dataPointId !== prefix) {
      // Try normalized (remove timestamp)
      const baseId = dataPointId.split('_').slice(0, -1).join('_')
      if (availableIds.includes(baseId)) {
        return baseId
      }
      // Try stable provider ID
      if (availableIds.includes(prefix)) {
        return prefix
      }
    }
  }
  
  // Try 3: KB entry IDs (kb_kb_xxx or kb_xxx)
  if (dataPointId.startsWith('kb_')) {
    if (dataPointId.startsWith('kb_kb_')) {
      const parts = dataPointId.split('_')
      if (parts.length >= 3) {
        const baseId = parts.slice(0, 3).join('_')
        const matched = availableIds.find(id => id === baseId || id.startsWith(baseId + '_'))
        if (matched) return matched
      }
    } else {
      const parts = dataPointId.split('_')
      if (parts.length >= 2) {
        const baseId = parts.slice(0, 2).join('_')
        const matched = availableIds.find(id => id === baseId || id.startsWith(baseId + '_'))
        if (matched) return matched
      }
    }
  }
  
  return null
}

/**
 * Resolves baseline single ${dataPointId.field} token to its actual value
 */
function resolveToken(token: string, dataPoints: DataPoint[]): string {
  // Extract dataPointId and optional field from token like: ${dataPointId.field} or ${dataPointId}
  const match = token.match(/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/)
  if (!match) {
    return token // Return as-is if not a valid token
  }
  
  const [, dataPointId, field] = match
  const availableIds = dataPoints.map(dp => dp.id)
  
  // Try exact match first
  let matchedId = availableIds.includes(dataPointId) ? dataPointId : null
  
  // If not found, try normalization (pass context provider IDs if available)
  if (!matchedId) {
    matchedId = normalizeDataPointId(dataPointId, availableIds)
  }
  
  if (!matchedId) {
    console.warn(`⚠️ Token interpolation: Data point not found: ${dataPointId}`)
    console.warn(`📋 Available data point IDs:`, availableIds)
    // Return empty string instead of literal token to prevent tokens from appearing in AI output
    // This happens when a step was skipped (due to condition) or data point doesn't exist
    return ''
  }
  
  const dataPoint = dataPoints.find(dp => dp.id === matchedId)
  if (!dataPoint) {
    // Return empty string instead of literal token
    return ''
  }
  
  console.log(`🔍 Token resolution for ${token}: found dataPoint id=${matchedId}, value type=${typeof dataPoint.value}, hasField=${!!field}`)
  
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
    console.log(`🔍 Field access: ${matchedId}.${field} = ${fieldValue !== null && fieldValue !== undefined ? `"${String(fieldValue).substring(0, 50)}..." (type: ${typeof fieldValue})` : 'undefined/null'}`)
    if (fieldValue !== null && fieldValue !== undefined) {
      // Stringify objects/arrays, return primitives as strings
      if (typeof fieldValue !== 'string' && typeof fieldValue !== 'number' && typeof fieldValue !== 'boolean') {
        return JSON.stringify(fieldValue, null, 2)
      }
      return String(fieldValue)
    }
    // Field not found in data point - return empty string instead of token
    console.warn(`⚠️ Field ${field} not found in data point ${matchedId}, returning empty string`)
    return ''
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
  
  // Reset regex lastIndex
  tokenRegex.lastIndex = 0
  // Collect all unique tokens
  while ((match = tokenRegex.exec(text)) !== null) {
    const fullToken = match[0]
    if (!tokens.includes(fullToken)) {
      tokens.push(fullToken)
    }
  }
  
  if (tokens.length === 0) {
    return text // No tokens to interpolate
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
  return /\$\{[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+|__raw__)?\}/.test(text)
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


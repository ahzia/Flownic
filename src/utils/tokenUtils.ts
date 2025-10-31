/**
 * Utilities for working with data point token notation (${...})
 */

/**
 * Extracts data point ID and field from token string
 * @param token - Token string like "${selected_text.text}" or "${dataPointId}"
 * @returns Parsed token info or null if invalid
 * @example 
 * parseToken("${selected_text.text}") => { dataPointId: "selected_text", field: "text" }
 * parseToken("${some_id}") => { dataPointId: "some_id", field: undefined }
 */
export function parseToken(token: string): { dataPointId: string; field?: string } | null {
  const match = token.trim().match(/\$\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+|__raw__))?\}/)
  if (!match) return null
  
  const [, dataPointId, field] = match
  return { 
    dataPointId, 
    field: field === '__raw__' ? '__raw__' : field || undefined 
  }
}

/**
 * Converts data point reference to token string
 * @param dataPointId - Data point ID
 * @param field - Optional field name (use "__raw__" for raw JSON)
 * @returns Token string
 * @example 
 * createToken("selected_text", "text") => "${selected_text.text}"
 * createToken("some_id") => "${some_id}"
 */
export function createToken(dataPointId: string, field?: string): string {
  if (field) {
    return `\${${dataPointId}.${field}}`
  }
  return `\${${dataPointId}}`
}

/**
 * Checks if a string is a pure token (only token, no other text)
 * @param value - String to check
 * @returns true if value is exactly a token
 * @example 
 * isPureToken("${selected_text.text}") => true
 * isPureToken("Text: ${selected_text.text}") => false
 * isPureToken("  ${selected_text.text}  ") => true (after trim)
 */
export function isPureToken(value: string): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  const tokenMatch = trimmed.match(/^\$\{[^}]+\}$/)
  return !!tokenMatch
}

/**
 * Finds all tokens in a string
 * @param text - Text to search for tokens
 * @returns Array of found tokens
 * @example 
 * extractTokens("${a} and ${b.c}") => ["${a}", "${b.c}"]
 */
export function extractTokens(text: string): string[] {
  const tokens: string[] = []
  const regex = /\$\{[^}]+\}/g
  let match
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}

/**
 * Validates if a token string is well-formed
 * @param token - Token string to validate
 * @returns true if valid
 */
export function isValidToken(token: string): boolean {
  return parseToken(token) !== null
}



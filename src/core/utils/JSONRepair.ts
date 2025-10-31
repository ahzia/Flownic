/**
 * Utilities for parsing and repairing JSON responses from AI
 */

/**
 * Extract JSON from a response that might contain markdown or extra text
 */
export function extractJSONFromResponse(response: string): string {
  let cleaned = response.trim()

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, '')
  cleaned = cleaned.replace(/```\s*/g, '')

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  // If no match, try to find first { and last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1)
  }

  // Return original if we can't extract
  return cleaned
}

/**
 * Attempt to repair common JSON syntax errors
 */
export function repairJSON(jsonString: string): string {
  let repaired = jsonString

  // Fix trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Fix missing quotes around object keys (simple cases)
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

  // Fix single quotes to double quotes for strings
  repaired = repaired.replace(/'/g, '"')

  // Fix unescaped newlines in strings
  repaired = repaired.replace(/([^\\])"/g, (match) => {
    // This is a simple approach - more complex cases may need manual fixing
    return match
  })

  return repaired
}

/**
 * Parse JSON with repair attempts
 */
export function parseJSONWithRepair(jsonString: string): { success: boolean; data?: any; error?: string; repaired?: boolean } {
  // First attempt: direct parse
  try {
    const parsed = JSON.parse(jsonString)
    return { success: true, data: parsed, repaired: false }
  } catch (error) {
    // Second attempt: extract JSON first
    try {
      const extracted = extractJSONFromResponse(jsonString)
      const parsed = JSON.parse(extracted)
      return { success: true, data: parsed, repaired: false }
    } catch (extractError) {
      // Third attempt: repair and parse
      try {
        const extracted = extractJSONFromResponse(jsonString)
        const repaired = repairJSON(extracted)
        const parsed = JSON.parse(repaired)
        return { success: true, data: parsed, repaired: true }
      } catch (repairError) {
        return {
          success: false,
          error: `Failed to parse JSON: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`,
          repaired: false
        }
      }
    }
  }
}


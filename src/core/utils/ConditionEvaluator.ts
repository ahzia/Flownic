import { DataPoint } from '@common/types'
import { interpolateTextWithDataPoints } from './TokenInterpolation'

/**
 * Safely evaluates a boolean condition expression
 * Supports basic operators and helper functions
 * 
 * @param condition - Condition string that may contain ${dataPointId.field} tokens
 * @param dataPoints - Available data points for token interpolation
 * @returns true if condition evaluates to true, false otherwise
 * 
 * @example
 * evaluateCondition("${selected_text.text}" != "", dataPoints)
 * evaluateCondition("${step_detect_output.languageCode}" == "de", dataPoints)
 * evaluateCondition("${score}" >= 0.8 && "${text}" != "", dataPoints)
 */
export function evaluateCondition(condition: string, dataPoints: DataPoint[]): boolean {
  // Empty or whitespace-only conditions default to true (always execute)
  if (!condition || !condition.trim()) {
    return true
  }

  try {
    // Step 1: Interpolate tokens in condition string
    const interpolated = interpolateTextWithDataPoints(condition.trim(), dataPoints)
    console.log(`🔍 Condition after interpolation: "${interpolated}"`)
    
    // Step 2: Safely evaluate the expression
    // We use Function constructor in a controlled way to evaluate expressions
    // This is safer than eval as it creates a new scope
    const result = evaluateExpression(interpolated)
    console.log(`🔍 Expression evaluation result: ${result}`)
    return result
  } catch (error) {
    console.warn(`⚠️ Condition evaluation failed for: "${condition}"`, error)
    // On error, default to false (skip step) to prevent unintended execution
    // This is safer than defaulting to true
    return false
  }
}

/**
 * Safely evaluates a boolean expression string
 * Simplified version - only supports basic comparisons and logical operators
 * Supports: comparisons (==, !=, >, >=, <, <=), logical (&&, ||, !)
 * 
 * NOTE: Removed regex-based patterns (.length, .includes, .startsWith, .endsWith) 
 * to avoid issues. Use simple string comparisons instead.
 */
function evaluateExpression(expr: string): boolean {
  // Remove extra whitespace
  expr = expr.trim()
  
  // Handle simple boolean values
  if (expr.toLowerCase() === 'true') return true
  if (expr.toLowerCase() === 'false') return false
  
  // Handle logical NOT
  if (expr.startsWith('!')) {
    return !evaluateExpression(expr.slice(1).trim())
  }
  
  // Handle logical AND
  if (expr.includes('&&')) {
    const parts = splitByOperator(expr, '&&')
    if (parts.length >= 2) {
      return parts.every(part => evaluateExpression(part.trim()))
    }
  }
  
  // Handle logical OR
  if (expr.includes('||')) {
    const parts = splitByOperator(expr, '||')
    if (parts.length >= 2) {
      return parts.some(part => evaluateExpression(part.trim()))
    }
  }
  
  // Handle comparisons (check longer operators first to avoid partial matches)
  const comparisonOps = ['>=', '<=', '==', '!=', '>', '<']
  for (const op of comparisonOps) {
    if (expr.includes(op)) {
      // Use splitByOperator to handle quoted strings properly
      const parts = splitByOperator(expr, op)
      if (parts.length === 2) {
        const left = parseValue(parts[0].trim())
        const right = parseValue(parts[1].trim())
        
        // Verify the split is valid
        if (left !== undefined && right !== undefined) {
          switch (op) {
            case '==':
              return String(left) === String(right)
            case '!=':
              return String(left) !== String(right)
            case '>':
              const leftNum = Number(left)
              const rightNum = Number(right)
              if (!isNaN(leftNum) && !isNaN(rightNum)) {
                return leftNum > rightNum
              }
              // If not numbers, compare as strings
              return String(left) > String(right)
            case '>=':
              const leftNumGte = Number(left)
              const rightNumGte = Number(right)
              if (!isNaN(leftNumGte) && !isNaN(rightNumGte)) {
                return leftNumGte >= rightNumGte
              }
              return String(left) >= String(right)
            case '<':
              const leftNumLt = Number(left)
              const rightNumLt = Number(right)
              if (!isNaN(leftNumLt) && !isNaN(rightNumLt)) {
                return leftNumLt < rightNumLt
              }
              return String(left) < String(right)
            case '<=':
              const leftNumLte = Number(left)
              const rightNumLte = Number(right)
              if (!isNaN(leftNumLte) && !isNaN(rightNumLte)) {
                return leftNumLte <= rightNumLte
              }
              return String(left) <= String(right)
          }
        }
      }
    }
  }
  
  // If no operators found and not a boolean, check if non-empty string
  // Empty strings evaluate to false, non-empty to true
  if (expr === '""' || expr === "''" || expr === '') {
    return false
  }
  
  // Non-empty expression is truthy
  return true
}

/**
 * Splits expression by operator, handling quoted strings
 */
function splitByOperator(expr: string, operator: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    
    if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
    }
    
    if (!inQuotes && expr.slice(i).startsWith(operator)) {
      if (current.trim()) {
        parts.push(current.trim())
        current = ''
      }
      i += operator.length - 1 // Skip operator characters
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim())
  }
  
  return parts
}

/**
 * Parses a value (string, number, boolean)
 */
function parseValue(value: string): any {
  value = value.trim()
  
  // Boolean
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  
  // String (quoted)
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  
  // Number
  const num = Number(value)
  if (!isNaN(num)) return num
  
  // Default: return as string
  return value
}



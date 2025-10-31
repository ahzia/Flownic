/**
 * Utilities for repairing broken workflows, especially AI-generated ones
 * Focuses on fixing step output token references that don't match actual step IDs
 */

import { parseToken } from '@utils/tokenUtils'

export interface RepairSuggestion {
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface RepairResult {
  repaired: boolean
  workflow: any
  suggestions: RepairSuggestion[]
  fixedCount: number
}

/**
 * Find the closest matching step ID for a broken step output reference
 * Example: ${step_123_output.field} should match step_123_0, step_123_1, etc.
 */
function findClosestStepId(referencedId: string, availableStepIds: string[]): string | null {
  // Extract base ID from reference (e.g., "step_123" from "step_123_output")
  const baseMatch = referencedId.match(/^step_([\d_]+?)(?:_output)?$/)
  if (!baseMatch) {
    return null
  }

  const baseId = baseMatch[1]
  
  // Try exact match first (if reference was "step_123_output" and step is "step_123_0")
  // Check if any step starts with "step_<base>"
  const matchingSteps = availableStepIds.filter(stepId => {
    const stepBaseMatch = stepId.match(/^step_([\d_]+)/)
    if (!stepBaseMatch) return false
    
    const stepBase = stepBaseMatch[1]
    // Check if bases match (handles cases like "123" vs "123_0")
    return stepBase === baseId || stepBase.startsWith(baseId + '_') || baseId.startsWith(stepBase + '_')
  })

  if (matchingSteps.length === 0) {
    return null
  }

  // If multiple matches, prefer the one with the shortest suffix (most likely correct)
  // For example, if reference is "step_123" and we have "step_123_0" and "step_123_0_1", prefer "step_123_0"
  matchingSteps.sort((a, b) => {
    const aSuffix = a.replace(/^step_/, '')
    const bSuffix = b.replace(/^step_/, '')
    // Prefer shorter suffixes, then lexicographically first
    if (aSuffix.length !== bSuffix.length) {
      return aSuffix.length - bSuffix.length
    }
    return aSuffix.localeCompare(bSuffix)
  })

  return matchingSteps[0]
}

/**
 * Extract all step IDs from a workflow
 */
function getAllStepIds(workflow: any): string[] {
  if (!workflow || !Array.isArray(workflow.steps)) {
    return []
  }
  return workflow.steps
    .map((step: any) => step?.id)
    .filter((id: any): id is string => typeof id === 'string')
}

/**
 * Extract step output token from a token string
 * Returns { dataPointId, field, fullToken } or null
 */
function extractStepOutputToken(token: string): { dataPointId: string; field?: string; fullToken: string } | null {
  const parsed = parseToken(token)
  if (!parsed) {
    return null
  }

  const { dataPointId, field } = parsed
  
  // Check if it's a step output reference (contains "_output")
  if (dataPointId.includes('_output')) {
    return { dataPointId, field, fullToken: token }
  }

  return null
}

/**
 * Find all step output token references in a value (recursive)
 */
function findStepOutputTokens(value: any, path: string = ''): Array<{ token: string; path: string }> {
  const tokens: Array<{ token: string; path: string }> = []

  if (typeof value === 'string') {
    const tokenRegex = /\$\{([^}]+)\}/g
    let match
    while ((match = tokenRegex.exec(value)) !== null) {
      const extracted = extractStepOutputToken(match[0])
      if (extracted) {
        tokens.push({ token: match[0], path })
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      tokens.push(...findStepOutputTokens(item, path ? `${path}[${index}]` : `[${index}]`))
    })
  } else if (typeof value === 'object' && value !== null) {
    Object.entries(value).forEach(([key, val]) => {
      tokens.push(...findStepOutputTokens(val, path ? `${path}.${key}` : key))
    })
  }

  return tokens
}

/**
 * Repair step output token references in a workflow
 */
export function repairStepOutputReferences(workflow: any): RepairResult {
  const suggestions: RepairSuggestion[] = []
  let fixedCount = 0

  if (!workflow || !Array.isArray(workflow.steps)) {
    return { repaired: false, workflow, suggestions, fixedCount }
  }

  const allStepIds = getAllStepIds(workflow)
  const repairedWorkflow = JSON.parse(JSON.stringify(workflow)) // Deep clone

  // Find all step output token references in the workflow
  const allTokens: Array<{ token: string; path: string; stepIndex?: number }> = []

  // Check each step's input
  repairedWorkflow.steps.forEach((step: any, stepIndex: number) => {
    if (step.input) {
      const tokens = findStepOutputTokens(step.input, `steps[${stepIndex}].input`)
      tokens.forEach(t => {
        allTokens.push({ ...t, stepIndex })
      })
    }

    // Check step condition
    if (step.condition && typeof step.condition === 'string') {
      const tokens = findStepOutputTokens(step.condition, `steps[${stepIndex}].condition`)
      tokens.forEach(t => {
        allTokens.push({ ...t, stepIndex })
      })
    }
  })

  // Try to repair each broken reference
  for (const { token, path } of allTokens) {
    const extracted = extractStepOutputToken(token)
    if (!extracted) {
      continue
    }

    const { dataPointId, field } = extracted
    
    // Check if this step output exists (based on step IDs)
    // The output ID format is: <stepId>_output
    const referencedStepId = dataPointId.replace(/_output$/, '')
    const stepExists = allStepIds.includes(referencedStepId)

    if (!stepExists) {
      // Try to find the closest matching step ID
      const closestStepId = findClosestStepId(referencedStepId, allStepIds)
      
      if (closestStepId) {
        const newOutputId = `${closestStepId}_output`
        const newToken = field 
          ? `\${${newOutputId}.${field}}`
          : `\${${newOutputId}}`
        
        // Update the workflow
        const pathParts = path.split('.')
        let target: any = repairedWorkflow
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i]
          if (part.includes('[')) {
            const [key, indexStr] = part.split('[')
            const index = parseInt(indexStr.replace(']', ''), 10)
            if (key) {
              target = target[key][index]
            } else {
              target = target[index]
            }
          } else {
            target = target[part]
          }
        }

        const lastPart = pathParts[pathParts.length - 1]
        if (typeof target === 'object' && target !== null) {
          if (typeof target[lastPart] === 'string') {
            target[lastPart] = target[lastPart].replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newToken)
            fixedCount++
            suggestions.push({
              field: path,
              oldValue: token,
              newValue: newToken,
              reason: `Step output reference '${referencedStepId}' not found. Auto-corrected to match step '${closestStepId}'.`
            })
          }
        }
      } else {
        // Couldn't find a match - add suggestion but don't auto-fix
        suggestions.push({
          field: path,
          oldValue: token,
          newValue: token,
          reason: `Step output reference '${referencedStepId}' not found and no matching step ID could be determined. Please review manually.`
        })
      }
    }
  }

  return {
    repaired: fixedCount > 0,
    workflow: repairedWorkflow,
    suggestions,
    fixedCount
  }
}

/**
 * Repair a workflow (entry point for all repairs)
 */
export function repairWorkflow(workflow: any): RepairResult {
  // Start with step output reference repair
  const result = repairStepOutputReferences(workflow)
  
  // Future repair functions can be chained here
  // const result2 = repairSomethingElse(result.workflow)
  
  return result
}


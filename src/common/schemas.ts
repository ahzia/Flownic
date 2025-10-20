import Ajv from 'ajv'
import { ActionPlan, Action, HandlerMeta, PromptTemplate, Workflow } from './types'

const ajv = new Ajv({ allErrors: true })

// ActionPlan Schema
export const actionPlanSchema = {
  type: 'object',
  required: ['type', 'actions', 'metadata'],
  properties: {
    type: { const: 'ACTION_PLAN' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['op', 'params'],
        properties: {
          op: { type: 'string' },
          params: { type: 'object' },
          id: { type: 'string' }
        }
      }
    },
    metadata: {
      type: 'object',
      required: ['confidence', 'timestamp', 'source'],
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        timestamp: { type: 'number' },
        source: { type: 'string' }
      }
    }
  }
}

// Individual Action Schemas
export const actionSchemas = {
  SHOW_MODAL: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'SHOW_MODAL' },
      params: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          html: { type: 'boolean' },
          size: { enum: ['small', 'medium', 'large'] }
        }
      }
    }
  },
  
  INSERT_TEXT: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'INSERT_TEXT' },
      params: {
        type: 'object',
        required: ['selector', 'text'],
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' },
          method: { enum: ['replace', 'append', 'prepend', 'insert'] },
          triggerEvents: { type: 'boolean' }
        }
      }
    }
  },
  
  MODIFY_CSS: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'MODIFY_CSS' },
      params: {
        type: 'object',
        required: ['cssId', 'cssText'],
        properties: {
          cssId: { type: 'string' },
          cssText: { type: 'string' },
          action: { enum: ['insert', 'remove', 'toggle'] }
        }
      }
    }
  },
  
  PARSE_TABLE_TO_CSV: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'PARSE_TABLE_TO_CSV' },
      params: {
        type: 'object',
        required: ['selector'],
        properties: {
          selector: { type: 'string' },
          filename: { type: 'string' },
          includeHeaders: { type: 'boolean' }
        }
      }
    }
  },
  
  DOWNLOAD_FILE: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'DOWNLOAD_FILE' },
      params: {
        type: 'object',
        required: ['filename', 'content'],
        properties: {
          filename: { type: 'string' },
          content: { type: 'string' },
          mimeType: { type: 'string' }
        }
      }
    }
  },
  
  SAVE_CAPTURE: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'SAVE_CAPTURE' },
      params: {
        type: 'object',
        required: ['name', 'data'],
        properties: {
          name: { type: 'string' },
          data: { type: 'object' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  
  FILL_FORM: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'FILL_FORM' },
      params: {
        type: 'object',
        required: ['fields'],
        properties: {
          fields: {
            type: 'array',
            items: {
              type: 'object',
              required: ['selector', 'value'],
              properties: {
                selector: { type: 'string' },
                value: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
              }
            }
          }
        }
      }
    }
  },
  
  CLICK_SELECTOR: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'CLICK_SELECTOR' },
      params: {
        type: 'object',
        required: ['selector'],
        properties: {
          selector: { type: 'string' },
          waitFor: { type: 'number' }
        }
      }
    }
  },
  
  REMOVE_NODE: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'REMOVE_NODE' },
      params: {
        type: 'object',
        required: ['selector'],
        properties: {
          selector: { type: 'string' },
          restoreOnUndo: { type: 'boolean' }
        }
      }
    }
  },
  
  INJECT_UI_COMPONENT: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'INJECT_UI_COMPONENT' },
      params: {
        type: 'object',
        required: ['componentId', 'html'],
        properties: {
          componentId: { type: 'string' },
          html: { type: 'string' },
          css: { type: 'string' },
          position: { enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] }
        }
      }
    }
  },
  
  WAIT_FOR_SELECTOR: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'WAIT_FOR_SELECTOR' },
      params: {
        type: 'object',
        required: ['selector', 'timeout'],
        properties: {
          selector: { type: 'string' },
          timeout: { type: 'number' },
          visible: { type: 'boolean' }
        }
      }
    }
  },
  
  NOOP: {
    type: 'object',
    required: ['op', 'params'],
    properties: {
      op: { const: 'NOOP' },
      params: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: { type: 'object' }
        }
      }
    }
  }
}

// Handler Meta Schema
export const handlerMetaSchema = {
  type: 'object',
  required: ['id', 'name', 'version', 'description', 'permissions', 'inputSchema', 'category'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
    inputSchema: { type: 'object' },
    category: { enum: ['core', 'user', 'generated'] }
  }
}

// Prompt Template Schema
export const promptTemplateSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'prompt', 'category', 'tags', 'context', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    prompt: { type: 'string' },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    context: {
      type: 'object',
      required: ['useSelectedText', 'usePageContent', 'useKB', 'useLastCapture'],
      properties: {
        useSelectedText: { type: 'boolean' },
        usePageContent: { type: 'boolean' },
        useKB: { type: 'boolean' },
        useLastCapture: { type: 'boolean' }
      }
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  }
}

// Workflow Schema
export const workflowSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'steps', 'triggers', 'enabled', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: { enum: ['prompt', 'action'] },
          promptId: { type: 'string' },
          action: { type: 'object' },
          condition: { type: 'string' },
          delay: { type: 'number' }
        }
      }
    },
    triggers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { enum: ['manual', 'onPageLoad', 'onSelection', 'onFocus', 'schedule'] },
          pattern: { type: 'string' },
          selector: { type: 'string' },
          schedule: { type: 'string' }
        }
      }
    },
    enabled: { type: 'boolean' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  }
}

// Compiled validators
export const validators = {
  actionPlan: ajv.compile(actionPlanSchema),
  handlerMeta: ajv.compile(handlerMetaSchema),
  promptTemplate: ajv.compile(promptTemplateSchema),
  workflow: ajv.compile(workflowSchema),
  
  // Action validators
  actions: Object.fromEntries(
    Object.entries(actionSchemas).map(([op, schema]) => [
      op,
      ajv.compile(schema)
    ])
  )
}

// Validation helper functions
export function validateActionPlan(data: unknown): data is ActionPlan {
  return validators.actionPlan(data) as boolean
}

export function validateAction(action: unknown): action is Action {
  if (typeof action !== 'object' || action === null) return false
  
  const actionObj = action as Record<string, unknown>
  if (typeof actionObj.op !== 'string') return false
  
  const validator = validators.actions[actionObj.op as keyof typeof validators.actions]
  return validator ? validator(action) as boolean : false
}

export function validateHandlerMeta(data: unknown): data is HandlerMeta {
  return validators.handlerMeta(data) as boolean
}

export function validatePromptTemplate(data: unknown): data is PromptTemplate {
  return validators.promptTemplate(data) as boolean
}

export function validateWorkflow(data: unknown): data is Workflow {
  return validators.workflow(data) as boolean
}

// Get validation errors
export function getValidationErrors(validator: any): string[] {
  return validator.errors?.map((error: any) => 
    `${error.instancePath || 'root'}: ${error.message}`
  ) || []
}

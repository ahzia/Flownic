import { TaskTemplate, HandlerTemplate } from '@common/types'
import { TaskRegistry } from '@core/TaskRegistry'
import { HandlerRegistry } from '@core/HandlerRegistry'
import { ContextProviderRegistry } from '@context/ContextProviderRegistry'

interface ProviderMeta {
  id: string
  name: string
  description: string
  outputType: string
}

/**
 * Dynamically builds the system prompt for AI workflow generation
 * Always pulls latest information from registries
 */
export class WorkflowPromptBuilder {
  private taskRegistry: TaskRegistry
  private handlerRegistry: HandlerRegistry
  private contextProviderRegistry: ContextProviderRegistry

  constructor() {
    this.taskRegistry = new TaskRegistry()
    this.handlerRegistry = new HandlerRegistry()
    this.contextProviderRegistry = new ContextProviderRegistry()
  }

  /**
   * Build the complete system prompt for workflow generation
   */
  buildPrompt(userQuery: string): string {
    const tasks = this.taskRegistry.getAllTemplates()
    const handlers = this.handlerRegistry.getAllTemplates()
    const providers = this.getContextProviders()

    return `You are a workflow generator for Flownic, a browser automation tool.

USER REQUEST:
"${userQuery}"

TASK: Generate a complete, valid workflow JSON that fulfills the user's request.

${this.buildTasksSection(tasks)}

${this.buildHandlersSection(handlers)}

${this.buildContextProvidersSection(providers)}

${this.buildWorkflowFormatSection()}

${this.buildRulesSection()}

${this.buildExamplesSection()}

RESPOND WITH ONLY VALID JSON. No markdown code blocks, no explanations, no text before or after the JSON. Just the JSON object starting with { and ending with }.
`
  }

  /**
   * Build tasks section with dynamic schema information
   */
  private buildTasksSection(tasks: TaskTemplate[]): string {
    if (tasks.length === 0) {
      return 'AVAILABLE TASKS: None available.'
    }

    let section = 'AVAILABLE TASKS:\n\n'
    
    tasks.forEach(task => {
      const inputSchema = task.inputSchema as any
      const outputSchema = task.outputSchema as any
      
      section += `- ${task.id}:\n`
      section += `  Name: ${task.name}\n`
      section += `  Description: ${task.description}\n`
      section += `  Category: ${task.category}\n`
      section += `  Input Schema:\n`
      
      if (inputSchema.properties) {
        const required = inputSchema.required || []
        Object.entries(inputSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
          const isRequired = required.includes(fieldName)
          section += `    - ${fieldName} (${fieldSchema.type || 'any'})${isRequired ? ' [REQUIRED]' : ' [OPTIONAL]'}: ${fieldSchema.description || 'No description'}\n`
          
          if (fieldSchema.enum) {
            section += `      Allowed values: ${fieldSchema.enum.join(', ')}\n`
          }
          if (fieldSchema.default !== undefined) {
            section += `      Default: ${fieldSchema.default}\n`
          }
        })
      }
      
      section += `  Output Schema:\n`
      if (outputSchema.properties) {
        Object.entries(outputSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
          section += `    - ${fieldName} (${fieldSchema.type || 'any'})\n`
        })
        section += `  Output reference example: \${step_<stepId>_output.${Object.keys(outputSchema.properties)[0]}}\n`
      }
      
      section += '\n'
    })

    return section
  }

  /**
   * Build handlers section with dynamic schema information
   */
  private buildHandlersSection(handlers: HandlerTemplate[]): string {
    if (handlers.length === 0) {
      return 'AVAILABLE HANDLERS: None available.'
    }

    let section = 'AVAILABLE HANDLERS:\n\n'
    
    handlers.forEach(handler => {
      const inputSchema = handler.inputSchema as any
      
      section += `- ${handler.id}:\n`
      section += `  Name: ${handler.name}\n`
      section += `  Description: ${handler.description}\n`
      section += `  Category: ${handler.category}\n`
      section += `  Permissions: ${handler.permissions.join(', ')}\n`
      section += `  Input Schema:\n`
      
      if (inputSchema.properties) {
        const required = inputSchema.required || []
        Object.entries(inputSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
          const isRequired = required.includes(fieldName)
          section += `    - ${fieldName} (${fieldSchema.type || 'any'})${isRequired ? ' [REQUIRED]' : ' [OPTIONAL]'}: ${fieldSchema.description || 'No description'}\n`
          
          if (fieldSchema.enum) {
            section += `      Allowed values: ${fieldSchema.enum.join(', ')}\n`
          }
          if (fieldSchema.default !== undefined) {
            section += `      Default: ${fieldSchema.default}\n`
          }
        })
      }
      
      section += '\n'
    })

    return section
  }

  /**
   * Build context providers section
   */
  private buildContextProvidersSection(providers: ProviderMeta[]): string {
    if (providers.length === 0) {
      return 'CONTEXT PROVIDERS: None available.'
    }

    let section = 'CONTEXT PROVIDERS (available data points):\n\n'
    
    providers.forEach(provider => {
      section += `- ${provider.id}: ${provider.name}\n`
      section += `  Description: ${provider.description}\n`
      section += `  Output type: ${provider.outputType}\n`
      section += `  Reference: \${${provider.id}.${provider.outputType === 'html' ? 'html' : 'text'}}\n`
      section += '\n'
    })

    return section
  }

  /**
   * Get context providers from registry
   */
  private getContextProviders(): ProviderMeta[] {
    try {
      const metas = this.contextProviderRegistry.getAllMeta()
      return metas.map(meta => ({
        id: meta.id,
        name: meta.name,
        description: meta.description,
        outputType: meta.outputType || 'text'
      }))
    } catch (error) {
      console.warn('Error loading context providers:', error)
      // Return default providers
      return [
        { id: 'selected_text', name: 'Selected Text', description: 'Currently selected text on the page', outputType: 'text' },
        { id: 'page_content', name: 'Page Content', description: 'Full HTML content of the current page', outputType: 'html' },
        { id: 'extracted_text', name: 'Extracted Text', description: 'Plain text extracted from the page', outputType: 'text' }
      ]
    }
  }

  /**
   * Build workflow format specification
   */
  private buildWorkflowFormatSection(): string {
    return `WORKFLOW JSON FORMAT:
{
  "name": "string (descriptive name for the workflow)",
  "description": "string (what the workflow does)",
  "triggers": [{
    "type": "manual" | "onPageLoad" | "onSelection" | "onFocus" | "schedule",
    "pattern": "string (optional, URL pattern for onPageLoad)",
    "selector": "string (optional, CSS selector for onSelection)",
    "schedule": "string (optional, cron expression for schedule type)",
    "shortcut": "string (optional, keyboard shortcut for manual type, e.g., 'Ctrl+Shift+S')"
  }],
  "websiteConfig": {
    "type": "all" | "specific" | "exclude",
    "patterns": "string (one URL pattern per line, optional if type='all')"
  },
  "steps": [{
    "id": "step_<timestamp>_<index>",
    "type": "task" | "handler",
    "taskId": "string (required if type='task', must match available task ID)",
    "handlerId": "string (required if type='handler', must match available handler ID)",
    "input": {
      "fieldName": "value (must be string, number, or boolean - use token notation for data points)"
    },
    "condition": "string (optional, boolean expression using tokens)",
    "delay": "number (optional, delay in seconds before executing this step)"
  }]
}`
  }

  /**
   * Build rules and constraints section
   */
  private buildRulesSection(): string {
    return `IMPORTANT RULES:

1. TOKEN NOTATION for data point references:
   - Use format: \${dataPointId.field} or \${dataPointId}
   - For task outputs: \${step_<stepId>_output.<fieldName>}
   - For context providers: \${<providerId>.<field>} (e.g., \${selected_text.text})
   - Tokens can be used in input field values, conditions, and other string fields

2. STEP IDS:
   - Must be unique: step_<timestamp>_<index>
   - Use timestamp for uniqueness (e.g., step_1761672816603_0)
   - Sequential index for order (0, 1, 2, ...)

3. CONDITIONS:
   - Optional boolean expressions
   - Supported operators: ==, !=, >, >=, <, <=, &&, ||, !
   - Use token notation for values: "\${selected_text.text}" != ""
   - Examples:
     * "\${step_123_output.languageCode}" == "en"
     * "\${selected_text.text}" != ""
     * "\${score}" > 0.5

4. INPUT VALUES:
   - Must match the task/handler input schema exactly
   - Field names must match exactly (case-sensitive)
   - Types must match: string, number, or boolean
   - Use token notation for dynamic values
   - Provide literal values for static content

5. TRIGGERS:
   - Choose appropriate trigger type based on user request
   - manual: User activates via keyboard shortcut
   - onPageLoad: Runs when page loads (use pattern for specific URLs)
   - onSelection: Runs when user selects text
   - onFocus: Runs when element receives focus
   - schedule: Runs on schedule (requires schedule field)

6. WEBSITE CONFIG:
   - "all": Runs on all websites
   - "specific": Only runs on listed patterns
   - "exclude": Runs on all except listed patterns

7. STEP ORDER:
   - Steps execute sequentially from top to bottom
   - Later steps can reference outputs from earlier steps
   - Ensure data flow makes sense (dependencies resolved)

8. VALIDATION:
   - All required fields must be present
   - taskId/handlerId must match available options exactly
   - Input field names must match schema exactly
   - Token references must be valid (existing steps or context providers)

9. LANGUAGE CONSTRAINTS:
   - CRITICAL: Pay close attention to enum constraints for language fields
   - custom_prompt.outputLanguage: ONLY supports: en, es, ja
   - translation tasks: Support broader language ranges (see task schema for exact list)
   - If the user requests an unsupported language, use a supported alternative or explain the limitation
   - When no exact match is available, use the closest supported language from the enum`
  }

  /**
   * Build examples section
   */
  private buildExamplesSection(): string {
    return `EXAMPLES:

Example 1 - Simple Translation:
{
  "name": "Translate Selected Text to English",
  "description": "Detects language of selected text and translates to English, then shows result in modal",
  "triggers": [{"type": "onSelection"}],
  "websiteConfig": {"type": "all", "patterns": ""},
  "steps": [
    {
      "id": "step_1761672816603_0",
      "type": "task",
      "taskId": "language_detection",
      "input": {
        "text": "\${selected_text.text}"
      }
    },
    {
      "id": "step_1761672837200_1",
      "type": "task",
      "taskId": "translation",
      "input": {
        "text": "\${selected_text.text}",
        "sourceLanguage": "\${step_1761672816603_0_output.languageCode}",
        "targetLanguage": "en"
      }
    },
    {
      "id": "step_1761672871660_2",
      "type": "handler",
      "handlerId": "show_modal",
      "input": {
        "title": "Translation Result",
        "content": "\${step_1761672837200_1_output.translatedText}",
        "size": "medium",
        "closable": true
      }
    }
  ]
}

Example 2 - Conditional Processing:
{
  "name": "Smart Text Processor",
  "description": "Processes text only if it's not empty, then shows result",
  "triggers": [{"type": "onSelection"}],
  "websiteConfig": {"type": "all", "patterns": ""},
  "steps": [
    {
      "id": "step_1761672816603_0",
      "type": "task",
      "taskId": "summarizer",
      "input": {
        "text": "\${selected_text.text}"
      },
      "condition": "\${selected_text.text}" != ""
    },
    {
      "id": "step_1761672871660_1",
      "type": "handler",
      "handlerId": "show_modal",
      "input": {
        "title": "Summary",
        "content": "\${step_1761672816603_0_output.summary}",
        "size": "large",
        "closable": true
      }
    }
  ]
}`
  }
}


# PromptFlow Architecture Design

## Overview

This document outlines the comprehensive architecture for PromptFlow that addresses the requirements outlined in `05_prompt_tamplate.md`. The architecture focuses on clean code principles, excellent user experience, and a flexible system that can handle complex workflows with data flow between tasks.

## Core Concepts & Terminology

### 1. Tasks (formerly "Prompts")
- **Task**: Any operation that processes data using AI APIs or built-in functions
- **Task Template**: Predefined task configurations with specific input/output schemas
- **Custom Task**: User-defined tasks using the Prompt API
- **Task Execution**: The process of running a task with specific inputs and capturing outputs

### 2. Data Points (Variables)
- **Data Point**: Any piece of data that can be used as input to tasks or handlers
- **Context Data Points**: Page content, selected text, extracted text, specific selectors
- **Task Output Data Points**: Results from previous tasks in the workflow
- **Static Data Points**: User-defined values, constants, or configuration

### 3. Handlers (Actions)
- **Handler**: A module that performs specific actions on the page or with data
- **Handler Template**: Predefined handler configurations with input schemas
- **Handler Execution**: The process of running a handler with specific inputs

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Workflow Playground  │  Extension Popup  │  Quickbar UI   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Workflow Manager  │  Task Executor  │  Handler Executor   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Management Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Data Point Manager  │  Context Provider  │  Storage Layer │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Execution Layer                          │
├─────────────────────────────────────────────────────────────┤
│  AI Adapter  │  Handler Registry  │  Content Script API    │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Component Architecture

### 1. Task System

#### Base Task Class
```typescript
abstract class BaseTask {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly category: string
  abstract readonly inputSchema: JSONSchema
  abstract readonly outputSchema: JSONSchema
  abstract readonly apiType: 'prompt' | 'translation' | 'summarizer' | 'proofreader' | 'writer' | 'rewriter'
  
  abstract execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput>
  abstract validateInput(input: unknown): ValidationResult
  abstract processOutput(rawOutput: unknown): TaskOutput
  abstract getInputUI(): TaskInputUI
  abstract getOutputUI(): TaskOutputUI
}
```

#### Task Input/Output Types
```typescript
interface TaskInput {
  [key: string]: DataPoint | string | number | boolean
}

interface TaskOutput {
  data: unknown
  type: 'text' | 'html' | 'json' | 'structured'
  metadata: {
    confidence: number
    processingTime: number
    source: string
  }
}

interface DataPoint {
  id: string
  name: string
  type: 'context' | 'task_output' | 'static'
  value: unknown
  source: string
  timestamp: number
}
```

#### Task Templates
```typescript
interface TaskTemplate {
  id: string
  name: string
  description: string
  category: string
  apiType: string
  inputSchema: JSONSchema
  outputSchema: JSONSchema
  uiConfig: {
    inputFields: InputFieldConfig[]
    outputPreview: OutputPreviewConfig
  }
  implementation: string // Path to task implementation
}
```

### 2. Data Point System

#### Data Point Manager
```typescript
class DataPointManager {
  private dataPoints: Map<string, DataPoint> = new Map()
  private contextProviders: Map<string, ContextProvider> = new Map()
  
  addDataPoint(dataPoint: DataPoint): void
  getDataPoint(id: string): DataPoint | null
  getAllDataPoints(): DataPoint[]
  getDataPointsByType(type: string): DataPoint[]
  updateDataPoint(id: string, updates: Partial<DataPoint>): void
  removeDataPoint(id: string): void
  
  // Context-specific methods
  addContextProvider(provider: ContextProvider): void
  gatherContext(contextTypes: string[]): Promise<DataPoint[]>
  extractPageContent(options: ContentExtractionOptions): Promise<DataPoint>
  extractSelectedText(): Promise<DataPoint>
  extractBySelector(selector: string): Promise<DataPoint>
}
```

#### Context Providers
```typescript
abstract class ContextProvider {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly outputType: string
  
  abstract gather(): Promise<DataPoint>
  abstract validate(): boolean
}

class PageContentProvider extends ContextProvider {
  readonly id = 'page_content'
  readonly name = 'Page Content'
  readonly description = 'Full HTML content of the current page'
  readonly outputType = 'html'
  
  async gather(): Promise<DataPoint> {
    // Implementation to extract full page content
  }
}

class SelectedTextProvider extends ContextProvider {
  readonly id = 'selected_text'
  readonly name = 'Selected Text'
  readonly description = 'Currently selected text on the page'
  readonly outputType = 'text'
  
  async gather(): Promise<DataPoint> {
    // Implementation to get selected text
  }
}

class ExtractedTextProvider extends ContextProvider {
  readonly id = 'extracted_text'
  readonly name = 'Extracted Text'
  readonly description = 'Plain text extracted from the page (no HTML tags)'
  readonly outputType = 'text'
  
  async gather(): Promise<DataPoint> {
    // Implementation to extract plain text
  }
}

class SelectorProvider extends ContextProvider {
  readonly id = 'selector_content'
  readonly name = 'Selector Content'
  readonly description = 'Content from a specific CSS selector'
  readonly outputType = 'html'
  
  constructor(private selector: string) {
    super()
  }
  
  async gather(): Promise<DataPoint> {
    // Implementation to extract content by selector
  }
}
```

### 3. Handler System

#### Base Handler Class
```typescript
abstract class BaseHandler {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly category: string
  abstract readonly inputSchema: JSONSchema
  abstract readonly permissions: string[]
  
  abstract execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult>
  abstract undo?(lastRunState: unknown, helpers: HelpersAPI): Promise<void>
  abstract getInputUI(): HandlerInputUI
  abstract validateInput(input: unknown): ValidationResult
}

interface HandlerInput {
  [key: string]: DataPoint | string | number | boolean
}

interface HandlerResult {
  success: boolean
  data?: unknown
  error?: string
  snapshot?: unknown
  undoData?: unknown
}
```

### 4. Workflow System

#### Workflow Definition
```typescript
interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  triggers: WorkflowTrigger[]
  dataPoints: DataPoint[]
  enabled: boolean
  createdAt: number
  updatedAt: number
  version: string
}

interface WorkflowStep {
  id: string
  type: 'task' | 'handler'
  taskId?: string
  handlerId?: string
  input: StepInput
  output?: StepOutput
  condition?: string
  delay?: number
  parallel?: boolean
  retry?: RetryConfig
}

interface StepInput {
  [key: string]: DataPointReference | string | number | boolean
}

interface DataPointReference {
  type: 'data_point'
  dataPointId: string
  field?: string // For structured data points
}

interface StepOutput {
  dataPointId: string
  type: string
  value: unknown
}
```

#### Workflow Executor
```typescript
class WorkflowExecutor {
  private dataPointManager: DataPointManager
  private taskRegistry: TaskRegistry
  private handlerRegistry: HandlerRegistry
  
  async executeWorkflow(workflow: Workflow, context: ExecutionContext): Promise<WorkflowResult> {
    const results: StepResult[] = []
    const executionContext = { ...context, dataPoints: new Map() }
    
    for (const step of workflow.steps) {
      try {
        const stepResult = await this.executeStep(step, executionContext)
        results.push(stepResult)
        
        // Store step output as data point
        if (stepResult.output) {
          this.dataPointManager.addDataPoint({
            id: stepResult.output.dataPointId,
            name: `${step.id}_output`,
            type: 'task_output',
            value: stepResult.output.value,
            source: step.id,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        // Handle step failure based on retry config
        if (step.retry) {
          // Implement retry logic
        } else {
          throw error
        }
      }
    }
    
    return {
      success: true,
      results,
      dataPoints: Array.from(executionContext.dataPoints.values())
    }
  }
  
  private async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    if (step.type === 'task') {
      return await this.executeTask(step, context)
    } else {
      return await this.executeHandler(step, context)
    }
  }
}
```

### 5. Task Templates Implementation

#### Translation Task Template
```typescript
class TranslationTask extends BaseTask {
  readonly id = 'translation'
  readonly name = 'Translate Text'
  readonly description = 'Translate text from one language to another'
  readonly category = 'language'
  readonly apiType = 'translation'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text', 'targetLanguage'],
    properties: {
      text: { type: 'string' },
      sourceLanguage: { type: 'string' },
      targetLanguage: { type: 'string' }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      translatedText: { type: 'string' },
      sourceLanguage: { type: 'string' },
      targetLanguage: { type: 'string' },
      confidence: { type: 'number' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text, sourceLanguage, targetLanguage } = input
    
    // Call Chrome Translation API
    const translatedText = await context.aiAdapter.translator(
      text as string,
      targetLanguage as string
    )
    
    return {
      data: {
        translatedText,
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        confidence: 0.95
      },
      type: 'structured',
      metadata: {
        confidence: 0.95,
        processingTime: Date.now() - context.startTime,
        source: 'chrome_translation_api'
      }
    }
  }
  
  getInputUI(): TaskInputUI {
    return {
      fields: [
        {
          name: 'text',
          label: 'Text to Translate',
          type: 'data_point_selector',
          dataPointTypes: ['text', 'html'],
          required: true
        },
        {
          name: 'sourceLanguage',
          label: 'Source Language',
          type: 'language_selector',
          allowAuto: true,
          required: false
        },
        {
          name: 'targetLanguage',
          label: 'Target Language',
          type: 'language_selector',
          required: true
        }
      ]
    }
  }
}
```

#### Language Detection Task Template
```typescript
class LanguageDetectionTask extends BaseTask {
  readonly id = 'language_detection'
  readonly name = 'Detect Language'
  readonly description = 'Detect the language of the input text'
  readonly category = 'language'
  readonly apiType = 'prompt'
  
  readonly inputSchema = {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string' }
    }
  }
  
  readonly outputSchema = {
    type: 'object',
    properties: {
      language: { type: 'string' },
      confidence: { type: 'number' },
      languageCode: { type: 'string' }
    }
  }
  
  async execute(input: TaskInput, context: ExecutionContext): Promise<TaskOutput> {
    const { text } = input
    
    // Use prompt API to detect language
    const prompt = `Detect the language of the following text and return only the language name and ISO code in JSON format: "${text}"`
    
    const response = await context.aiAdapter.prompt(prompt)
    const result = JSON.parse(response)
    
    return {
      data: {
        language: result.language,
        languageCode: result.code,
        confidence: result.confidence || 0.9
      },
      type: 'structured',
      metadata: {
        confidence: result.confidence || 0.9,
        processingTime: Date.now() - context.startTime,
        source: 'chrome_prompt_api'
      }
    }
  }
}
```

### 6. User Interface Components

#### Task Input UI
```typescript
interface TaskInputUI {
  fields: InputFieldConfig[]
  layout: 'vertical' | 'horizontal' | 'grid'
  validation: ValidationConfig
}

interface InputFieldConfig {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'data_point_selector' | 'language_selector' | 'number' | 'boolean'
  required: boolean
  placeholder?: string
  options?: SelectOption[]
  dataPointTypes?: string[]
  validation?: FieldValidationConfig
}

interface DataPointSelectorProps {
  dataPoints: DataPoint[]
  allowedTypes: string[]
  onSelect: (dataPointId: string, field?: string) => void
  selectedValue?: DataPointReference
}
```

#### Workflow Builder UI
```typescript
interface WorkflowBuilderProps {
  workflow: Workflow
  onUpdate: (workflow: Workflow) => void
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
}

interface WorkflowStepEditorProps {
  step: WorkflowStep
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onUpdate: (step: WorkflowStep) => void
  onDelete: () => void
}
```

### 7. File Structure

```
src/
├── common/
│   ├── types.ts                 # Core type definitions
│   ├── schemas.ts              # JSON schemas for validation
│   └── constants.ts            # Application constants
├── core/
│   ├── BaseTask.ts             # Abstract base task class
│   ├── BaseHandler.ts          # Abstract base handler class
│   ├── DataPointManager.ts     # Data point management
│   ├── WorkflowExecutor.ts     # Workflow execution engine
│   └── TaskRegistry.ts         # Task template registry
├── tasks/
│   ├── templates/
│   │   ├── TranslationTask.ts
│   │   ├── LanguageDetectionTask.ts
│   │   ├── SummarizationTask.ts
│   │   ├── ProofreadingTask.ts
│   │   └── CustomPromptTask.ts
│   └── index.ts
├── handlers/
│   ├── templates/
│   │   ├── ShowModalHandler.ts
│   │   ├── InsertTextHandler.ts
│   │   ├── ModifyCSSHandler.ts
│   │   └── DownloadFileHandler.ts
│   └── index.ts
├── context/
│   ├── providers/
│   │   ├── PageContentProvider.ts
│   │   ├── SelectedTextProvider.ts
│   │   ├── ExtractedTextProvider.ts
│   │   └── SelectorProvider.ts
│   └── ContextManager.ts
├── ui/
│   ├── components/
│   │   ├── TaskInputUI.tsx
│   │   ├── DataPointSelector.tsx
│   │   ├── WorkflowBuilder.tsx
│   │   ├── WorkflowStepEditor.tsx
│   │   └── LanguageSelector.tsx
│   ├── WorkflowPlayground.tsx
│   └── PlaygroundApp.tsx
└── background/
    ├── serviceWorker.ts
    ├── aiAdapter.ts
    └── workflowManager.ts
```

## Implementation Phases

### Phase 1: Core Architecture (Week 1-2)
1. Implement base classes (BaseTask, BaseHandler, DataPointManager)
2. Create context providers for basic data extraction
3. Implement workflow executor with basic step execution
4. Create task registry and handler registry

### Phase 2: Task Templates (Week 3-4)
1. Implement translation task template
2. Implement language detection task template
3. Implement summarization task template
4. Implement custom prompt task template
5. Create task input/output UI components

### Phase 3: Workflow Builder UI (Week 5-6)
1. Implement workflow builder interface
2. Create step editor with data point selection
3. Implement drag-and-drop workflow creation
4. Add workflow validation and testing

### Phase 4: Advanced Features (Week 7-8)
1. Implement parallel step execution
2. Add conditional step execution
3. Implement retry mechanisms
4. Add workflow versioning and migration

## Benefits of This Architecture

### 1. Clean Code Principles
- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Easy to add new tasks and handlers without modifying existing code
- **Dependency Inversion**: High-level modules don't depend on low-level implementations
- **Interface Segregation**: Small, focused interfaces for different concerns

### 2. Excellent User Experience
- **Intuitive UI**: Clear data flow visualization and easy step configuration
- **Real-time Validation**: Immediate feedback on input validation and data type checking
- **Flexible Data Flow**: Easy selection of data points and context sources
- **Visual Workflow Builder**: Drag-and-drop interface for creating complex workflows

### 3. Maintainable and Extensible
- **Plugin Architecture**: Easy to add new tasks and handlers
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Validation**: JSON schema validation for all inputs and outputs
- **Testing**: Clear separation of concerns makes unit testing straightforward

### 4. Performance and Reliability
- **Efficient Execution**: Optimized workflow execution with parallel processing support
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Data Integrity**: Strong typing and validation prevent runtime errors
- **Caching**: Smart caching of data points and context for better performance

This architecture provides a solid foundation for building complex, maintainable workflows while ensuring excellent user experience and code quality.

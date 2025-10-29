// Core types for PromptFlow extension

export interface ActionPlan {
  type: 'ACTION_PLAN'
  actions: Action[]
  metadata: {
    confidence: number
    timestamp: number
    source: string
  }
}

export interface Action {
  op: string
  params: Record<string, unknown>
  id?: string
}

export interface HandlerMeta {
  id: string
  name: string
  version: string
  description: string
  permissions: string[]
  inputSchema: Record<string, unknown>
  category: 'core' | 'user' | 'generated'
}

export interface Handler {
  meta: HandlerMeta
  run: (input: unknown, helpers: HelpersAPI) => Promise<HandlerResult>
  undo?: (lastRunState: unknown, helpers: HelpersAPI) => Promise<void>
}

export interface HandlerResult {
  success: boolean
  data?: unknown
  error?: string
  snapshot?: unknown
}

export interface HelpersAPI {
  findNodeMeta: (selector: string) => Promise<NodeMeta | null>
  saveSnapshot: (selector: string) => Promise<string>
  applyText: (selector: string, text: string, options?: TextOptions) => Promise<boolean>
  insertCSS: (cssId: string, cssText: string) => Promise<void>
  removeCSS: (cssId: string) => Promise<void>
  toggleCSS: (cssId: string, cssText: string) => Promise<boolean>
  showModal: (config: ModalConfig) => Promise<string>
  closeModal: (modalId: string) => Promise<void>
  downloadFile: (filename: string, content: string, mimeType: string) => Promise<void>
  saveCapture: (name: string, data: unknown) => Promise<void>
  getKB: (key: string) => Promise<unknown>
  confirmAction: (prompt: string) => Promise<boolean>
  notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => Promise<void>
  parseTable: (selector: string) => Promise<string[][]>
}

export interface NodeMeta {
  exists: boolean
  tagName: string
  type: string
  value?: string
  textContent?: string
  attributes: Record<string, string>
  isEditable: boolean
  isVisible: boolean
}

export interface TextOptions {
  method: 'replace' | 'append' | 'prepend' | 'insert'
  triggerEvents?: boolean
  selectAfter?: boolean
}

export interface ModalConfig {
  title: string
  content: string
  html?: boolean
  size?: 'small' | 'medium' | 'large'
  closable?: boolean
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  category: string
  tags: string[]
  context: {
    useSelectedText: boolean
    usePageContent: boolean
    useKB: boolean
    useLastCapture: boolean
  }
  createdAt: number
  updatedAt: number
}

export interface Workflow {
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
  websiteConfig?: {
    type: 'all' | 'specific' | 'exclude'
    patterns: string
  }
}

export interface WorkflowStep {
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

export interface StepInput {
  [key: string]: DataPointReference | string | number | boolean
}

export interface DataPointReference {
  type: 'data_point'
  dataPointId: string
  field?: string // For structured data points
}

export interface StepOutput {
  dataPointId: string
  type: string
  value: unknown
}

export interface RetryConfig {
  maxAttempts: number
  delay: number
  backoffMultiplier: number
}

export interface WorkflowTrigger {
  type: 'manual' | 'onPageLoad' | 'onSelection' | 'onFocus' | 'schedule'
  pattern?: string
  selector?: string
  schedule?: string
  shortcut?: string
}

export interface Capture {
  id: string
  name: string
  data: unknown
  source: string
  timestamp: number
  tags: string[]
}

export interface KBEntry {
  id: string
  name: string
  content: string
  type: 'text' | 'file' | 'url'
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface ChromeAIAPI {
  prompt: (input: string, context?: string) => Promise<string>
  writer: (input: string, context?: string) => Promise<string>
  proofreader: (input: string, context?: string) => Promise<string>
  summarizer: (input: string, context?: string) => Promise<string>
  translator: (input: string, targetLanguage: string) => Promise<string>
  rewriter: (input: string, context?: string) => Promise<string>
}

export interface ExtensionState {
  isQuickbarOpen: boolean
  currentWorkflow?: string
  lastCapture?: Capture
  activeHandlers: string[]
  userSettings: UserSettings
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: string
  autoConfirm: boolean
  showPreview: boolean
  enableNotifications: boolean
  maxHistoryItems: number
  trustedSites: string[]
}

export interface HistoryEntry {
  id: string
  timestamp: number
  action: Action
  result: HandlerResult
  site: string
  reverted: boolean
}

// Task System Types
export interface TaskInput {
  [key: string]: DataPoint | string | number | boolean
}

export interface TaskOutput {
  data: unknown
  type: 'text' | 'html' | 'json' | 'structured'
  metadata: {
    confidence: number
    processingTime: number
    source: string
  }
}

export interface DataPoint {
  id: string
  name: string
  type: 'context' | 'task_output' | 'static'
  value: unknown
  source: string
  timestamp: number
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: string
  apiType: 'prompt' | 'translation' | 'summarizer' | 'proofreader' | 'writer' | 'rewriter' | 'language_detection'
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  uiConfig: {
    inputFields: InputFieldConfig[]
    outputPreview: OutputPreviewConfig
  }
  implementation: string
}

export interface InputFieldConfig {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'data_point_selector' | 'language_selector' | 'number' | 'boolean'
  required: boolean
  placeholder?: string
  options?: SelectOption[]
  dataPointTypes?: string[]
  validation?: FieldValidationConfig
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FieldValidationConfig {
  minLength?: number
  maxLength?: number
  pattern?: string
  custom?: (value: unknown) => string | null
}

export interface OutputPreviewConfig {
  type: 'text' | 'html' | 'json' | 'structured'
  template?: string
  fields?: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ExecutionContext {
  startTime: number
  dataPoints: Map<string, DataPoint>
  aiAdapter: ChromeAIAPI
  helpers: HelpersAPI
}

export interface WorkflowResult {
  success: boolean
  results: StepResult[]
  dataPoints: DataPoint[]
  error?: string
}

export interface StepResult {
  stepId: string
  success: boolean
  output?: StepOutput
  error?: string
  duration: number
}

// Context Provider Types
export interface ContentExtractionOptions {
  includeHtml: boolean
  includeText: boolean
  selectors?: string[]
  maxLength?: number
}

export interface ContextProvider {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly outputType: string
  
  gather(): Promise<DataPoint>
  validate(): boolean
}

// UI Component Types
export interface TaskInputUI {
  fields: InputFieldConfig[]
  layout: 'vertical' | 'horizontal' | 'grid'
  validation: ValidationConfig
}

export interface ValidationConfig {
  validateOnChange: boolean
  validateOnBlur: boolean
  showErrors: boolean
}

export interface HandlerInputUI {
  fields: InputFieldConfig[]
  layout: 'vertical' | 'horizontal' | 'grid'
  validation: ValidationConfig
}

export interface DataPointSelectorProps {
  dataPoints: DataPoint[]
  onSelect: (dataPointId: string, field?: string) => void
  selectedValue?: DataPointReference
  placeholder?: string
  disabled?: boolean
}

export interface WorkflowBuilderProps {
  workflow: Workflow
  onUpdate: (workflow: Workflow) => void
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
}

export interface WorkflowStepEditorProps {
  step: WorkflowStep
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onUpdate: (step: WorkflowStep) => void
  onDelete: () => void
}

export interface HandlerTemplate {
  id: string
  name: string
  description: string
  category: string
  inputSchema: Record<string, unknown>
  permissions: string[]
  uiConfig: {
    inputFields: InputFieldConfig[]
  }
  implementation: string
}

export interface HandlerInput {
  [key: string]: DataPoint | string | number | boolean
}
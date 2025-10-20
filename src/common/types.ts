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
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface WorkflowStep {
  id: string
  type: 'prompt' | 'action'
  promptId?: string
  action?: Action
  condition?: string
  delay?: number
}

export interface WorkflowTrigger {
  type: 'manual' | 'onPageLoad' | 'onSelection' | 'onFocus' | 'schedule'
  pattern?: string
  selector?: string
  schedule?: string
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

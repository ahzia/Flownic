import { BaseHandler } from './BaseHandler'
import { HandlerTemplate, HandlerInput, HelpersAPI, HandlerResult } from '@common/types'
import { 
  ShowModalHandler, 
  InsertTextHandler, 
  DownloadFileHandler, 
  ModifyCSSHandler,
  ParseTableToCSVHandler,
  SaveCaptureHandler,
  ReplaceSelectedTextHandler
} from '@handlers/templates'

export class HandlerRegistry {
  private handlers: Map<string, BaseHandler> = new Map()
  private templates: Map<string, HandlerTemplate> = new Map()
  
  constructor() {
    this.initializeDefaultHandlers()
  }
  
  private initializeDefaultHandlers(): void {
    // Register built-in handlers
    this.registerHandler(new ShowModalHandler())
    this.registerHandler(new InsertTextHandler())
    this.registerHandler(new DownloadFileHandler())
    this.registerHandler(new ModifyCSSHandler())
    this.registerHandler(new ParseTableToCSVHandler())
    this.registerHandler(new SaveCaptureHandler())
    this.registerHandler(new ReplaceSelectedTextHandler())
  }
  
  registerHandler(handler: BaseHandler): void {
    this.handlers.set(handler.id, handler)
    this.templates.set(handler.id, handler.getTemplate())
  }
  
  getHandler(handlerId: string): BaseHandler | null {
    return this.handlers.get(handlerId) || null
  }
  
  getTemplate(handlerId: string): HandlerTemplate | null {
    return this.templates.get(handlerId) || null
  }
  
  getAllHandlers(): BaseHandler[] {
    return Array.from(this.handlers.values())
  }
  
  getAllTemplates(): HandlerTemplate[] {
    return Array.from(this.templates.values())
  }
  
  getHandlersByCategory(category: string): BaseHandler[] {
    return this.getAllHandlers().filter(handler => handler.category === category)
  }
  
  getHandlersByPermission(permission: string): BaseHandler[] {
    return this.getAllHandlers().filter(handler => 
      handler.permissions.includes(permission)
    )
  }
  
  // Search handlers by name or description
  searchHandlers(query: string): BaseHandler[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllHandlers().filter(handler => 
      handler.name.toLowerCase().includes(lowerQuery) ||
      handler.description.toLowerCase().includes(lowerQuery) ||
      handler.category.toLowerCase().includes(lowerQuery)
    )
  }
  
  // Get available categories
  getCategories(): string[] {
    const categories = new Set(this.getAllHandlers().map(handler => handler.category))
    return Array.from(categories).sort()
  }
  
  // Get available permissions
  getPermissions(): string[] {
    const permissions = new Set(
      this.getAllHandlers().flatMap(handler => handler.permissions)
    )
    return Array.from(permissions).sort()
  }
  
  // Validate handler input
  validateHandlerInput(handlerId: string, input: unknown): { valid: boolean; errors: string[] } {
    const handler = this.getHandler(handlerId)
    if (!handler) {
      return { valid: false, errors: [`Handler '${handlerId}' not found`] }
    }
    
    const result = handler.validateInput(input)
    return result
  }
  
  // Execute a handler
  async executeHandler(handlerId: string, input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const handler = this.getHandler(handlerId)
    if (!handler) {
      throw new Error(`Handler '${handlerId}' not found`)
    }
    
    return await handler.execute(input, helpers)
  }
  
  // Get handler input UI configuration
  getHandlerInputUI(handlerId: string): any {
    const handler = this.getHandler(handlerId)
    if (!handler) {
      throw new Error(`Handler '${handlerId}' not found`)
    }
    
    return handler.getInputUI()
  }
  
  // Unregister a handler (for dynamic loading/unloading)
  unregisterHandler(handlerId: string): boolean {
    return this.handlers.delete(handlerId) && this.templates.delete(handlerId)
  }
  
  // Clear all handlers
  clear(): void {
    this.handlers.clear()
    this.templates.clear()
  }
  
  // Get registry statistics
  getStats(): { totalHandlers: number; categories: number; permissions: number } {
    return {
      totalHandlers: this.handlers.size,
      categories: this.getCategories().length,
      permissions: this.getPermissions().length
    }
  }
}

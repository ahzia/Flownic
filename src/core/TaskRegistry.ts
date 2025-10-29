import { BaseTask } from './BaseTask'
import { TaskTemplate } from '@common/types'
import { TranslationTask } from '@tasks/templates/TranslationTask'
import { LanguageDetectionTask } from '@tasks/templates/LanguageDetectionTask'
import { CustomPromptTask } from '@tasks/templates/CustomPromptTask'
import { SummarizerTask } from '@tasks/templates/SummarizerTask'
import { ProofreaderTask } from '@tasks/templates/ProofreaderTask'
import { RewriterTask } from '@tasks/templates/RewriterTask'
import { WriterTask } from '@tasks/templates/WriterTask'

export class TaskRegistry {
  private tasks: Map<string, BaseTask> = new Map()
  private templates: Map<string, TaskTemplate> = new Map()
  
  constructor() {
    this.initializeDefaultTasks()
  }
  
  private initializeDefaultTasks(): void {
    // Register built-in task templates
    this.registerTask(new TranslationTask())
    this.registerTask(new LanguageDetectionTask())
    this.registerTask(new CustomPromptTask())
    this.registerTask(new SummarizerTask())
    this.registerTask(new ProofreaderTask())
    this.registerTask(new RewriterTask())
    this.registerTask(new WriterTask())
  }
  
  registerTask(task: BaseTask): void {
    this.tasks.set(task.id, task)
    this.templates.set(task.id, task.getTemplate())
  }
  
  getTask(taskId: string): BaseTask | null {
    return this.tasks.get(taskId) || null
  }
  
  getTemplate(taskId: string): TaskTemplate | null {
    return this.templates.get(taskId) || null
  }
  
  getAllTasks(): BaseTask[] {
    return Array.from(this.tasks.values())
  }
  
  getAllTemplates(): TaskTemplate[] {
    return Array.from(this.templates.values())
  }
  
  getTasksByCategory(category: string): BaseTask[] {
    return this.getAllTasks().filter(task => task.category === category)
  }
  
  getTasksByApiType(apiType: string): BaseTask[] {
    return this.getAllTasks().filter(task => task.apiType === apiType)
  }
  
  // Search tasks by name or description
  searchTasks(query: string): BaseTask[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllTasks().filter(task => 
      task.name.toLowerCase().includes(lowerQuery) ||
      task.description.toLowerCase().includes(lowerQuery) ||
      task.category.toLowerCase().includes(lowerQuery)
    )
  }
  
  // Get available categories
  getCategories(): string[] {
    const categories = new Set(this.getAllTasks().map(task => task.category))
    return Array.from(categories).sort()
  }
  
  // Get available API types
  getApiTypes(): string[] {
    const apiTypes = new Set(this.getAllTasks().map(task => task.apiType))
    return Array.from(apiTypes).sort()
  }
  
  // Validate task input
  validateTaskInput(taskId: string, input: unknown): { valid: boolean; errors: string[] } {
    const task = this.getTask(taskId)
    if (!task) {
      return { valid: false, errors: [`Task '${taskId}' not found`] }
    }
    
    const result = task.validateInput(input)
    return result
  }
  
  // Execute a task
  async executeTask(taskId: string, input: any, context: any): Promise<any> {
    const task = this.getTask(taskId)
    if (!task) {
      throw new Error(`Task '${taskId}' not found`)
    }
    
    return await task.execute(input, context)
  }
  
  // Get task input UI configuration
  getTaskInputUI(taskId: string): any {
    const task = this.getTask(taskId)
    if (!task) {
      throw new Error(`Task '${taskId}' not found`)
    }
    
    return task.getInputUI()
  }
  
  // Unregister a task (for dynamic loading/unloading)
  unregisterTask(taskId: string): boolean {
    return this.tasks.delete(taskId) && this.templates.delete(taskId)
  }
  
  // Clear all tasks
  clear(): void {
    this.tasks.clear()
    this.templates.clear()
  }
  
  // Get registry statistics
  getStats(): { totalTasks: number; categories: number; apiTypes: number } {
    return {
      totalTasks: this.tasks.size,
      categories: this.getCategories().length,
      apiTypes: this.getApiTypes().length
    }
  }
}

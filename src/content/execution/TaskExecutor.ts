import { TaskRegistry } from '@core/TaskRegistry'

/**
 * Executes tasks in the content script context
 */
export class TaskExecutor {
  private taskRegistry: TaskRegistry

  constructor() {
    this.taskRegistry = new TaskRegistry()
  }

  async executeTask(taskId: string, input: any): Promise<any> {
    try {
      console.log(`🎯 Executing task: ${taskId}`, input)
      
      // Create execution context
      const context = {
        startTime: Date.now(),
        tabId: null,
        url: window.location.href,
        aiAdapter: null // Tasks will use Chrome APIs directly
      }
      
      // Log Chrome API availability for debugging
      if (taskId === 'custom_prompt') {
        console.log('🔍 Chrome Prompt API available:', typeof self.prompt === 'function')
        console.log('🔍 AI Adapter available:', context.aiAdapter !== null)
      }
      
      // Execute the task
      const result = await this.taskRegistry.executeTask(taskId, input, context)
      
      console.log(`✅ Task completed: ${taskId}`, result)
      
      return {
        success: true,
        data: result.data || result
      }
    } catch (error) {
      console.error(`❌ Error executing task ${taskId}:`, error)
      
      // Provide more specific error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Task ${taskId} failed with error:`, errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }
}


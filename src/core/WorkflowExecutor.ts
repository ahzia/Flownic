import { 
  Workflow, 
  WorkflowStep, 
  WorkflowResult, 
  StepResult, 
  ExecutionContext, 
  DataPoint,
  StepInput
} from '@common/types'
import { DataPointManager } from './DataPointManager'
import { TaskRegistry } from './TaskRegistry'
import { HandlerRegistry } from './HandlerRegistry'
import { resolveDataPointReferences } from './utils/DataPointResolver'

export class WorkflowExecutor {
  private dataPointManager: DataPointManager
  private taskRegistry: TaskRegistry
  private handlerRegistry: HandlerRegistry
  
  constructor(
    dataPointManager: DataPointManager,
    taskRegistry: TaskRegistry,
    handlerRegistry: HandlerRegistry
  ) {
    this.dataPointManager = dataPointManager
    this.taskRegistry = taskRegistry
    this.handlerRegistry = handlerRegistry
  }
  
  async executeWorkflow(workflow: Workflow, context: ExecutionContext): Promise<WorkflowResult> {
    const results: StepResult[] = []
    const executionContext = { 
      ...context, 
      dataPoints: new Map<string, DataPoint>(this.dataPointManager.getAllDataPoints().map(dp => [dp.id, dp]))
    }
    
    try {
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, executionContext)
        results.push(stepResult)
        
        // Store step output as data point
        if (stepResult.success && stepResult.output) {
          const dataPoint = this.dataPointManager.createTaskOutputDataPoint(
            step.id,
            stepResult.output.dataPointId,
            stepResult.output.value
          )
          this.dataPointManager.addDataPoint(dataPoint)
          executionContext.dataPoints.set(dataPoint.id, dataPoint)
        }
        
        // Handle step failure
        if (!stepResult.success) {
          if (step.retry) {
            // Implement retry logic
            const retryResult = await this.retryStep(step, executionContext, step.retry)
            if (retryResult.success) {
              results[results.length - 1] = retryResult
            } else {
              throw new Error(`Step ${step.id} failed after ${step.retry.maxAttempts} attempts: ${retryResult.error}`)
            }
          } else {
            throw new Error(`Step ${step.id} failed: ${stepResult.error}`)
          }
        }
      }
      
      return {
        success: true,
        results,
        dataPoints: Array.from(executionContext.dataPoints.values())
      }
    } catch (error) {
      return {
        success: false,
        results,
        dataPoints: Array.from(executionContext.dataPoints.values()),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now()
    
    try {
      // Resolve step input data points
      const resolvedInput = await this.resolveStepInput(step.input, context)
      
      let output
      if (step.type === 'task') {
        output = await this.executeTask(step, resolvedInput, context)
      } else {
        output = await this.executeHandler(step, resolvedInput, context)
      }
      
      return {
        stepId: step.id,
        success: true,
        output: {
          dataPointId: `${step.id}_output`,
          type: 'task_output',
          value: output
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }
    }
  }
  
  private async executeTask(step: WorkflowStep, input: any, context: ExecutionContext): Promise<any> {
    if (!step.taskId) {
      throw new Error('Task ID is required for task steps')
    }
    
    const task = this.taskRegistry.getTask(step.taskId)
    if (!task) {
      throw new Error(`Task '${step.taskId}' not found`)
    }
    
    return await task.execute(input, context)
  }
  
  private async executeHandler(step: WorkflowStep, input: any, context: ExecutionContext): Promise<any> {
    if (!step.handlerId) {
      throw new Error('Handler ID is required for handler steps')
    }
    
    const handler = this.handlerRegistry.getHandler(step.handlerId)
    if (!handler) {
      throw new Error(`Handler '${step.handlerId}' not found`)
    }
    
    const result = await handler.execute(input, context.helpers)
    if (!result.success) {
      throw new Error(result.error || 'Handler execution failed')
    }
    
    return result.data
  }
  
  private async resolveStepInput(input: StepInput, context: ExecutionContext): Promise<any> {
    const allDataPoints = Array.from(context.dataPoints.values())
    // Use the centralized resolver which handles token interpolation
    return resolveDataPointReferences(input, allDataPoints)
  }
  
  private async retryStep(step: WorkflowStep, context: ExecutionContext, retryConfig: any): Promise<StepResult> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await this.executeStep(step, context)
        if (result.success) {
          return result
        }
        lastError = new Error(result.error || 'Step failed')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
      }
      
      if (attempt < retryConfig.maxAttempts) {
        // Wait before retrying
        const delay = retryConfig.delay * Math.pow(retryConfig.backoffMultiplier, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return {
      stepId: step.id,
      success: false,
      error: lastError?.message || 'Step failed after all retry attempts',
      duration: 0
    }
  }
}

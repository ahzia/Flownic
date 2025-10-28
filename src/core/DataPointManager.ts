import { 
  DataPoint, 
  ContextProvider, 
  ContentExtractionOptions,
  ValidationResult
} from '@common/types'

export class DataPointManager {
  private dataPoints: Map<string, DataPoint> = new Map()
  private contextProviders: Map<string, ContextProvider> = new Map()
  
  constructor() {
    this.initializeDefaultProviders()
  }
  
  private initializeDefaultProviders(): void {
    // This will be populated with actual context providers
    // For now, we'll add them when we create the provider classes
  }
  
  addDataPoint(dataPoint: DataPoint): void {
    this.dataPoints.set(dataPoint.id, dataPoint)
  }
  
  getDataPoint(id: string): DataPoint | null {
    return this.dataPoints.get(id) || null
  }
  
  getAllDataPoints(): DataPoint[] {
    return Array.from(this.dataPoints.values())
  }
  
  getDataPointsByType(type: string): DataPoint[] {
    return Array.from(this.dataPoints.values()).filter(dp => dp.type === type)
  }
  
  updateDataPoint(id: string, updates: Partial<DataPoint>): void {
    const existing = this.dataPoints.get(id)
    if (existing) {
      const updated = { ...existing, ...updates }
      this.dataPoints.set(id, updated)
    }
  }
  
  removeDataPoint(id: string): void {
    this.dataPoints.delete(id)
  }
  
  clearDataPoints(): void {
    this.dataPoints.clear()
  }
  
  // Context-specific methods
  addContextProvider(provider: ContextProvider): void {
    this.contextProviders.set(provider.id, provider)
  }
  
  async gatherContext(contextTypes: string[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = []
    
    for (const contextType of contextTypes) {
      const provider = this.contextProviders.get(contextType)
      if (provider) {
        try {
          const dataPoint = await provider.gather()
          dataPoints.push(dataPoint)
          this.addDataPoint(dataPoint)
        } catch (error) {
          console.error(`Error gathering context for ${contextType}:`, error)
        }
      }
    }
    
    return dataPoints
  }
  
  async extractPageContent(_options: ContentExtractionOptions): Promise<DataPoint> {
    // This will be implemented by the PageContentProvider
    const provider = this.contextProviders.get('page_content')
    if (provider) {
      return await provider.gather()
    }
    
    throw new Error('Page content provider not available')
  }
  
  async extractSelectedText(): Promise<DataPoint> {
    const provider = this.contextProviders.get('selected_text')
    if (provider) {
      return await provider.gather()
    }
    
    throw new Error('Selected text provider not available')
  }
  
  async extractBySelector(_selector: string): Promise<DataPoint> {
    const provider = this.contextProviders.get('selector_content')
    if (provider) {
      // We need to pass the selector to the provider
      // This will be handled when we create the SelectorProvider
      return await provider.gather()
    }
    
    throw new Error('Selector provider not available')
  }
  
  // Utility methods
  getDataPointsForTask(taskId: string, allowedTypes: string[]): DataPoint[] {
    return this.getAllDataPoints().filter(dp => 
      allowedTypes.includes(dp.type) || 
      (dp.type === 'task_output' && dp.source === taskId)
    )
  }
  
  createStaticDataPoint(name: string, value: unknown, source: string = 'user'): DataPoint {
    const id = `static_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      id,
      name,
      type: 'static',
      value,
      source,
      timestamp: Date.now()
    }
  }
  
  createTaskOutputDataPoint(taskId: string, outputName: string, value: unknown): DataPoint {
    const id = `task_output_${taskId}_${outputName}`
    return {
      id,
      name: `${outputName} (from ${taskId})`,
      type: 'task_output',
      value,
      source: taskId,
      timestamp: Date.now()
    }
  }
  
  // Validation
  validateDataPoint(dataPoint: DataPoint): ValidationResult {
    const errors: string[] = []
    
    if (!dataPoint.id || typeof dataPoint.id !== 'string') {
      errors.push('Data point must have a valid ID')
    }
    
    if (!dataPoint.name || typeof dataPoint.name !== 'string') {
      errors.push('Data point must have a valid name')
    }
    
    if (!['context', 'task_output', 'static'].includes(dataPoint.type)) {
      errors.push('Data point type must be one of: context, task_output, static')
    }
    
    if (!dataPoint.source || typeof dataPoint.source !== 'string') {
      errors.push('Data point must have a valid source')
    }
    
    if (typeof dataPoint.timestamp !== 'number' || dataPoint.timestamp <= 0) {
      errors.push('Data point must have a valid timestamp')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // Serialization for storage
  serialize(): string {
    return JSON.stringify({
      dataPoints: Array.from(this.dataPoints.entries()),
      timestamp: Date.now()
    })
  }
  
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data)
      this.dataPoints = new Map(parsed.dataPoints)
    } catch (error) {
      console.error('Error deserializing data points:', error)
    }
  }
}

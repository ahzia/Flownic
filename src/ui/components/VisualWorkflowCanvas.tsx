import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint, WorkflowTrigger, KBEntry } from '@common/types'
import { WorkflowNode, WorkflowNodeData } from './WorkflowNode'
import { WorkflowConnector } from './WorkflowConnector'
import { ContextProviderBox } from './ContextProviderBox'
import { NodeConfigurationModal } from './NodeConfigurationModal'
import { extractTokens, parseToken } from '@utils/tokenUtils'
import './VisualWorkflowCanvas.css'
import './WorkflowNode.css'
import './WorkflowConnector.css'
import './ContextProviderBox.css'
import './NodeConfigurationModal.css'

interface VisualWorkflowCanvasProps {
  steps: WorkflowStep[]
  trigger: WorkflowTrigger
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  providerMetas?: { id: string; name: string; description: string; outputType: string }[]
  kbEntries?: KBEntry[]
  onToggleDataPoints?: () => void
  onAddStep: (type: 'task' | 'handler') => void
  onRemoveStep: (stepId: string) => void
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void
  onUpdateTrigger?: (trigger: WorkflowTrigger) => void
}

interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface StepDependencies {
  stepId: string
  usesContext: boolean
  contextSource?: string // ID of context provider/KB used
  dependsOnStep?: string // ID of step this depends on
}

export const VisualWorkflowCanvas: React.FC<VisualWorkflowCanvasProps> = ({
  steps,
  trigger,
  availableTasks,
  availableHandlers,
  dataPoints,
  providerMetas = [],
  kbEntries = [],
  onToggleDataPoints,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onUpdateTrigger
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map())
  const canvasRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Drag state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [manualPositions, setManualPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  
  // Track actual context box dimensions (measured after render)
  const [contextBoxDimensions, setContextBoxDimensions] = useState<{ width: number; height: number } | null>(null)

  // Analyze step dependencies
  const stepDependencies = useMemo<StepDependencies[]>(() => {
    return steps.map(step => {
      const deps: StepDependencies = {
        stepId: step.id,
        usesContext: false
      }

      // Check input for token references - check ALL tokens, don't break early
      const inputStr = JSON.stringify(step.input || {})
      const tokens = extractTokens(inputStr)

      // Also check condition for context/KB usage
      const conditionStr = step.condition && typeof step.condition === 'string' ? step.condition : ''
      const conditionTokens = extractTokens(conditionStr)
      const allTokens = [...tokens, ...conditionTokens]

      for (const token of allTokens) {
        const parsed = parseToken(token)
        if (!parsed) continue

        const { dataPointId } = parsed

        // Check if it's a step output reference
        if (dataPointId.includes('_output')) {
          const stepIdMatch = dataPointId.match(/^(step_[^_]+(?:_\d+)?)_output/)
          if (stepIdMatch) {
            const referencedStepId = stepIdMatch[1]
            const referencedStep = steps.find(s => s.id === referencedStepId)
            if (referencedStep && !deps.dependsOnStep) {
              // Only set if not already set (prioritize first dependency)
              deps.dependsOnStep = referencedStepId
            }
          }
        }
        
        // Check if it's a context provider or KB (don't break - check all tokens)
        const isContextProvider = providerMetas.some(meta => 
          dataPointId === meta.id || dataPointId.startsWith(meta.id + '_')
        )
        const isKB = kbEntries.some(kb => 
          dataPointId === `kb_${kb.id}` || dataPointId.startsWith(`kb_${kb.id}_`)
        )

        if (isContextProvider || isKB) {
          deps.usesContext = true
          if (isContextProvider && !deps.contextSource) {
            const meta = providerMetas.find(m => 
              dataPointId === m.id || dataPointId.startsWith(m.id + '_')
            )
            if (meta) {
              deps.contextSource = meta.id
            }
          } else if (isKB && !deps.contextSource) {
            const kb = kbEntries.find(k => 
              dataPointId === `kb_${k.id}` || dataPointId.startsWith(`kb_${k.id}_`)
            )
            if (kb) {
              deps.contextSource = `kb_${kb.id}`
            }
          }
        }
      }

      return deps
    })
  }, [steps, providerMetas, kbEntries])

  // Helper to get node wrapper styles (avoids duplication)
  const getNodeWrapperStyles = (nodeId: string, position: NodePosition) => {
    const isDragging = draggedNodeId === nodeId
    return {
      position: 'absolute' as const,
      left: position.x,
      top: position.y,
      zIndex: isDragging ? 10 : 1,
      cursor: isDragging ? 'grabbing' : 'grab',
      opacity: isDragging ? 0.9 : 1,
      transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease'
    }
  }

  // Helper to create drag start handler (avoids duplication)
  const createDragStartHandler = (nodeId: string, excludeSelectors?: string[]): ((e: React.MouseEvent) => void) => {
    return (e: React.MouseEvent) => {
      // Don't start drag if clicking on excluded elements (buttons, etc.)
      const target = e.target as HTMLElement
      if (excludeSelectors?.some(selector => target.closest(selector))) {
        return
      }
      
      e.preventDefault()
      e.stopPropagation()
      
      const position = nodePositions.get(nodeId)
      if (!position || !canvasRef.current) return
      
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const offsetX = e.clientX - canvasRect.left - position.x
      const offsetY = e.clientY - canvasRect.top - position.y
      
      setDraggedNodeId(nodeId)
      setDragOffset({ x: offsetX, y: offsetY })
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }
  }


  // Handle drag
  useEffect(() => {
    if (!draggedNodeId || !dragOffset || !canvasRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current!.getBoundingClientRect()
      const newX = e.clientX - canvasRect.left - dragOffset.x
      const newY = e.clientY - canvasRect.top - dragOffset.y

      // Update manual position
      setManualPositions(prev => {
        const updated = new Map(prev)
        updated.set(draggedNodeId, { x: newX, y: newY })
        return updated
      })

      // Update node positions immediately for smooth dragging
      setNodePositions(prev => {
        const updated = new Map(prev)
        const current = updated.get(draggedNodeId)
        if (current) {
          updated.set(draggedNodeId, {
            ...current,
            x: newX,
            y: newY
          })
        }
        return updated
      })
    }

    const handleMouseUp = () => {
      setDraggedNodeId(null)
      setDragOffset(null)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [draggedNodeId, dragOffset])

  // Calculate smart node positions (respect manual positions if set)
  useEffect(() => {
    if (!canvasRef.current) return

    const positions = new Map<string, NodePosition>()
    const nodeWidth = 240
    const nodeHeight = 80
    const horizontalSpacing = 100
    const verticalSpacing = 120
    const contextBoxWidth = 250
    const contextBoxMargin = 40
    const leftMargin = contextBoxWidth + contextBoxMargin + 20 // Space for context box

    const canvasWidth = canvasRef.current.clientWidth
    const centerX = canvasWidth / 2

    let currentY = 40

    // Position context provider box on the left (respect manual positions)
    const contextBoxHeight = 200 // Approximate height
    const contextBoxManualPos = manualPositions.get('context-box')
    positions.set('context-box', {
      id: 'context-box',
      x: contextBoxManualPos?.x ?? contextBoxMargin,
      y: contextBoxManualPos?.y ?? (currentY + 50),
      width: contextBoxWidth,
      height: contextBoxHeight
    })

    // Position trigger at top center (always use auto-position)
    const triggerId = 'trigger'
    const triggerManualPos = manualPositions.get(triggerId)
    positions.set(triggerId, {
      id: triggerId,
      x: triggerManualPos?.x ?? (centerX - nodeWidth / 2),
      y: triggerManualPos?.y ?? currentY,
      width: nodeWidth,
      height: nodeHeight
    })
    currentY += nodeHeight + verticalSpacing

    // Group steps by dependencies
    const contextSteps: WorkflowStep[] = []
    const dependentSteps: WorkflowStep[] = []
    const independentSteps: WorkflowStep[] = []

    steps.forEach(step => {
      const deps = stepDependencies.find(d => d.stepId === step.id)
      if (deps?.usesContext) {
        contextSteps.push(step)
      } else if (deps?.dependsOnStep) {
        dependentSteps.push(step)
      } else {
        independentSteps.push(step)
      }
    })

    // Position context-dependent steps on the left (near context box)
    // Respect manual positions if set
    contextSteps.forEach((step, index) => {
      const manualPos = manualPositions.get(step.id)
      positions.set(step.id, {
        id: step.id,
        x: manualPos?.x ?? leftMargin,
        y: manualPos?.y ?? (currentY + index * (nodeHeight + verticalSpacing)),
        width: nodeWidth,
        height: nodeHeight
      })
    })
    if (contextSteps.length > 0) {
      currentY += contextSteps.length * (nodeHeight + verticalSpacing)
    }

    // Position independent steps in the center
    // Respect manual positions if set
    independentSteps.forEach((step, index) => {
      const manualPos = manualPositions.get(step.id)
      positions.set(step.id, {
        id: step.id,
        x: manualPos?.x ?? (centerX - nodeWidth / 2),
        y: manualPos?.y ?? (currentY + index * (nodeHeight + verticalSpacing)),
        width: nodeWidth,
        height: nodeHeight
      })
    })
    if (independentSteps.length > 0) {
      currentY += independentSteps.length * (nodeHeight + verticalSpacing)
    }

    // Position dependent steps (spread them based on their dependencies)
    // Respect manual positions if set, and ensure nodes don't move when dependencies are dragged
    dependentSteps.forEach((step, index) => {
      const manualPos = manualPositions.get(step.id)
      if (manualPos) {
        // Use manual position if set - node stays where user placed it
        positions.set(step.id, {
          id: step.id,
          x: manualPos.x,
          y: manualPos.y,
          width: nodeWidth,
          height: nodeHeight
        })
      } else {
        // Use auto-position based on dependency, but only if dependency hasn't been manually moved
        // This ensures that when you drag a node, dependent nodes don't follow it
        const deps = stepDependencies.find(d => d.stepId === step.id)
        if (deps?.dependsOnStep) {
          const depManualPos = manualPositions.get(deps.dependsOnStep)
          const depStepPos = positions.get(deps.dependsOnStep)
          
          // Only position relative to dependency if dependency hasn't been manually moved
          // If dependency was moved, use fallback position so dependent node stays put
          if (!depManualPos && depStepPos) {
            // Position to the right of the dependency, slightly below (initial auto-layout)
            positions.set(step.id, {
              id: step.id,
              x: depStepPos.x + nodeWidth + horizontalSpacing,
              y: depStepPos.y + nodeHeight + 40,
              width: nodeWidth,
              height: nodeHeight
            })
          } else {
            // Fallback to center if dependency was manually moved or not found
            positions.set(step.id, {
              id: step.id,
              x: centerX - nodeWidth / 2,
              y: currentY + index * (nodeHeight + verticalSpacing),
              width: nodeWidth,
              height: nodeHeight
            })
          }
        } else {
          // Fallback to center if no dependency info
          positions.set(step.id, {
            id: step.id,
            x: centerX - nodeWidth / 2,
            y: currentY + index * (nodeHeight + verticalSpacing),
            width: nodeWidth,
            height: nodeHeight
          })
        }
      }
    })

    setNodePositions(positions)
  }, [steps, stepDependencies, manualPositions, canvasRef])

  // Separate effect to measure context box dimensions after render
  useEffect(() => {
    const contextBoxElement = nodeRefs.current.get('context-box')
    if (!contextBoxElement) return

    const measureDimensions = () => {
      const rect = contextBoxElement.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setContextBoxDimensions({ width: rect.width, height: rect.height })
      }
    }

    // Measure immediately
    measureDimensions()

    // Also measure after a small delay to ensure everything is laid out
    const timeoutId1 = setTimeout(measureDimensions, 50)
    const timeoutId2 = setTimeout(measureDimensions, 200)
    
    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      measureDimensions()
    })
    
    resizeObserver.observe(contextBoxElement)

    // Fallback: If dimensions still aren't measured after a delay, trigger a tiny position adjustment
    // to force connections to recalculate (this is the user's suggested fallback)
    const fallbackTimeout = setTimeout(() => {
      if (!contextBoxDimensions) {
        const currentPos = manualPositions.get('context-box')
        if (!currentPos) {
          // Only do this if no manual position is set (first load)
          // Move by 0.1px to trigger re-render without visible movement
          setManualPositions(prev => {
            const updated = new Map(prev)
            const contextBoxPos = nodePositions.get('context-box')
            if (contextBoxPos) {
              updated.set('context-box', { 
                x: contextBoxPos.x + 0.1, 
                y: contextBoxPos.y 
              })
              // Immediately move back to original position
              setTimeout(() => {
                setManualPositions(prev2 => {
                  const updated2 = new Map(prev2)
                  updated2.delete('context-box')
                  return updated2
                })
              }, 50)
            }
            return updated
          })
        }
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      clearTimeout(fallbackTimeout)
      resizeObserver.disconnect()
    }
  }, [nodePositions, manualPositions, contextBoxDimensions]) // Re-measure when positions change

  const handleNodeDoubleClick = (nodeId: string) => {
    setSelectedNodeId(nodeId)
  }

  const handleCloseModal = () => {
    setSelectedNodeId(null)
  }

  const getNodeData = (): WorkflowNodeData | null => {
    if (selectedNodeId === 'trigger') {
      return {
        id: 'trigger',
        type: 'trigger',
        trigger,
        label: `Trigger: ${trigger.type}`,
        selected: true
      }
    }

    const step = steps.find(s => s.id === selectedNodeId)
    if (!step) return null

    const taskTemplate = step.type === 'task' && step.taskId
      ? availableTasks.find(t => t.id === step.taskId)
      : undefined

    const handlerTemplate = step.type === 'handler' && step.handlerId
      ? availableHandlers.find(h => h.id === step.handlerId)
      : undefined

    return {
      id: step.id,
      type: step.type,
      step,
      taskTemplate,
      handlerTemplate,
      label: step.type === 'task'
        ? taskTemplate?.name || 'Task'
        : handlerTemplate?.name || 'Handler',
      selected: true
    }
  }

  const selectedNode = getNodeData()

  const handleUpdateStep = (updates: Partial<WorkflowStep>) => {
    if (selectedNodeId && selectedNodeId !== 'trigger') {
      onUpdateStep(selectedNodeId, updates)
    }
  }


  const contextBoxPosition = nodePositions.get('context-box')
  const triggerPosition = nodePositions.get('trigger')

  // Check if any steps use context/KB (for showing the box even if dataPoints aren't loaded yet)
  const hasContextUsage = stepDependencies.some(dep => dep.usesContext)
  const shouldShowContextBox = (providerMetas.length > 0 || kbEntries.length > 0) && 
                               (hasContextUsage || dataPoints.length > 0)

  return (
    <div className="visual-workflow-canvas" ref={canvasRef}>
      <div className="canvas-content">
        {/* Context Provider Box */}
        {contextBoxPosition && shouldShowContextBox && (
          <div
            ref={(el) => {
              if (el) nodeRefs.current.set('context-box', el)
            }}
            style={getNodeWrapperStyles('context-box', contextBoxPosition)}
            onMouseDown={createDragStartHandler('context-box', ['button'])}
            onDoubleClick={() => {
              // Only toggle data points if not dragging
              if (!draggedNodeId && onToggleDataPoints) {
                onToggleDataPoints()
              }
            }}
          >
            <ContextProviderBox
              dataPoints={dataPoints}
              kbEntries={kbEntries}
              providerMetas={providerMetas}
              onClick={onToggleDataPoints}
            />
          </div>
        )}

        {/* Trigger Node */}
        {triggerPosition && (
          <div
            ref={(el) => {
              if (el) nodeRefs.current.set('trigger', el)
            }}
            style={getNodeWrapperStyles('trigger', triggerPosition)}
            onMouseDown={createDragStartHandler('trigger')}
          >
            <WorkflowNode
              node={{
                id: 'trigger',
                type: 'trigger',
                trigger,
                label: `Trigger: ${trigger.type}`,
                selected: selectedNodeId === 'trigger'
              }}
              onDoubleClick={() => handleNodeDoubleClick('trigger')}
            />
          </div>
        )}

        {/* Step Nodes and Connectors */}
        {steps.map((step, index) => {
          const taskTemplate = step.type === 'task' && step.taskId
            ? availableTasks.find(t => t.id === step.taskId)
            : undefined

          const handlerTemplate = step.type === 'handler' && step.handlerId
            ? availableHandlers.find(h => h.id === step.handlerId)
            : undefined

          const position = nodePositions.get(step.id)
          if (!position) return null

          const deps = stepDependencies.find(d => d.stepId === step.id)

          return (
            <React.Fragment key={step.id}>
              {/* Connector from context box if step uses context */}
              {deps?.usesContext && contextBoxPosition && (() => {
                // Try to get actual dimensions from DOM, with multiple fallbacks
                const contextBoxElement = nodeRefs.current.get('context-box')
                let actualContextBoxWidth = contextBoxPosition.width
                let actualContextBoxHeight = contextBoxPosition.height
                
                // Priority 1: Use measured dimensions from state
                if (contextBoxDimensions) {
                  actualContextBoxWidth = contextBoxDimensions.width
                  actualContextBoxHeight = contextBoxDimensions.height
                } 
                // Priority 2: Try to measure directly from DOM
                else if (contextBoxElement) {
                  const rect = contextBoxElement.getBoundingClientRect()
                  if (rect.width > 0) actualContextBoxWidth = rect.width
                  if (rect.height > 0) actualContextBoxHeight = rect.height
                }
                // Priority 3: Fall back to position data (which uses estimated 250px width)
                
                return (
                  <WorkflowConnector
                    fromId="context-box"
                    toId={step.id}
                    fromX={contextBoxPosition.x + actualContextBoxWidth}
                    fromY={contextBoxPosition.y + actualContextBoxHeight / 2}
                    toX={position.x}
                    toY={position.y + position.height / 2}
                    dashed={true}
                    color="#10B981"
                  />
                )
              })()}

              {/* Connector from previous step if this step depends on it */}
              {deps?.dependsOnStep && (() => {
                const depPosition = nodePositions.get(deps.dependsOnStep!)
                if (!depPosition) return null

                return (
                  <WorkflowConnector
                    fromId={deps.dependsOnStep}
                    toId={step.id}
                    fromX={depPosition.x + depPosition.width / 2}
                    fromY={depPosition.y + depPosition.height}
                    toX={position.x + position.width / 2}
                    toY={position.y}
                    dashed={false}
                    color="#e5e7eb"
                  />
                )
              })()}

              {/* Connector from trigger to first step */}
              {/* Always connect trigger to the first step in the workflow */}
              {index === 0 && triggerPosition && steps.length > 0 && steps[0].id === step.id && !deps?.dependsOnStep && (
                <WorkflowConnector
                  fromId="trigger"
                  toId={step.id}
                  fromX={triggerPosition.x + triggerPosition.width / 2}
                  fromY={triggerPosition.y + triggerPosition.height}
                  toX={position.x + position.width / 2}
                  toY={position.y}
                  dashed={false}
                  color="#e5e7eb"
                />
              )}

              {/* Step Node */}
              <div
                ref={(el) => {
                  if (el) nodeRefs.current.set(step.id, el)
                }}
                style={getNodeWrapperStyles(step.id, position)}
                onMouseDown={createDragStartHandler(step.id, ['button', '.workflow-node-delete'])}
              >
                <WorkflowNode
                  node={{
                    id: step.id,
                    type: step.type,
                    step,
                    taskTemplate,
                    handlerTemplate,
                    label: step.type === 'task'
                      ? taskTemplate?.name || 'Task'
                      : handlerTemplate?.name || 'Handler',
                    selected: selectedNodeId === step.id
                  }}
                  onDoubleClick={() => handleNodeDoubleClick(step.id)}
                  onDelete={() => onRemoveStep(step.id)}
                />
              </div>
            </React.Fragment>
          )
        })}

        {/* Add Step Buttons */}
        {steps.length > 0 && (() => {
          const lastStep = steps[steps.length - 1]
          const lastPosition = nodePositions.get(lastStep.id)
          if (!lastPosition) return null

          return (
            <div
              className="add-step-buttons"
              style={{
                position: 'absolute',
                left: lastPosition.x,
                top: lastPosition.y + lastPosition.height + 40,
                zIndex: 2
              }}
            >
              <button
                className="btn btn-secondary add-step-btn"
                onClick={() => onAddStep('task')}
                type="button"
              >
                <Plus className="icon" size={16} />
                Add Task
              </button>
              <button
                className="btn btn-secondary add-step-btn"
                onClick={() => onAddStep('handler')}
                type="button"
              >
                <Plus className="icon" size={16} />
                Add Handler
              </button>
            </div>
          )
        })()}

        {/* Empty State */}
        {steps.length === 0 && (
          <div className="canvas-empty-state">
            <p>No steps yet. Click the buttons below to add tasks or handlers.</p>
            <div className="add-step-buttons-inline">
              <button
                className="btn btn-primary"
                onClick={() => onAddStep('task')}
                type="button"
              >
                <Plus className="icon" size={16} />
                Add Task
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onAddStep('handler')}
                type="button"
              >
                <Plus className="icon" size={16} />
                Add Handler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {selectedNode && (
        <NodeConfigurationModal
          isOpen={selectedNodeId !== null}
          onClose={handleCloseModal}
          nodeType={selectedNode.type}
          step={selectedNode.step}
          trigger={selectedNode.trigger}
          taskTemplate={selectedNode.taskTemplate}
          handlerTemplate={selectedNode.handlerTemplate}
          availableTasks={availableTasks}
          availableHandlers={availableHandlers}
          dataPoints={dataPoints}
          onUpdateStep={selectedNode.type !== 'trigger' ? handleUpdateStep : undefined}
          onUpdateTrigger={selectedNode.type === 'trigger' && onUpdateTrigger ? onUpdateTrigger : undefined}
        />
      )}
    </div>
  )
}

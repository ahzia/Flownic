import React, { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint, WorkflowTrigger } from '@common/types'
import { WorkflowNode, WorkflowNodeData } from './WorkflowNode'
import { WorkflowConnector } from './WorkflowConnector'
import { NodeConfigurationModal } from './NodeConfigurationModal'
import './VisualWorkflowCanvas.css'
import './WorkflowNode.css'
import './WorkflowConnector.css'
import './NodeConfigurationModal.css'

interface VisualWorkflowCanvasProps {
  steps: WorkflowStep[]
  trigger: WorkflowTrigger
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
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

export const VisualWorkflowCanvas: React.FC<VisualWorkflowCanvasProps> = ({
  steps,
  trigger,
  availableTasks,
  availableHandlers,
  dataPoints,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onUpdateTrigger
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map())
  const canvasRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Calculate node positions (vertical layout)
  useEffect(() => {
    if (!canvasRef.current) return

    const positions = new Map<string, NodePosition>()
    const nodeWidth = 240
    const nodeHeight = 80
    const verticalSpacing = 120
    const horizontalCenter = (canvasRef.current.clientWidth - nodeWidth) / 2
    let currentY = 40

    // Position trigger
    const triggerId = 'trigger'
    positions.set(triggerId, {
      id: triggerId,
      x: horizontalCenter,
      y: currentY,
      width: nodeWidth,
      height: nodeHeight
    })
    currentY += nodeHeight + verticalSpacing

    // Position steps
    steps.forEach((step) => {
      positions.set(step.id, {
        id: step.id,
        x: horizontalCenter,
        y: currentY,
        width: nodeWidth,
        height: nodeHeight
      })
      currentY += nodeHeight + verticalSpacing
    })

    setNodePositions(positions)
  }, [steps, canvasRef])

  const handleNodeClick = (nodeId: string) => {
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

  return (
    <div className="visual-workflow-canvas" ref={canvasRef}>
      <div className="canvas-content">
        {/* Trigger Node */}
        <div
          ref={(el) => {
            if (el) nodeRefs.current.set('trigger', el)
          }}
          style={{
            position: 'absolute',
            left: nodePositions.get('trigger')?.x || 0,
            top: nodePositions.get('trigger')?.y || 0,
            zIndex: 1
          }}
        >
          <WorkflowNode
            node={{
              id: 'trigger',
              type: 'trigger',
              trigger,
              label: `Trigger: ${trigger.type}`,
              selected: selectedNodeId === 'trigger'
            }}
            onClick={() => handleNodeClick('trigger')}
          />
        </div>

        {/* Step Nodes */}
        {steps.map((step, index) => {
          const taskTemplate = step.type === 'task' && step.taskId
            ? availableTasks.find(t => t.id === step.taskId)
            : undefined

          const handlerTemplate = step.type === 'handler' && step.handlerId
            ? availableHandlers.find(h => h.id === step.handlerId)
            : undefined

          const position = nodePositions.get(step.id)
          if (!position) return null

          return (
            <React.Fragment key={step.id}>
              {/* Connector from previous node */}
              {index === 0 && nodePositions.get('trigger') && (
                <WorkflowConnector
                  fromId="trigger"
                  toId={step.id}
                  fromY={nodePositions.get('trigger')!.y + nodePositions.get('trigger')!.height}
                  toY={position.y}
                  x={position.x}
                  width={position.width}
                />
              )}
              {index > 0 && nodePositions.get(steps[index - 1].id) && (
                <WorkflowConnector
                  fromId={steps[index - 1].id}
                  toId={step.id}
                  fromY={nodePositions.get(steps[index - 1].id)!.y + nodePositions.get(steps[index - 1].id)!.height}
                  toY={position.y}
                  x={position.x}
                  width={position.width}
                />
              )}

              {/* Node */}
              <div
                ref={(el) => {
                  if (el) nodeRefs.current.set(step.id, el)
                }}
                style={{
                  position: 'absolute',
                  left: position.x,
                  top: position.y,
                  zIndex: 1
                }}
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
                  onClick={() => handleNodeClick(step.id)}
                  onDelete={() => onRemoveStep(step.id)}
                />
              </div>
            </React.Fragment>
          )
        })}

        {/* Add Step Buttons */}
        <div
          className="add-step-buttons"
          style={{
            position: 'absolute',
            left: nodePositions.get(steps[steps.length - 1]?.id || 'trigger')?.x || 0,
            top: (nodePositions.get(steps[steps.length - 1]?.id || 'trigger')?.y || 0) + 
                 (nodePositions.get(steps[steps.length - 1]?.id || 'trigger')?.height || 0) + 40,
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


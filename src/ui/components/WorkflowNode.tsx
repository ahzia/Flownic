import React from 'react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, WorkflowTrigger } from '@common/types'
import { WorkflowIcon } from './WorkflowIcon'
import './WorkflowNode.css'

export interface WorkflowNodeData {
  id: string
  type: 'trigger' | 'task' | 'handler'
  step?: WorkflowStep
  trigger?: WorkflowTrigger
  taskTemplate?: TaskTemplate
  handlerTemplate?: HandlerTemplate
  label: string
  selected?: boolean
}

interface WorkflowNodeProps {
  node: WorkflowNodeData
  onClick: () => void
  onDelete?: () => void
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  onClick,
  onDelete
}) => {
  const getBorderColor = () => {
    switch (node.type) {
      case 'trigger':
        return 'var(--color-workflow-trigger, #3B82F6)' // Blue
      case 'task':
        return 'var(--color-workflow-task, #10B981)' // Green
      case 'handler':
        return 'var(--color-workflow-handler, #8B5CF6)' // Purple
      default:
        return 'var(--color-border-primary)'
    }
  }

  const getBackgroundColor = () => {
    if (node.selected) {
      switch (node.type) {
        case 'trigger':
          return 'var(--color-workflow-trigger-light, rgba(59, 130, 246, 0.1))'
        case 'task':
          return 'var(--color-workflow-task-light, rgba(16, 185, 129, 0.1))'
        case 'handler':
          return 'var(--color-workflow-handler-light, rgba(139, 92, 246, 0.1))'
        default:
          return 'var(--color-surface-secondary)'
      }
    }
    return 'var(--color-surface)'
  }

  return (
    <div
      className={`workflow-node workflow-node-${node.type} ${node.selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        borderColor: getBorderColor(),
        backgroundColor: getBackgroundColor()
      }}
    >
      <div className="workflow-node-header">
        <div className="workflow-node-icon">
          <WorkflowIcon
            type={node.type}
            subtype={node.trigger?.type || node.step?.taskId || node.step?.handlerId}
            taskTemplate={node.taskTemplate}
            handlerTemplate={node.handlerTemplate}
            size={24}
          />
        </div>
        <div className="workflow-node-info">
          <div className="workflow-node-label">{node.label}</div>
          {node.step && (
            <div className="workflow-node-type-badge">{node.type}</div>
          )}
          {node.trigger && (
            <div className="workflow-node-trigger-badge">{node.trigger.type}</div>
          )}
        </div>
        {onDelete && node.type !== 'trigger' && (
          <button
            className="workflow-node-delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Delete node"
            type="button"
          >
            ×
          </button>
        )}
      </div>
      {node.step?.condition && (
        <div className="workflow-node-condition">
          <span className="condition-indicator">⚡ Condition</span>
        </div>
      )}
    </div>
  )
}


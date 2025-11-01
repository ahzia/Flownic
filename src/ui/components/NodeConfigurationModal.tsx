import React from 'react'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint, WorkflowTrigger, WebsiteConfig } from '@common/types'
import { Modal } from './common/Modal'
import { StepInputForm } from './StepInputForm'
import { TriggerConfigSection } from './TriggerConfigSection'
import './NodeConfigurationModal.css'

interface NodeConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  nodeType: 'trigger' | 'task' | 'handler'
  step?: WorkflowStep
  trigger?: WorkflowTrigger
  websiteConfig?: WebsiteConfig
  taskTemplate?: TaskTemplate
  handlerTemplate?: HandlerTemplate
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onUpdateStep?: (updates: Partial<WorkflowStep>) => void
  onUpdateTrigger?: (trigger: WorkflowTrigger) => void
  onUpdateWebsiteConfig?: (config: WebsiteConfig) => void
}

export const NodeConfigurationModal: React.FC<NodeConfigurationModalProps> = ({
  isOpen,
  onClose,
  nodeType,
  step,
  trigger,
  websiteConfig,
  taskTemplate,
  handlerTemplate,
  availableTasks,
  availableHandlers,
  dataPoints,
  onUpdateStep,
  onUpdateTrigger,
  onUpdateWebsiteConfig
}) => {
  const getTitle = () => {
    if (nodeType === 'trigger' && trigger) {
      return `Configure Trigger: ${trigger.type}`
    }
    if (nodeType === 'task' && taskTemplate) {
      return `Configure Task: ${taskTemplate.name}`
    }
    if (nodeType === 'handler' && handlerTemplate) {
      return `Configure Handler: ${handlerTemplate.name}`
    }
    return 'Configure Node'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="large"
      closeOnOutsideClick={true}
    >
      <div className="node-configuration-modal">
        {nodeType === 'trigger' && trigger && onUpdateTrigger && onUpdateWebsiteConfig && (
          <TriggerConfigSection
            trigger={trigger}
            websiteConfig={websiteConfig || { type: 'all', patterns: '' }}
            onTriggerChange={onUpdateTrigger}
            onWebsiteConfigChange={onUpdateWebsiteConfig}
          />
        )}

        {nodeType === 'task' && step && onUpdateStep && (
          <StepInputForm
            step={step}
            taskTemplate={taskTemplate}
            availableTasks={availableTasks}
            availableHandlers={availableHandlers}
            dataPoints={dataPoints}
            onUpdate={onUpdateStep}
            showCondition={true}
            showDelay={true}
          />
        )}

        {nodeType === 'handler' && step && onUpdateStep && (
          <StepInputForm
            step={step}
            handlerTemplate={handlerTemplate}
            availableTasks={availableTasks}
            availableHandlers={availableHandlers}
            dataPoints={dataPoints}
            onUpdate={onUpdateStep}
            showCondition={true}
            showDelay={true}
          />
        )}
      </div>
    </Modal>
  )
}


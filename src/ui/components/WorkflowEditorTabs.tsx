import React from 'react'
import { Settings, List, Workflow } from 'lucide-react'
import { Tabs, Tab } from './common/Tabs'
import './WorkflowEditorTabs.css'
import './DataPointsSidebar.css'
import { ConfigTab, WorkflowConfig } from './ConfigTab'
import { StepsEditor } from './StepsEditor'
import { VisualWorkflowCanvas } from './VisualWorkflowCanvas'
import { WorkflowStep, TaskTemplate, HandlerTemplate, DataPoint, WorkflowTrigger } from '@common/types'

export type WorkflowEditorTab = 'config' | 'steps' | 'visual'

interface WorkflowEditorTabsProps {
  activeTab: WorkflowEditorTab
  onTabChange: (tab: WorkflowEditorTab) => void
  config: WorkflowConfig
  onConfigChange: (updates: Partial<WorkflowConfig>) => void
  steps: WorkflowStep[]
  availableTasks: TaskTemplate[]
  availableHandlers: HandlerTemplate[]
  dataPoints: DataPoint[]
  onAddStep: (type: 'task' | 'handler') => void
  onRemoveStep: (stepId: string) => void
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void
  onUpdateTrigger?: (trigger: WorkflowTrigger) => void
}

export const WorkflowEditorTabs: React.FC<WorkflowEditorTabsProps> = ({
  activeTab,
  onTabChange,
  config,
  onConfigChange,
  steps,
  availableTasks,
  availableHandlers,
  dataPoints,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onUpdateTrigger
}) => {
  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuration',
      icon: Settings as any
    },
    {
      id: 'steps',
      label: 'Steps',
      icon: List as any
    },
    {
      id: 'visual',
      label: 'Visual',
      icon: Workflow as any
    }
  ]

  return (
    <div className="workflow-editor-tabs">
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => onTabChange(tabId as WorkflowEditorTab)}
      />
      
      <div className="workflow-editor-tab-content">
        {activeTab === 'config' && (
          <ConfigTab
            config={config}
            onConfigChange={onConfigChange}
          />
        )}
        
        {activeTab === 'steps' && (
          <StepsEditor
            steps={steps}
            availableTasks={availableTasks}
            availableHandlers={availableHandlers}
            dataPoints={dataPoints}
            onAddStep={onAddStep}
            onRemoveStep={onRemoveStep}
            onUpdateStep={onUpdateStep}
          />
        )}
        
        {activeTab === 'visual' && (
          <VisualWorkflowCanvas
            steps={steps}
            trigger={config.trigger}
            availableTasks={availableTasks}
            availableHandlers={availableHandlers}
            dataPoints={dataPoints}
            onAddStep={onAddStep}
            onRemoveStep={onRemoveStep}
            onUpdateStep={onUpdateStep}
            onUpdateTrigger={onUpdateTrigger}
          />
        )}
      </div>
    </div>
  )
}


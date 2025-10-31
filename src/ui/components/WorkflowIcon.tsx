import React from 'react'
import * as LucideIcons from 'lucide-react'
import { TaskTemplate, HandlerTemplate } from '@common/types'

export type WorkflowIconType = 'trigger' | 'task' | 'handler'

export interface WorkflowIconProps {
  type: WorkflowIconType
  subtype?: string // taskId, handlerId, or trigger type
  taskTemplate?: TaskTemplate
  handlerTemplate?: HandlerTemplate
  size?: number
  className?: string
}

// Trigger icon mapping
const TRIGGER_ICONS: Record<string, keyof typeof LucideIcons> = {
  manual: 'PlayCircle',
  onPageLoad: 'Globe',
  onSelection: 'MousePointer',
  onFocus: 'Focus',
  schedule: 'Clock'
}

// Default icons for each type
const DEFAULT_ICONS: Record<WorkflowIconType, keyof typeof LucideIcons> = {
  trigger: 'Zap',
  task: 'Zap',
  handler: 'Settings'
}

export const WorkflowIcon: React.FC<WorkflowIconProps> = ({
  type,
  subtype,
  taskTemplate,
  handlerTemplate,
  size = 20,
  className = ''
}) => {
  let iconName: keyof typeof LucideIcons = DEFAULT_ICONS[type]

  // Resolve icon based on type and subtype/template
  if (type === 'trigger' && subtype) {
    iconName = TRIGGER_ICONS[subtype] || DEFAULT_ICONS.trigger
  } else if (type === 'task') {
    // Use icon from template if available, otherwise try subtype
    if (taskTemplate && (taskTemplate as any).icon) {
      iconName = ((taskTemplate as any).icon as keyof typeof LucideIcons) || DEFAULT_ICONS.task
    } else if (subtype) {
      // Fallback: we'd need to look up from registry, but for now use default
      iconName = DEFAULT_ICONS.task
    }
  } else if (type === 'handler') {
    // Use icon from template if available, otherwise try subtype
    if (handlerTemplate && (handlerTemplate as any).icon) {
      iconName = ((handlerTemplate as any).icon as keyof typeof LucideIcons) || DEFAULT_ICONS.handler
    } else if (subtype) {
      // Fallback: we'd need to look up from registry, but for now use default
      iconName = DEFAULT_ICONS.handler
    }
  }

  // Get the icon component from lucide-react
  const IconComponent = LucideIcons[iconName] as React.ComponentType<{ size?: number; className?: string }>
  const DefaultIcon = LucideIcons.Zap as React.ComponentType<{ size?: number; className?: string }>

  const Icon = IconComponent || DefaultIcon

  return <Icon size={size} className={className} />
}


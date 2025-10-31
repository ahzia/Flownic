import React from 'react'
import './WorkflowConnector.css'

interface WorkflowConnectorProps {
  fromId: string
  toId: string
  fromX?: number
  fromY: number
  toX?: number
  toY: number
  x?: number // Legacy support for vertical connectors
  width?: number // Legacy support for vertical connectors
  dashed?: boolean
  label?: string
  color?: string
}

export const WorkflowConnector: React.FC<WorkflowConnectorProps> = ({
  fromId: _fromId,
  toId: _toId,
  fromX,
  fromY,
  toX,
  toY,
  x,
  width = 200,
  dashed = false,
  label: _label,
  color
}) => {
  // Support both new (fromX/toX) and legacy (x/width) positioning
  const startX = fromX !== undefined ? fromX : (x !== undefined ? x + width / 2 : 0)
  const startY = fromY
  const endX = toX !== undefined ? toX : (x !== undefined ? x + width / 2 : 0)
  const endY = toY

  // Calculate smooth bezier curve path
  const dx = endX - startX
  const dy = endY - startY
  const isHorizontal = Math.abs(dx) > Math.abs(dy)
  
  // Calculate control points for smooth curves
  // Use cubic bezier curves that start/end perpendicular to nodes for natural workflow look
  let pathData: string
  
  if (isHorizontal) {
    // Horizontal connection (e.g., context to task): smooth horizontal curve
    // Control points create a gentle S-curve that starts and ends perpendicular
    const curveDistance = Math.max(Math.abs(dx) * 0.3, 50) // Adaptive curve distance
    const controlX1 = startX + curveDistance
    const controlY1 = startY
    const controlX2 = endX - curveDistance
    const controlY2 = endY
    pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
  } else {
    // Vertical connection (e.g., task to task): smooth vertical curve
    // Control points create a gentle S-curve that starts and ends perpendicular
    const curveDistance = Math.max(Math.abs(dy) * 0.3, 50) // Adaptive curve distance
    const controlX1 = startX
    const controlY1 = startY + curveDistance
    const controlX2 = endX
    const controlY2 = endY - curveDistance
    pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
  }

  const strokeColor = color || 'var(--color-border-primary, #e5e7eb)'
  const strokeDasharray = dashed ? '5,5' : 'none'

  return (
    <svg
      className="workflow-connector"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible'
      }}
    >
      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={dashed ? 1.5 : 2}
        strokeDasharray={strokeDasharray}
        fill="none"
        className="connector-line"
      />
    </svg>
  )
}


import React from 'react'
import './WorkflowConnector.css'

interface WorkflowConnectorProps {
  fromId: string
  toId: string
  fromY: number
  toY: number
  x: number
  width?: number
}

export const WorkflowConnector: React.FC<WorkflowConnectorProps> = ({
  fromId,
  toId,
  fromY,
  toY,
  x,
  width = 200
}) => {
  // Calculate connector path
  const startX = x + width / 2
  const startY = fromY
  const endX = x + width / 2
  const endY = toY
  const midY = (startY + endY) / 2

  // Create SVG path for the connector
  const pathData = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`

  return (
    <svg
      className="workflow-connector"
      style={{
        position: 'absolute',
        left: 0,
        top: Math.min(startY, endY),
        width: '100%',
        height: Math.abs(endY - startY) + 40,
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <defs>
        <marker
          id={`arrowhead-${fromId}-${toId}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="var(--color-border-primary, #e5e7eb)"
          />
        </marker>
      </defs>
      <path
        d={pathData}
        stroke="var(--color-border-primary, #e5e7eb)"
        strokeWidth="2"
        fill="none"
        markerEnd={`url(#arrowhead-${fromId}-${toId})`}
        className="connector-line"
      />
    </svg>
  )
}


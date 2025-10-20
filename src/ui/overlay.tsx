import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Quickbar } from './Quickbar'
import { ActionPlan } from '@common/types'
import './styles.css'

const OverlayApp: React.FC = () => {
  const [isQuickbarOpen, setIsQuickbarOpen] = useState(false)
  const [, setCurrentActionPlan] = useState<ActionPlan | null>(null)

  useEffect(() => {
    // Listen for keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Shift + K
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        setIsQuickbarOpen(true)
      }
    }

    // Listen for messages from background script
    const handleMessage = (message: any) => {
      if (message.type === 'OPEN_QUICKBAR') {
        setIsQuickbarOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const handleCloseQuickbar = () => {
    setIsQuickbarOpen(false)
    setCurrentActionPlan(null)
  }

  const handleActionPlanGenerated = async (actionPlan: ActionPlan) => {
    setCurrentActionPlan(actionPlan)
    
    try {
      // Send action plan to background script for execution
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_ACTION_PLAN',
        data: { actionPlan }
      })

      if (response.success) {
        console.log('Action plan executed successfully:', response.data)
      } else {
        console.error('Failed to execute action plan:', response.error)
      }
    } catch (error) {
      console.error('Error executing action plan:', error)
    }
  }

  return (
    <Quickbar
      isOpen={isQuickbarOpen}
      onClose={handleCloseQuickbar}
      onActionPlanGenerated={handleActionPlanGenerated}
    />
  )
}

// Initialize the overlay
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<OverlayApp />)
}

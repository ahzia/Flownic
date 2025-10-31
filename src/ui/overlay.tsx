import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Quickbar } from './Quickbar'
import { Workflow } from '@common/types'
import './styles.css'

const OverlayApp: React.FC = () => {
  // Start with Quickbar open since we're being injected to show it
  const [isQuickbarOpen, setIsQuickbarOpen] = useState(true)

  useEffect(() => {
    // Listen for messages from parent window or background script
    const handleMessage = (message: any) => {
      if (message.type === 'OPEN_QUICKBAR') {
        setIsQuickbarOpen(true)
      } else if (message.type === 'CLOSE_QUICKBAR') {
        setIsQuickbarOpen(false)
      }
    }

    // Listen from chrome.runtime (background script)
    chrome.runtime.onMessage.addListener(handleMessage)

    // Listen from parent window (content script)
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin (the extension)
      if (event.data && typeof event.data === 'object') {
        handleMessage(event.data)
      }
    })

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      window.removeEventListener('message', handleMessage as any)
    }
  }, [])

  const handleCloseQuickbar = () => {
    setIsQuickbarOpen(false)
    // Also notify parent window to hide the overlay wrapper (if in iframe)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLOSE_OVERLAY' }, '*')
    }
  }

  const handleWorkflowExecute = async (workflow: Workflow) => {
    try {
      // Send workflow to background script for execution
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_WORKFLOW',
        data: { workflow }
      })

      if (response?.success) {
        console.log('✅ Workflow executed successfully:', response.data)
      } else {
        console.error('❌ Failed to execute workflow:', response?.error)
      }
    } catch (error) {
      console.error('❌ Error executing workflow:', error)
    }
  }

  return (
    <Quickbar
      isOpen={isQuickbarOpen}
      onClose={handleCloseQuickbar}
      onWorkflowExecute={handleWorkflowExecute}
    />
  )
}

// Initialize the overlay
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<OverlayApp />)
}

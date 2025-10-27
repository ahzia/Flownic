import { createRoot } from 'react-dom/client'
import { PlaygroundApp } from './PlaygroundApp'
import { themeManager } from './theme'
import './playground.css'

// Initialize theme
themeManager.initialize()

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PlaygroundApp />)
} else {
  console.error('Root container not found')
}

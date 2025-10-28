import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto-remove after duration
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300) // Wait for fade-out animation
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    success: <CheckCircle className="toast-icon" />,
    error: <AlertCircle className="toast-icon" />,
    warning: <AlertCircle className="toast-icon" />,
    info: <Info className="toast-icon" />
  }

  return (
    <div className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : ''}`}>
      <div className="toast-content">
        {icons[toast.type]}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button className="toast-close" onClick={() => {
        setIsVisible(false)
        setTimeout(() => onRemove(toast.id), 300)
      }}>
        <X className="icon" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Toast manager hook
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType, duration?: number) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    const newToast: Toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (message: string, duration?: number) => showToast(message, 'success', duration)
  const error = (message: string, duration?: number) => showToast(message, 'error', duration)
  const warning = (message: string, duration?: number) => showToast(message, 'warning', duration)
  const info = (message: string, duration?: number) => showToast(message, 'info', duration)

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast
  }
}


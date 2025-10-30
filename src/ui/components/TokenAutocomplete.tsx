import React, { useState, useEffect, useRef } from 'react'
import { DataPoint } from '@common/types'

interface TokenAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
  dataPoints: DataPoint[]
  onInsert: (text: string) => void
}

export const TokenAutocomplete: React.FC<TokenAutocompleteProps> = ({
  textareaRef,
  dataPoints,
  onInsert
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; fields?: string[] }>>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [insertPosition, setInsertPosition] = useState<{ start: number; end: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return

    const handleInput = (e: Event) => {
      const target = e.target as HTMLTextAreaElement | HTMLInputElement
      const cursorPos = target.selectionStart || 0
      const textBeforeCursor = target.value.substring(0, cursorPos)
      
      // Check if user is typing ${ or . after a token start
      const lastDollar = textBeforeCursor.lastIndexOf('${')
      if (lastDollar === -1) {
        setShowDropdown(false)
        setInsertPosition(null)
        return
      }
      
      const textAfterDollar = textBeforeCursor.substring(lastDollar + 2)
      const dotIndex = textAfterDollar.indexOf('.')
      
      if (dotIndex === -1) {
        // User is typing data point ID
        const currentId = textAfterDollar.trim()
        const filtered = dataPoints.filter(dp => 
          dp.id.toLowerCase().includes(currentId.toLowerCase()) ||
          dp.name.toLowerCase().includes(currentId.toLowerCase())
        ).slice(0, 10)
        
        setSuggestions(filtered.map(dp => ({
          id: dp.id,
          name: dp.name,
          fields: dp.value && typeof dp.value === 'object' ? Object.keys(dp.value) : undefined
        })))
        setShowDropdown(filtered.length > 0)
        setInsertPosition({ start: lastDollar + 2, end: cursorPos })
        setSelectedIndex(0)
      } else {
        // User is typing field name after .
        const dataPointId = textAfterDollar.substring(0, dotIndex).trim()
        const dataPoint = dataPoints.find(dp => dp.id === dataPointId)
        
        if (dataPoint && dataPoint.value && typeof dataPoint.value === 'object') {
          const currentField = textAfterDollar.substring(dotIndex + 1).trim()
          const fields = Object.keys(dataPoint.value).filter(f => 
            f.toLowerCase().includes(currentField.toLowerCase())
          )
          
          // Also include __raw__ option
          const allFields = ['__raw__', ...fields].filter(f => 
            f === '__raw__' || f.toLowerCase().includes(currentField.toLowerCase())
          )
          
          setSuggestions(allFields.map(field => ({
            id: `${dataPointId}.${field}`,
            name: field === '__raw__' ? '(Original JSON)' : field
          })))
          setShowDropdown(allFields.length > 0)
          setInsertPosition({ start: lastDollar + 2 + dotIndex + 1, end: cursorPos })
          setSelectedIndex(0)
        } else {
          setShowDropdown(false)
        }
      }
    }

    const handleKeyDown = (e: Event) => {
      const ke = e as KeyboardEvent
      if (!showDropdown) return
      
      if (ke.key === 'ArrowDown') {
        ke.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
      } else if (ke.key === 'ArrowUp') {
        ke.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (ke.key === 'Enter' || ke.key === 'Tab') {
        ke.preventDefault()
        if (suggestions[selectedIndex]) {
          insertSuggestion(suggestions[selectedIndex])
        }
      } else if (ke.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    element.addEventListener('input', handleInput)
    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('input', handleInput)
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [textareaRef, dataPoints, showDropdown, suggestions, selectedIndex])

  const insertSuggestion = (suggestion: { id: string; name: string }) => {
    const element = textareaRef.current
    if (!element || !insertPosition) return

    const currentValue = element.value
    const before = currentValue.substring(0, insertPosition.start)
    const after = currentValue.substring(insertPosition.end)
    
    // Determine what to insert
    let toInsert = suggestion.id
    if (suggestion.id.includes('.')) {
      // Field selection - insert field name only
      toInsert = suggestion.id.split('.').pop() || suggestion.name
    }
    
    // Check if we need to close the token
    const needsClose = !after.startsWith('}')
    
    const newValue = before + toInsert + (needsClose ? '}' : '') + after
    const newCursorPos = before.length + toInsert.length + (needsClose ? 1 : 0)
    
    onInsert(newValue)
    setShowDropdown(false)
    
    // Set cursor position
    setTimeout(() => {
      element.setSelectionRange(newCursorPos, newCursorPos)
      element.focus()
    }, 0)
  }

  if (!showDropdown || suggestions.length === 0) {
    return null
  }

  // Calculate position for dropdown
  const element = textareaRef.current
  if (!element) return null

  return (
    <div
      ref={dropdownRef}
      className="token-autocomplete-dropdown"
      style={{
        position: 'absolute',
        zIndex: 10000,
        background: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border-primary, #e5e7eb)',
        borderRadius: 'var(--radius-md, 6px)',
        boxShadow: '0 4px 12px var(--color-shadow-md, rgba(0,0,0,0.15))',
        maxHeight: '200px',
        overflowY: 'auto',
        minWidth: '200px'
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          onClick={() => insertSuggestion(suggestion)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: index === selectedIndex ? 'var(--color-surface-secondary, #f3f4f6)' : 'transparent',
            borderBottom: index < suggestions.length - 1 ? '1px solid var(--color-border-primary, #e5e7eb)' : 'none'
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary, #111827)' }}>
            {suggestion.name}
          </div>
          {suggestion.id && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '2px' }}>
              {suggestion.id}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Database, Save } from 'lucide-react'
import { KBEntry, DataPoint } from '@common/types'
import { getKBEntries, saveKBEntry, deleteKBEntry } from '@utils/kb'

interface KnowledgeBasePanelProps {
  onAddDataPoint?: (dataPoint: DataPoint) => void
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({ onAddDataPoint }) => {
  const [entries, setEntries] = useState<KBEntry[]>([])
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const load = async () => {
    const list = await getKBEntries()
    setEntries(list)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return
    const now = Date.now()
    const entry: KBEntry = {
      id: `kb_${now}`,
      name: name.trim(),
      content: content.trim(),
      type: 'text',
      tags: [],
      createdAt: now,
      updatedAt: now
    }
    await saveKBEntry(entry)
    setName('')
    setContent('')
    await load()
  }

  const handleDelete = async (id: string) => {
    await deleteKBEntry(id)
    await load()
  }

  const addToDataPoints = (entry: KBEntry) => {
    if (!onAddDataPoint) return
    const dp: DataPoint = {
      id: `kb_${entry.id}`,
      name: `KB: ${entry.name}`,
      type: 'context',
      value: { text: entry.content, title: entry.name, source: 'kb' },
      source: 'kb',
      timestamp: Date.now()
    }
    onAddDataPoint(dp)
  }

  return (
    <div className="editor-section">
      <div className="section-header">
        <h3>Knowledge Base</h3>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Company Boilerplate"
          />
        </div>
        <div className="form-group full-width">
          <label>Content</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter reusable text..."
          />
        </div>
        <div className="form-group">
          <button className="btn btn-primary" onClick={handleSave}>
            <Save className="icon" /> Save Entry
          </button>
        </div>
      </div>

      <div className="data-points-container">
        <div className="data-points-header">
          <h4>Saved Entries</h4>
          <p>Insert any entry into your workflow as a data point</p>
        </div>
        {entries.length === 0 ? (
          <div className="empty-state">
            <Database className="icon" />
            <p>No entries yet.</p>
          </div>
        ) : (
          <div className="data-points-grid">
            {entries.map((e) => (
              <div key={e.id} className="data-point-card">
                <div className="data-point-header">
                  <div className="data-point-info">
                    <h6>{e.name}</h6>
                    <span className="data-point-type">Knowledge</span>
                  </div>
                  <button className="btn-icon danger" onClick={() => handleDelete(e.id)} title="Delete entry">
                    <Trash2 className="icon" />
                  </button>
                </div>
                <div className="data-point-preview">
                  <code>{e.content.substring(0, 120)}{e.content.length > 120 ? '...' : ''}</code>
                </div>
                {onAddDataPoint && (
                  <div className="data-point-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => addToDataPoints(e)}>
                      <Plus className="icon" /> Add to Data Points
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



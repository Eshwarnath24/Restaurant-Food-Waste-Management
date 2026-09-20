import { useState } from 'react'

export default function AddFoodModal({ existingIds, onConfirm, onClose }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  function getNextId() {
    if (!existingIds || existingIds.length === 0) return 'FOOD_001'
    const nums = existingIds
      .map(id => parseInt(id.replace('FOOD_', ''), 10))
      .filter(n => !isNaN(n))
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return `FOOD_${String(next).padStart(3, '0')}`
  }

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      await onConfirm(getNextId(), trimmed)
      onClose()
    } catch {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-title">Add Menu Item</div>
        <input
          className="modal-input"
          placeholder="e.g. Chicken 65"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className="modal-actions">
          <button type="button" className="action-btn outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="action-btn primary"
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
          >
            {loading ? 'Adding…' : 'Add Food'}
          </button>
        </div>
      </div>
    </div>
  )
}

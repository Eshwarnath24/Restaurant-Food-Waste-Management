import { useState } from 'react'

export default function OrderLineSelector({ foods, onConfirm, onClose, batchType }) {
  const [quantities, setQuantities] = useState({})
  const [filter, setFilter] = useState('')

  function setQty(foodId, qty) {
    setQuantities(prev => {
      const next = { ...prev }
      if (qty <= 0) {
        delete next[foodId]
      } else {
        next[foodId] = qty
      }
      return next
    })
  }

  function getQty(foodId) {
    return quantities[foodId] || 0
  }

  const hasSelection = Object.keys(quantities).length > 0
  const totalItemsCount = Object.values(quantities).reduce((a, b) => a + b, 0)

  const filteredFoods = foods.filter(f =>
    f.name.toLowerCase().includes(filter.toLowerCase().trim()) ||
    f.id.toLowerCase().includes(filter.toLowerCase().trim())
  )

  function handleConfirm() {
    const lines = Object.entries(quantities).map(([foodId, quantity]) => ({
      foodId,
      quantity,
    }))
    if (lines.length > 0) onConfirm(lines)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-title">
          {batchType === 'addon' ? 'Add More Items' : 'Select Order Items'}
        </div>
        {batchType === 'addon' && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            These items will be tagged as add-on
          </div>
        )}

        {foods.length > 5 && (
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              className="modal-input"
              style={{ padding: '10px 14px', fontSize: 14 }}
              placeholder="Filter items…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        )}

        <div className="selector-list">
          {filteredFoods.map(food => {
            const qty = getQty(food.id)
            const selected = qty > 0
            return (
              <div
                key={food.id}
                className={`selector-item ${selected ? 'selected' : ''}`}
                onClick={() => {
                  if (qty === 0) setQty(food.id, 1)
                }}
              >
                <div className="selector-item-name">
                  <div>{food.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{food.id}</div>
                </div>
                <div className="qty-control" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty(food.id, qty - 1)}
                    disabled={qty <= 0}
                    aria-label={`Decrease ${food.name}`}
                  >
                    −
                  </button>
                  <span className="qty-value">{qty}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty(food.id, qty + 1)}
                    aria-label={`Increase ${food.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {foods.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No menu items</div>
            <div className="empty-sub">Add foods from the Menu tab first.</div>
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <div className="empty-icon" style={{ fontSize: 28 }}>🔍</div>
            <div className="empty-sub">No items match "{filter}".</div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="action-btn outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="action-btn primary"
            onClick={handleConfirm}
            disabled={!hasSelection}
          >
            {hasSelection ? `Add ${totalItemsCount} Item${totalItemsCount !== 1 ? 's' : ''}` : 'Select Items'}
          </button>
        </div>
      </div>
    </div>
  )
}

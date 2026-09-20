export default function ConfirmModal({ isOpen, title, message, confirmText = 'Delete', onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-title" style={{ color: danger ? 'var(--red)' : 'var(--text-primary)' }}>
          {title || 'Confirm Action'}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          {message}
        </p>
        <div className="modal-actions">
          <button type="button" className="action-btn outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`action-btn ${danger ? 'red' : 'primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

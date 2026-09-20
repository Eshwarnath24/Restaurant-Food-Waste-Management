import { useState } from 'react'
import { supabase } from '../supabase'
import ConfirmModal from './ConfirmModal'

export default function SessionList({ sessions, onOpenSession, onDeleteSession, onRenameSession, showToast }) {
  const [tab, setTab] = useState('active')
  const [showNew, setShowNew] = useState(false)
  const [tableNum, setTableNum] = useState('')
  const [creating, setCreating] = useState(false)
  // Rename state
  const [renamingSession, setRenamingSession] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  // Delete confirm state
  const [deletingSession, setDeletingSession] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')

  const active = sessions.filter(s => s.status === 'active')
  const cleared = sessions.filter(s => s.status === 'cleared')
  const list = tab === 'active' ? active : cleared

  const filteredList = list.filter(s =>
    s.table_number.toLowerCase().includes(search.toLowerCase().trim())
  )

  async function createSession() {
    const trimmed = tableNum.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('table_sessions')
        .insert({ table_number: trimmed, status: 'active' })
        .select()
        .single()
      if (error) throw error
      showToast('✅ Session started for ' + trimmed)
      setShowNew(false)
      setTableNum('')
      onOpenSession(data.id, trimmed)
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed'))
    } finally {
      setCreating(false)
    }
  }

  // ── Rename session ─────────────────────────────────────────
  function openRename(session, e) {
    e.stopPropagation()
    setRenamingSession(session)
    setRenameValue(session.table_number)
  }

  async function submitRename() {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingSession) return
    setRenaming(true)
    try {
      const { error } = await supabase
        .from('table_sessions')
        .update({ table_number: trimmed })
        .eq('id', renamingSession.id)
      if (error) throw error
      // Immediate local state update via parent
      if (onRenameSession) onRenameSession(renamingSession.id, trimmed)
      showToast('✏️ Renamed to ' + trimmed)
      setRenamingSession(null)
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed'))
    } finally {
      setRenaming(false)
    }
  }

  // ── Delete session (with storage cleanup) ──────────────────
  function promptDelete(session, e) {
    e.stopPropagation()
    setDeletingSession(session)
  }

  async function executeDelete() {
    if (!deletingSession) return
    const session = deletingSession
    setDeleting(true)
    try {
      // 1. Fetch all storage paths for this session
      const [beforeRes, afterRes] = await Promise.all([
        supabase.from('before_images').select('storage_path').eq('session_id', session.id),
        supabase.from('after_images').select('storage_path').eq('session_id', session.id),
      ])
      const paths = []
      if (beforeRes.data) beforeRes.data.forEach(r => paths.push(r.storage_path))
      if (afterRes.data) afterRes.data.forEach(r => paths.push(r.storage_path))

      // 2. Delete storage files first
      if (paths.length > 0) {
        await supabase.storage.from('session-images').remove(paths)
      }

      // 3. Delete session row (cascade removes DB rows for order_lines, before_images, after_images)
      const { error } = await supabase.from('table_sessions').delete().eq('id', session.id)
      if (error) throw error

      // 4. Immediate local state update via parent
      if (onDeleteSession) onDeleteSession(session.id)
      showToast('🗑️ Deleted ' + session.table_number)
      setDeletingSession(null)
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed'))
    } finally {
      setDeleting(false)
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <div className="inline-tabs">
        <button
          type="button"
          className={`inline-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          className={`inline-tab ${tab === 'cleared' ? 'active' : ''}`}
          onClick={() => setTab('cleared')}
        >
          Cleared ({cleared.length})
        </button>
      </div>

      {list.length > 0 && (
        <div className="search-container">
          <div className="search-input-wrap">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search table number or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{tab === 'active' ? '📋' : '✅'}</div>
          <div className="empty-title">
            {tab === 'active' ? 'No active sessions' : 'No cleared sessions'}
          </div>
          <div className="empty-sub">
            {tab === 'active'
              ? 'Tap + to start a new table session.'
              : 'Sessions appear here after clearing.'}
          </div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No tables found</div>
          <div className="empty-sub">No tables match "{search}".</div>
        </div>
      ) : (
        <div className="session-list">
          {filteredList.map(s => (
            <div
              key={s.id}
              className="glass-card session-card clickable"
              onClick={() => onOpenSession(s.id, s.table_number)}
            >
              <div className={`session-icon ${s.status}`}>
                {s.status === 'active' ? '🟢' : '✅'}
              </div>
              <div className="session-info">
                <div className="session-table">{s.table_number}</div>
                <div className="session-meta">
                  {formatDate(s.created_at)} · {formatTime(s.created_at)}
                  {s.cleared_at && ` → ${formatTime(s.cleared_at)}`}
                </div>
              </div>
              <div className="session-card-actions">
                <button
                  type="button"
                  className="session-action-btn"
                  onClick={(e) => openRename(s, e)}
                  title="Rename"
                  aria-label="Rename table"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="session-action-btn danger"
                  onClick={(e) => promptDelete(s, e)}
                  title="Delete"
                  aria-label="Delete table"
                >
                  🗑️
                </button>
              </div>
              <div className={`session-status ${s.status}`}>
                {s.status}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="fab"
        onClick={() => setShowNew(true)}
        title="New session"
        aria-label="New session"
      >
        +
      </button>

      {/* New Session Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-drag-handle" />
            <div className="modal-title">New Table Session</div>
            <input
              className="modal-input"
              placeholder="e.g. Table 3"
              value={tableNum}
              onChange={e => setTableNum(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createSession()}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="action-btn outline"
                onClick={() => setShowNew(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={createSession}
                disabled={!tableNum.trim() || creating}
              >
                {creating ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Session Modal */}
      {renamingSession && (
        <div className="modal-overlay" onClick={() => setRenamingSession(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-drag-handle" />
            <div className="modal-title">Rename Session</div>
            <input
              className="modal-input"
              placeholder="e.g. Table 5"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitRename()}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="action-btn outline"
                onClick={() => setRenamingSession(null)}
                disabled={renaming}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={submitRename}
                disabled={!renameValue.trim() || renaming}
              >
                {renaming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingSession}
        title="Delete Table Session"
        message={`Are you sure you want to delete "${deletingSession?.table_number}" and all its before/after photos? This cannot be undone.`}
        confirmText={deleting ? 'Deleting…' : 'Delete Session'}
        onConfirm={executeDelete}
        onCancel={() => setDeletingSession(null)}
      />
    </>
  )
}

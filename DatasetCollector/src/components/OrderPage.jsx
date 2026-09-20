import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import OrderLineSelector from './OrderLineSelector'
import CameraModal from './CameraModal'
import ConfirmModal from './ConfirmModal'

export default function OrderPage({ sessionId, tableNumber, foods, onBack, showToast }) {
  const [session, setSession] = useState(null)
  const [orderLines, setOrderLines] = useState([])
  const [beforeImages, setBeforeImages] = useState([])
  const [afterImage, setAfterImage] = useState(null)
  const [showSelector, setShowSelector] = useState(false)
  const [showBeforeCamera, setShowBeforeCamera] = useState(false)
  const [showAfterCamera, setShowAfterCamera] = useState(false)
  const [retakingBeforeId, setRetakingBeforeId] = useState(null)
  const [retakingAfter, setRetakingAfter] = useState(false)

  // Delete modal states (replaces browser window.confirm)
  const [deletingBeforeItem, setDeletingBeforeItem] = useState(null)
  const [confirmDeleteAfter, setConfirmDeleteAfter] = useState(false)
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState(false)
  const [selectedBeforeImage, setSelectedBeforeImage] = useState(null)

  // ── Load session data ──────────────────────────────────────
  const loadData = useCallback(async () => {
    const [sessRes, linesRes, beforeRes, afterRes] = await Promise.all([
      supabase.from('table_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('order_lines').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      supabase.from('before_images').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('after_images').select('*').eq('session_id', sessionId).maybeSingle(),
    ])
    if (sessRes.data) setSession(sessRes.data)
    if (linesRes.data) setOrderLines(linesRes.data)
    if (beforeRes.data) setBeforeImages(beforeRes.data)
    setAfterImage(afterRes.data || null)
  }, [sessionId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_lines', filter: `session_id=eq.${sessionId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'before_images', filter: `session_id=eq.${sessionId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'after_images', filter: `session_id=eq.${sessionId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `id=eq.${sessionId}` }, () => loadData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [sessionId, loadData])

  // ── Helpers ────────────────────────────────────────────────
  function getFoodName(foodId) {
    const f = foods.find(x => x.id === foodId)
    return f ? f.name : foodId
  }

  function getPhotographedLineIds() {
    const set = new Set()
    beforeImages.forEach(bi => {
      if (bi.order_line_ids) bi.order_line_ids.forEach(id => set.add(id))
    })
    return set
  }

  function getUnphotographedLines() {
    const photographed = getPhotographedLineIds()
    return orderLines.filter(l => !photographed.has(l.id))
  }

  function formatTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function getCoveredNames(bi) {
    const ids = bi.order_line_ids || []
    if (ids.length === 0) {
      return orderLines.length > 0
        ? orderLines.map(l => `${getFoodName(l.food_id)} ×${l.quantity}`).join(', ')
        : 'All items'
    }
    const names = ids
      .map(lid => {
        const line = orderLines.find(l => l.id === lid)
        return line ? `${getFoodName(line.food_id)} ×${line.quantity}` : null
      })
      .filter(Boolean)
    return names.length > 0 ? names.join(', ') : 'Order items'
  }

  // ── Add order lines ───────────────────────────────────────
  async function handleAddLines(lines) {
    const hasExisting = orderLines.length > 0
    const batchType = hasExisting ? 'addon' : 'initial'
    const rows = lines.map(l => ({
      session_id: sessionId,
      food_id: l.foodId,
      quantity: l.quantity,
      batch_type: batchType,
    }))
    const { data, error } = await supabase.from('order_lines').insert(rows).select()
    if (error) {
      showToast('❌ ' + error.message)
      return
    }
    // Optimistic: append to local state
    if (data) setOrderLines(prev => [...prev, ...data])
    showToast(`✅ Added ${lines.length} item(s) as ${batchType}`)
    setShowSelector(false)
  }

  // ── Image upload helper ───────────────────────────────────
  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }

  async function uploadToStorage(path, dataUrl, upsert = false) {
    const blob = dataUrlToBlob(dataUrl)
    const { error } = await supabase.storage
      .from('session-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert })
    if (error) throw new Error('Upload failed: ' + error.message)
    const { data: { publicUrl } } = supabase.storage
      .from('session-images')
      .getPublicUrl(path)
    return publicUrl
  }

  // ── Before image capture (supports multiple before images!) ──
  async function handleBeforeCapture(dataUrl) {
    const unphotographed = getUnphotographedLines()
    // If all items already photographed, link this additional photo to all order lines
    const lineIds = unphotographed.length > 0
      ? unphotographed.map(l => l.id)
      : orderLines.map(l => l.id)
    const path = `${sessionId}/before_${Date.now()}.jpg`

    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      const { data, error } = await supabase.from('before_images').insert({
        session_id: sessionId,
        order_line_ids: lineIds,
        image_url: publicUrl,
        storage_path: path,
      }).select().single()
      if (error) throw error
      // Optimistic: prepend to local state
      if (data) setBeforeImages(prev => [data, ...prev])
      showToast('📸 Before image saved')
      setShowBeforeCamera(false)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Retake before image ───────────────────────────────────
  async function handleRetakeBefore(dataUrl) {
    const existing = beforeImages.find(bi => bi.id === retakingBeforeId)
    if (!existing) return
    const path = `${sessionId}/before_${Date.now()}.jpg`

    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      // Delete old image from storage
      await supabase.storage.from('session-images').remove([existing.storage_path])
      // Update the DB row (preserve order_line_ids)
      const { error } = await supabase
        .from('before_images')
        .update({ image_url: publicUrl, storage_path: path })
        .eq('id', existing.id)
      if (error) throw error
      // Optimistic update
      setBeforeImages(prev => prev.map(bi =>
        bi.id === existing.id ? { ...bi, image_url: publicUrl, storage_path: path } : bi
      ))
      showToast('🔄 Before image retaken')
      setRetakingBeforeId(null)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Delete before image (in-app modal confirmed) ──────────
  async function executeDeleteBefore() {
    if (!deletingBeforeItem) return
    const bi = deletingBeforeItem
    setDeletingBeforeItem(null)
    try {
      await supabase.storage.from('session-images').remove([bi.storage_path])
      const { error } = await supabase.from('before_images').delete().eq('id', bi.id)
      if (error) throw error
      // Optimistic remove — recalculates un-photographed lines automatically
      setBeforeImages(prev => prev.filter(x => x.id !== bi.id))
      showToast('🗑️ Before image deleted')
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── After image capture ───────────────────────────────────
  async function handleAfterCapture(dataUrl) {
    const path = `${sessionId}/after_${Date.now()}.jpg`

    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      const { data, error } = await supabase.from('after_images').insert({
        session_id: sessionId,
        image_url: publicUrl,
        storage_path: path,
      }).select().single()
      if (error) throw error
      // Mark session as cleared
      await supabase.from('table_sessions').update({
        status: 'cleared',
        cleared_at: new Date().toISOString(),
      }).eq('id', sessionId)
      // Optimistic update
      if (data) setAfterImage(data)
      setSession(prev => prev ? { ...prev, status: 'cleared', cleared_at: new Date().toISOString() } : prev)
      showToast('🏁 Table cleared!')
      setShowAfterCamera(false)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Retake after image ────────────────────────────────────
  async function handleRetakeAfter(dataUrl) {
    if (!afterImage) return
    const path = `${sessionId}/after_${Date.now()}.jpg`

    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      await supabase.storage.from('session-images').remove([afterImage.storage_path])
      const { error } = await supabase
        .from('after_images')
        .update({ image_url: publicUrl, storage_path: path })
        .eq('id', afterImage.id)
      if (error) throw error
      // Optimistic update
      setAfterImage(prev => prev ? { ...prev, image_url: publicUrl, storage_path: path } : prev)
      showToast('🔄 After image retaken')
      setRetakingAfter(false)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Delete after image (reverts session to active) ────────
  async function executeDeleteAfter() {
    if (!afterImage) return
    setConfirmDeleteAfter(false)
    try {
      await supabase.storage.from('session-images').remove([afterImage.storage_path])
      const { error } = await supabase.from('after_images').delete().eq('id', afterImage.id)
      if (error) throw error
      // Revert session status
      await supabase.from('table_sessions').update({
        status: 'active',
        cleared_at: null,
      }).eq('id', sessionId)
      // Optimistic update
      setAfterImage(null)
      setSession(prev => prev ? { ...prev, status: 'active', cleared_at: null } : prev)
      showToast('🗑️ After image deleted — session re-opened')
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Delete entire order from preview ──────────────────────
  async function executeDeleteOrder() {
    setDeletingOrder(true)
    try {
      const paths = []
      beforeImages.forEach(b => { if (b.storage_path) paths.push(b.storage_path) })
      if (afterImage?.storage_path) paths.push(afterImage.storage_path)

      if (paths.length > 0) {
        await supabase.storage.from('session-images').remove(paths)
      }

      const { error } = await supabase.from('table_sessions').delete().eq('id', sessionId)
      if (error) throw error

      showToast(`🗑️ Deleted ${tableNumber}`)
      setConfirmDeleteOrder(false)
      onBack()
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed to delete order'))
    } finally {
      setDeletingOrder(false)
    }
  }

  // ── Computed values ───────────────────────────────────────
  const unphotographedLines = getUnphotographedLines()
  const hasUnphotographed = unphotographedLines.length > 0
  const isCleared = session?.status === 'cleared'
  const hasAfter = !!afterImage
  const batchType = orderLines.length > 0 ? 'addon' : 'initial'

  // ── Group order lines by food item (e.g. chicken 2, Paneer 2) ──
  const groupedLines = Object.values(
    orderLines.reduce((acc, line) => {
      if (!acc[line.food_id]) {
        acc[line.food_id] = {
          food_id: line.food_id,
          name: getFoodName(line.food_id),
          quantity: 0,
        }
      }
      acc[line.food_id].quantity += Number(line.quantity) || 1
      return acc
    }, {})
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div className="page-title">{tableNumber}</div>
          <div className="page-subtitle">
            {isCleared ? '✅ Cleared' : '🟢 Active'}
            {session && ` · Started ${formatTime(session.created_at)}`}
          </div>
        </div>
        <button
          type="button"
          className="session-action-btn danger"
          style={{ marginLeft: 'auto' }}
          onClick={() => setConfirmDeleteOrder(true)}
          title="Delete this order"
          aria-label="Delete this order"
        >
          🗑️
        </button>
      </div>

      {/* Responsive layout: Tablet 2-column split / Mobile stacked */}
      <div className="order-split-layout">
        <div className="order-split-left">
          {/* Order Lines */}
          <div className="order-section">
            <div className="order-section-title">
              📋 Order Items ({groupedLines.length})
              {!isCleared && (
                <button
                  type="button"
                  className="action-btn outline"
                  style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: 13, minHeight: 38, width: 'auto' }}
                  onClick={() => setShowSelector(true)}
                >
                  + {orderLines.length > 0 ? 'Add-on' : 'Add Items'}
                </button>
              )}
            </div>

            {groupedLines.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <div className="empty-icon" style={{ fontSize: 36 }}>📋</div>
                <div className="empty-title" style={{ fontSize: 15 }}>No items yet</div>
                <div className="empty-sub">Tap "Add Items" above to record customer orders.</div>
              </div>
            ) : (
              <div className="order-line-list">
                {groupedLines.map(item => (
                  <div key={item.food_id} className="order-line">
                    <div className="order-line-name">{item.name}</div>
                    <span className="order-line-qty">{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="order-split-right">
          {/* Before Images */}
          <div className="order-section">
            <div className="order-section-title">
              📸 Before Images ({beforeImages.length})
              {beforeImages.length > 0 && (
                <button
                  type="button"
                  className="action-btn outline"
                  style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 13, minHeight: 36, width: 'auto' }}
                  onClick={() => setShowBeforeCamera(true)}
                  disabled={orderLines.length === 0}
                  title="Add another before photo"
                >
                  + Add Photo
                </button>
              )}
            </div>

            {/* 3rd Image UI Way: Dashed capture card with icon, text, and action button */}
            <div className={`before-capture-section ${hasUnphotographed ? 'has-unphotographed' : ''}`}>
              <div className="before-placeholder-icon">📸</div>
              <div className="before-placeholder-text">
                {orderLines.length === 0
                  ? 'Add items to order first to capture before photos'
                  : hasUnphotographed
                  ? `${unphotographedLines.length} unserved item(s) waiting for photo`
                  : beforeImages.length > 0
                  ? 'All items photographed · Capture additional before photo if needed'
                  : 'Capture when food is served to table'}
              </div>
              {orderLines.length === 0 ? (
                <button
                  type="button"
                  className="action-btn outline mt-12"
                  disabled
                >
                  📸 Add Items First
                </button>
              ) : hasUnphotographed ? (
                <button
                  type="button"
                  className="action-btn green mt-12"
                  onClick={() => setShowBeforeCamera(true)}
                >
                  📸 Mark Served ({unphotographedLines.length} new items)
                </button>
              ) : (
                <button
                  type="button"
                  className="action-btn outline mt-12"
                  onClick={() => setShowBeforeCamera(true)}
                >
                  📸 + Take Additional Before Photo
                </button>
              )}
            </div>

            {/* 2nd Image UI Way: Compact horizontal strip with ONLY images (smaller, no label, no time, no buttons) */}
            {beforeImages.length > 0 && (
              <div className="image-carousel-wrap">
                <div className="image-carousel-header">
                  <span>Captured Photos ({beforeImages.length})</span>
                  <span className="carousel-hint">Tap photo to view / manage</span>
                </div>
                <div className="image-carousel">
                  {beforeImages.map(bi => (
                    <div
                      key={bi.id}
                      className="image-thumb-card"
                      onClick={() => setSelectedBeforeImage(bi)}
                      title="Tap to preview, retake or delete"
                    >
                      <img src={bi.image_url} alt="Before meal" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* After Image */}
          <div className="order-section">
            <div className="order-section-title">🏁 After Image</div>

            {!hasAfter ? (
              <div className="after-section">
                <div className="after-placeholder-icon">📷</div>
                <div className="after-placeholder-text">
                  {isCleared ? 'No after image captured' : 'Capture when table is cleared'}
                </div>
                {!isCleared && orderLines.length > 0 && (
                  <button
                    type="button"
                    className="action-btn red mt-12"
                    onClick={() => setShowAfterCamera(true)}
                  >
                    🏁 Table Cleared — Capture After Photo
                  </button>
                )}
              </div>
            ) : (
              <div className="after-section has-image">
                <img
                  src={afterImage.image_url}
                  alt="After meal"
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
                <div className="image-card-info">
                  <span className="image-card-time">Cleared at {formatTime(afterImage.created_at)}</span>
                  <div className="image-card-actions">
                    <button
                      type="button"
                      className="img-action-btn retake"
                      onClick={() => setRetakingAfter(true)}
                    >
                      🔄 Retake
                    </button>
                    <button
                      type="button"
                      className="img-action-btn delete"
                      onClick={() => setConfirmDeleteAfter(true)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showSelector && (
        <OrderLineSelector
          foods={foods}
          batchType={batchType}
          onConfirm={handleAddLines}
          onClose={() => setShowSelector(false)}
        />
      )}

      {showBeforeCamera && (
        <CameraModal
          title={unphotographedLines.length > 0 ? "Before Photo — New Items" : "Additional Before Photo"}
          itemsPreview={
            unphotographedLines.length > 0
              ? unphotographedLines.map(l => `${getFoodName(l.food_id)} ×${l.quantity}`)
              : orderLines.map(l => `${getFoodName(l.food_id)} ×${l.quantity}`)
          }
          onCapture={handleBeforeCapture}
          onClose={() => setShowBeforeCamera(false)}
        />
      )}

      {retakingBeforeId && (
        <CameraModal
          title="Retake Before Photo"
          itemsPreview={(() => {
            const bi = beforeImages.find(b => b.id === retakingBeforeId)
            if (!bi) return []
            return (bi.order_line_ids || []).map(lid => {
              const line = orderLines.find(l => l.id === lid)
              return line ? `${getFoodName(line.food_id)} ×${line.quantity}` : '?'
            })
          })()}
          onCapture={handleRetakeBefore}
          onClose={() => setRetakingBeforeId(null)}
        />
      )}

      {showAfterCamera && (
        <CameraModal
          title="After Photo — Table Cleared"
          onCapture={handleAfterCapture}
          onClose={() => setShowAfterCamera(false)}
        />
      )}

      {retakingAfter && (
        <CameraModal
          title="Retake After Photo"
          onCapture={handleRetakeAfter}
          onClose={() => setRetakingAfter(false)}
        />
      )}

      {/* Delete Order Modal */}
      <ConfirmModal
        isOpen={confirmDeleteOrder}
        title={`Delete ${tableNumber}`}
        message="Are you sure you want to delete this table order and all its photos? This action cannot be undone."
        confirmText={deletingOrder ? 'Deleting…' : 'Delete Order'}
        onConfirm={executeDeleteOrder}
        onCancel={() => setConfirmDeleteOrder(false)}
      />

      {/* Delete Before Image Modal */}
      <ConfirmModal
        isOpen={!!deletingBeforeItem}
        title="Delete Before Image"
        message="Are you sure you want to delete this before-meal photo? You can take a new photo afterwards."
        confirmText="Delete Photo"
        onConfirm={executeDeleteBefore}
        onCancel={() => setDeletingBeforeItem(null)}
      />

      {/* Delete After Image Modal */}
      <ConfirmModal
        isOpen={confirmDeleteAfter}
        title="Delete After Image"
        message="Are you sure you want to delete the after-meal photo? This will reopen the session as Active."
        confirmText="Delete Photo"
        onConfirm={executeDeleteAfter}
        onCancel={() => setConfirmDeleteAfter(false)}
      />

      {/* Before Image Preview Modal (opened on tap) */}
      {selectedBeforeImage && (
        <div className="modal-overlay" onClick={() => setSelectedBeforeImage(null)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Before Photo</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedBeforeImage(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', margin: '14px 0', background: '#000' }}>
              <img
                src={selectedBeforeImage.image_url}
                alt="Before meal"
                style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Captured at {formatTime(selectedBeforeImage.created_at)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="action-btn outline"
                style={{ flex: 1 }}
                onClick={() => {
                  setRetakingBeforeId(selectedBeforeImage.id)
                  setSelectedBeforeImage(null)
                }}
              >
                🔄 Retake
              </button>
              <button
                type="button"
                className="action-btn red"
                style={{ flex: 1 }}
                onClick={() => {
                  setDeletingBeforeItem(selectedBeforeImage)
                  setSelectedBeforeImage(null)
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

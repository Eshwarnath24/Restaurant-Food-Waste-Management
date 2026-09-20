import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import CameraModal from './CameraModal'
import ConfirmModal from './ConfirmModal'

export default function FoodDetail({ food, onBack, showToast, onThumbnailChange }) {
  const [images, setImages] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [retakingId, setRetakingId] = useState(null)
  const [deletingImageItem, setDeletingImageItem] = useState(null)

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from('food_reference_images')
      .select('*')
      .eq('food_id', food.id)
      .order('created_at', { ascending: false })
    if (data) setImages(data)
  }, [food.id])

  useEffect(() => { loadImages() }, [loadImages])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`food-ref-${food.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'food_reference_images',
        filter: `food_id=eq.${food.id}`,
      }, () => loadImages())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [food.id, loadImages])

  function formatTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Upload helpers ─────────────────────────────────────────
  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }

  async function uploadToStorage(path, dataUrl) {
    const blob = dataUrlToBlob(dataUrl)
    const { error } = await supabase.storage
      .from('session-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error('Upload failed: ' + error.message)
    const { data: { publicUrl } } = supabase.storage
      .from('session-images')
      .getPublicUrl(path)
    return publicUrl
  }

  // ── Add new photo ──────────────────────────────────────────
  async function handleCapture(dataUrl) {
    const path = `foods/${food.id}/ref_${Date.now()}.jpg`
    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      const { data, error } = await supabase
        .from('food_reference_images')
        .insert({
          food_id: food.id,
          image_url: publicUrl,
          storage_path: path,
        })
        .select()
        .single()
      if (error) throw error
      // Optimistic: prepend to local state
      setImages(prev => [data, ...prev])
      if (onThumbnailChange) onThumbnailChange(food.id, publicUrl)
      showToast('📸 Reference image saved')
      setShowCamera(false)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Retake (replace in place) ──────────────────────────────
  async function handleRetake(dataUrl) {
    const existing = images.find(img => img.id === retakingId)
    if (!existing) return
    const path = `foods/${food.id}/ref_${Date.now()}.jpg`
    try {
      const publicUrl = await uploadToStorage(path, dataUrl)
      // Delete old file from storage
      await supabase.storage.from('session-images').remove([existing.storage_path])
      // Update DB row
      const { error } = await supabase
        .from('food_reference_images')
        .update({ image_url: publicUrl, storage_path: path })
        .eq('id', existing.id)
      if (error) throw error
      // Optimistic update
      setImages(prev => prev.map(img =>
        img.id === existing.id
          ? { ...img, image_url: publicUrl, storage_path: path }
          : img
      ))
      if (onThumbnailChange) onThumbnailChange(food.id, publicUrl)
      showToast('🔄 Image retaken')
      setRetakingId(null)
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  // ── Delete image ───────────────────────────────────────────
  async function executeDeleteImage() {
    if (!deletingImageItem) return
    const img = deletingImageItem
    setDeletingImageItem(null)
    try {
      await supabase.storage.from('session-images').remove([img.storage_path])
      const { error } = await supabase
        .from('food_reference_images')
        .delete()
        .eq('id', img.id)
      if (error) throw error
      // Optimistic remove
      const updated = images.filter(i => i.id !== img.id)
      setImages(updated)
      // Update thumbnail: next most recent or null
      if (onThumbnailChange) {
        onThumbnailChange(food.id, updated.length > 0 ? updated[0].image_url : null)
      }
      showToast('🗑️ Image deleted')
    } catch (err) {
      showToast('❌ ' + err.message)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="food-detail-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div className="page-title">{food.name}</div>
          <div className="page-subtitle">{food.id} · Reference Images</div>
        </div>
      </div>

      {/* Add Photo Button */}
      <div className="food-detail-add-btn">
        <button className="action-btn primary" onClick={() => setShowCamera(true)}>
          📸 Add Reference Photo
        </button>
      </div>

      {/* Image count */}
      <div className="food-detail-count">{images.length} image{images.length !== 1 ? 's' : ''}</div>

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <div className="empty-title">No reference images</div>
          <div className="empty-sub">Tap "Add Reference Photo" to capture images of {food.name}.</div>
        </div>
      ) : (
        <div className="food-detail-grid">
          {images.map(img => (
            <div key={img.id} className="food-detail-image-card">
              <img src={img.image_url} alt={food.name} />
              <div className="image-card-info">
                <span className="image-card-time">{formatTime(img.created_at)}</span>
                <div className="image-card-actions">
                  <button
                    type="button"
                    className="img-action-btn retake"
                    onClick={() => setRetakingId(img.id)}
                    title="Retake photo"
                    aria-label="Retake photo"
                  >
                    🔄 Retake
                  </button>
                  <button
                    type="button"
                    className="img-action-btn delete"
                    onClick={() => setDeletingImageItem(img)}
                    title="Delete photo"
                    aria-label="Delete photo"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Camera modals */}
      {showCamera && (
        <CameraModal
          title={`Reference Photo — ${food.name}`}
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {retakingId && (
        <CameraModal
          title={`Retake — ${food.name}`}
          onCapture={handleRetake}
          onClose={() => setRetakingId(null)}
        />
      )}

      {/* Confirm image deletion modal */}
      <ConfirmModal
        isOpen={!!deletingImageItem}
        title="Delete Reference Image"
        message="Are you sure you want to permanently delete this reference image? This cannot be undone."
        confirmText="Delete Image"
        isDanger={true}
        onConfirm={executeDeleteImage}
        onCancel={() => setDeletingImageItem(null)}
      />
    </div>
  )
}

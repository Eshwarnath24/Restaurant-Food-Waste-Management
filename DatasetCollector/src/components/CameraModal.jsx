import { useEffect, useRef, useState } from 'react'

export default function CameraModal({ title, itemsPreview, onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    startCamera(facingMode)
    return () => stopCamera()
  }, [facingMode])

  async function startCamera(mode = 'environment') {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setHasCamera(true)
    } catch {
      setHasCamera(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function toggleCamera() {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
  }

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) {
      fileRef.current?.click()
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
    stopCamera()
    setUploading(true)
    try {
      await onCapture(dataUrl)
    } finally {
      setUploading(false)
    }
  }

  function compressImage(file, maxPx = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = (ev) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Failed to decode image'))
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          c.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(c.toDataURL('image/jpeg', quality))
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    stopCamera()
    setUploading(true)
    try {
      const dataUrl = await compressImage(file)
      await onCapture(dataUrl)
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Please try again.'))
    } finally {
      setUploading(false)
      try { e.target.value = '' } catch (_) {}
    }
  }

  return (
    <div className="camera-overlay">
      <div className="camera-top">
        <span className="camera-title">{title}</span>
        <button
          type="button"
          className="camera-close"
          onClick={() => { stopCamera(); onClose() }}
          aria-label="Close camera"
        >
          ✕
        </button>
      </div>

      <div className="camera-view">
        {hasCamera ? (
          <video ref={videoRef} autoPlay playsInline muted />
        ) : (
          <div className="camera-no-cam">
            <div className="camera-no-cam-icon">📷</div>
            <div className="camera-no-cam-text">Camera not available</div>
            <div className="camera-no-cam-sub">Tap Gallery below to pick photo from your device</div>
          </div>
        )}
        {itemsPreview && itemsPreview.length > 0 && (
          <div className="camera-items-preview">
            <div className="camera-items-label">Capturing for:</div>
            {itemsPreview.join(', ')}
          </div>
        )}
      </div>

      <div className="camera-bottom">
        <button
          type="button"
          className="camera-tool-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Choose from gallery"
          aria-label="Choose from gallery"
        >
          <span className="camera-tool-icon">🖼️</span>
          <span>Gallery</span>
        </button>

        <button
          type="button"
          className="shutter-btn"
          onClick={capture}
          disabled={uploading}
          aria-label="Take photo"
        >
          {uploading
            ? <div className="spinner" />
            : <div className="shutter-inner" />
          }
        </button>

        {hasCamera ? (
          <button
            type="button"
            className="camera-tool-btn"
            onClick={toggleCamera}
            disabled={uploading}
            title="Switch camera front/back"
            aria-label="Switch camera"
          >
            <span className="camera-tool-icon">🔄</span>
            <span>Flip</span>
          </button>
        ) : (
          <div style={{ width: 54 }} />
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

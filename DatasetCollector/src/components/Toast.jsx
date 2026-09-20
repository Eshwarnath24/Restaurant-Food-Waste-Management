import { useState, useCallback } from 'react'

export default function Toast({ message, visible }) {
  return (
    <div className="toast-container">
      <div className={`toast ${visible ? 'show' : ''}`}>{message}</div>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2800)
  }, [])

  return { toast, toastVisible, showToast }
}

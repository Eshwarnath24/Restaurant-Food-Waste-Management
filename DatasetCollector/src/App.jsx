import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import Toast, { useToast } from './components/Toast'
import MenuGrid from './components/MenuGrid'
import SessionList from './components/SessionList'
import OrderPage from './components/OrderPage'
import FoodDetail from './components/FoodDetail'

export default function App() {
  const [page, setPage] = useState('menu') // 'menu' | 'sessions' | 'order' | 'foodDetail'
  const [sessionId, setSessionId] = useState(null)
  const [tableNumber, setTableNumber] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)
  const [foods, setFoods] = useState([])
  const [sessions, setSessions] = useState([])
  const [foodThumbnails, setFoodThumbnails] = useState({})
  const { toast, toastVisible, showToast } = useToast()

  // ── Load foods ────────────────────────────────────────────
  const loadFoods = useCallback(async () => {
    const { data } = await supabase
      .from('foods')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setFoods(data)
  }, [])

  // ── Load sessions ─────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('table_sessions')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSessions(data)
  }, [])

  // ── Load food thumbnails ──────────────────────────────────
  const loadThumbnails = useCallback(async () => {
    // Get the most recent reference image per food
    const { data } = await supabase
      .from('food_reference_images')
      .select('food_id, image_url')
      .order('created_at', { ascending: false })
    if (data) {
      const map = {}
      // data is ordered newest first — first occurrence per food_id is the latest
      data.forEach(row => {
        if (!map[row.food_id]) {
          map[row.food_id] = row.image_url
        }
      })
      setFoodThumbnails(map)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFoods()
    loadSessions()
    loadThumbnails()
  }, [loadFoods, loadSessions, loadThumbnails])

  // Realtime subscriptions for foods, sessions, and reference images
  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'foods' }, () => loadFoods())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadSessions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_reference_images' }, () => loadThumbnails())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadFoods, loadSessions, loadThumbnails])

  // ── Browser history integration (mobile back button) ─────
  useEffect(() => {
    function handlePopState(e) {
      const state = e.state
      if (state && state.page) {
        setPage(state.page)
        if (state.page === 'order' && state.sessionId) {
          setSessionId(state.sessionId)
          setTableNumber(state.tableNumber || '')
        } else if (state.page === 'foodDetail' && state.foodId) {
          const found = foods.find(f => f.id === state.foodId)
          if (found) {
            setSelectedFood(found)
          } else {
            setPage('menu')
            setSelectedFood(null)
          }
        } else {
          setSessionId(null)
          setTableNumber('')
          setSelectedFood(null)
          if (state.page === 'sessions') loadSessions()
          if (state.page === 'menu') loadThumbnails()
        }
      } else {
        // No state — go to menu
        setPage('menu')
        setSessionId(null)
        setTableNumber('')
        setSelectedFood(null)
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Replace initial state
    if (!window.history.state?.page) {
      window.history.replaceState({ page: 'menu' }, '')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [foods, loadSessions, loadThumbnails])

  // ── Navigation ────────────────────────────────────────────
  function openSession(id, tableNum) {
    setSessionId(id)
    setTableNumber(tableNum)
    setPage('order')
    window.history.pushState({ page: 'order', sessionId: id, tableNumber: tableNum }, '')
  }

  function goBackFromOrder() {
    setPage('sessions')
    setSessionId(null)
    setTableNumber('')
    loadSessions()
    window.history.back()
  }

  function openFoodDetail(food) {
    setSelectedFood(food)
    setPage('foodDetail')
    window.history.pushState({ page: 'foodDetail', foodId: food.id }, '')
  }

  function goBackFromFoodDetail() {
    setSelectedFood(null)
    setPage('menu')
    loadThumbnails()
    window.history.back()
  }

  // ── Session callbacks (immediate local state) ─────────────
  function handleDeleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function handleRenameSession(id, newName) {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, table_number: newName } : s
    ))
  }

  // ── Thumbnail callback (from FoodDetail) ──────────────────
  function handleThumbnailChange(foodId, imageUrl) {
    setFoodThumbnails(prev => {
      const next = { ...prev }
      if (imageUrl) {
        next[foodId] = imageUrl
      } else {
        delete next[foodId]
      }
      return next
    })
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Top header — only on main pages */}
      {(page === 'menu' || page === 'sessions') && (
        <div className="top-header">
          <div className="top-header-row">
            <div className="logo">Eco<span>Plate</span> 🌱</div>
            <div className="header-badge">Dataset Station</div>
          </div>
          <div className="header-subtitle">Restaurant Food Waste Data Collector</div>
        </div>
      )}

      {/* Page content */}
      {page === 'menu' && (
        <MenuGrid
          foods={foods}
          foodThumbnails={foodThumbnails}
          onSelectFood={openFoodDetail}
          showToast={showToast}
        />
      )}

      {page === 'sessions' && (
        <SessionList
          sessions={sessions}
          onOpenSession={openSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          showToast={showToast}
        />
      )}

      {page === 'order' && sessionId && (
        <OrderPage
          sessionId={sessionId}
          tableNumber={tableNumber}
          foods={foods}
          onBack={goBackFromOrder}
          showToast={showToast}
        />
      )}

      {page === 'foodDetail' && selectedFood && (
        <FoodDetail
          food={selectedFood}
          onBack={goBackFromFoodDetail}
          showToast={showToast}
          onThumbnailChange={handleThumbnailChange}
        />
      )}

      {/* Bottom tab bar — hidden on order/detail pages */}
      {(page === 'menu' || page === 'sessions') && (
        <div className="bottom-tabs">
          <button
            type="button"
            className={`tab-btn ${page === 'menu' ? 'active' : ''}`}
            onClick={() => { setPage('menu'); window.history.replaceState({ page: 'menu' }, '') }}
            aria-label="Menu tab"
          >
            <span className="tab-icon">🍽️</span>
            <span>Menu ({foods.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${page === 'sessions' ? 'active' : ''}`}
            onClick={() => { setPage('sessions'); window.history.replaceState({ page: 'sessions' }, '') }}
            aria-label="Orders tab"
          >
            <span className="tab-icon">📋</span>
            <span>Orders ({sessions.filter(s => s.status === 'active').length})</span>
          </button>
        </div>
      )}

      <Toast message={toast} visible={toastVisible} />
    </div>
  )
}

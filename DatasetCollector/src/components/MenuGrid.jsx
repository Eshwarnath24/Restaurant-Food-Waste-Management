import { useState } from 'react'
import { supabase } from '../supabase'
import FoodCard from './FoodCard'
import AddFoodModal from './AddFoodModal'
import ConfirmModal from './ConfirmModal'

export default function MenuGrid({ foods, foodThumbnails, onSelectFood, showToast }) {
  const [showAdd, setShowAdd] = useState(false)

  async function addFood(id, name) {
    const { error } = await supabase.from('foods').insert({ id, name })
    if (error) {
      showToast('❌ ' + (error.message.includes('duplicate') ? 'Food already exists' : error.message))
      throw error
    }
    showToast('✅ Added ' + name)
  }

  const [deletingFood, setDeletingFood] = useState(null)

  function promptDeleteFood(food) {
    setDeletingFood(food)
  }

  async function executeDeleteFood() {
    if (!deletingFood) return
    const food = deletingFood
    setDeletingFood(null)

    // Clean up reference images from storage before cascade delete
    const { data: refImages } = await supabase
      .from('food_reference_images')
      .select('storage_path')
      .eq('food_id', food.id)
    if (refImages && refImages.length > 0) {
      const paths = refImages.map(r => r.storage_path)
      await supabase.storage.from('session-images').remove(paths)
    }

    const { error } = await supabase.from('foods').delete().eq('id', food.id)
    if (error) {
      // FK constraint: food is used in order_lines (ON DELETE RESTRICT)
      if (error.message.includes('violates foreign key') || error.message.includes('referenced from')) {
        showToast('❌ Can\'t delete — this food has order history')
      } else {
        showToast('❌ ' + error.message)
      }
      return
    }
    showToast('🗑️ Removed ' + food.name)
  }

  const [search, setSearch] = useState('')

  const filteredFoods = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase().trim()) ||
    f.id.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <>
      <div className="section-label">Menu Items ({filteredFoods.length}{search ? ` of ${foods.length}` : ''})</div>

      {foods.length > 0 && (
        <div className="search-container">
          <div className="search-input-wrap">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search dishes by name or ID…"
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

      {foods.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <div className="empty-title">No menu items yet</div>
          <div className="empty-sub">Tap the + button to add food items that your restaurant serves.</div>
        </div>
      ) : filteredFoods.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No dishes found</div>
          <div className="empty-sub">No dishes match "{search}". Try another search term.</div>
        </div>
      ) : (
        <div className="food-grid">
          {filteredFoods.map(f => (
            <FoodCard
              key={f.id}
              food={f}
              thumbnailUrl={foodThumbnails && foodThumbnails[f.id]}
              onSelect={onSelectFood}
              onDelete={promptDeleteFood}
            />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowAdd(true)} title="Add food item">+</button>

      {showAdd && (
        <AddFoodModal
          existingIds={foods.map(f => f.id)}
          onConfirm={addFood}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Delete Food Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingFood}
        title="Delete Menu Item"
        message={`Are you sure you want to remove "${deletingFood?.name}" from the menu? Its reference photos will also be deleted.`}
        confirmText="Remove Food"
        onConfirm={executeDeleteFood}
        onCancel={() => setDeletingFood(null)}
      />
    </>
  )
}

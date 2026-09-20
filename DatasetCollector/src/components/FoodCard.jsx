export default function FoodCard({ food, thumbnailUrl, onSelect, onDelete }) {
  return (
    <div className="glass-card food-card" onClick={() => onSelect && onSelect(food)}>
      <div className="food-card-name">{food.name}</div>
      {thumbnailUrl ? (
        <img className="food-card-thumb" src={thumbnailUrl} alt={food.name} />
      ) : (
        <div className="food-card-placeholder">🍽️</div>
      )}
      <div className="food-card-id">{food.id}</div>
      {onDelete && (
        <button
          type="button"
          className="food-card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(food) }}
          title={`Delete ${food.name}`}
          aria-label={`Delete ${food.name}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

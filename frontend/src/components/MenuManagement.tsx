import React, { useState } from "react";
import { type MenuItem, type ItemAvailability, type MealTiming, DISH_WASTE } from "../data";

interface MenuManagementProps {
  menu: MenuItem[];
  onAddItem: (item: Omit<MenuItem, "id">) => void;
  onUpdateItem: (id: string, updates: Partial<MenuItem>) => void;
  onDeleteItem: (id: string) => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES = ["All", "Starters", "Main Course", "Drinks", "Desserts"] as const;

// Helper to calculate or lookup today's waste % for any item
function getItemWastePct(item: MenuItem): number {
  const match = DISH_WASTE.find((d) => d.name.toLowerCase() === item.name.toLowerCase());
  if (match) return match.avgWaste;

  const defaultWasteMap: Record<string, number> = {
    "Butter Naan": 6,
    "Garlic Naan": 5,
    "Veg Spring Rolls": 12,
    "Samosa (2 pcs)": 8,
    "Coke": 2,
    "Fresh Lime Soda": 4,
    "Mango Lassi": 5,
    "Mineral Water": 1,
    "Gulab Jamun": 5,
    "Kulfi": 4,
    "Rasmalai": 14,
    "Masala Dosa": 7,
    "Mysore Masala Dosa": 9,
    "Madras Filter Coffee": 3,
    "Tandoori Chicken (Half)": 16,
    "Butter Chicken": 14,
    "Gajar Ka Halwa": 6,
  };

  if (defaultWasteMap[item.name]) return defaultWasteMap[item.name];

  const sum = item.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 5 + (sum % 13);
}

export function MenuManagement({
  menu,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onShowToast,
}: MenuManagementProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selection states for bulk transfer
  const [selectedLeft, setSelectedLeft] = useState<string[]>([]);
  const [selectedRight, setSelectedRight] = useState<string[]>([]);

  // Drag and Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<"left" | "right" | null>(null);

  // Simple Add Item Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Starters" | "Main Course" | "Drinks" | "Desserts">("Main Course");
  const [price, setPrice] = useState<number>(180);
  const [servedGrams, setServedGrams] = useState<number>(350);
  const [emoji, setEmoji] = useState("🍛");
  const [timing, setTiming] = useState<MealTiming>("all_day");
  const [targetColumn, setTargetColumn] = useState<"left" | "right">("left");

  // Filter items
  const filtered = menu.filter((item) => {
    const matchCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const activeItems = filtered.filter((item) => item.availability !== "sold_out");
  const inactiveItems = filtered.filter((item) => item.availability === "sold_out");

  // Move single item
  const moveToActive = (item: MenuItem) => {
    onUpdateItem(item.id, { availability: "available" });
    onShowToast(`Added "${item.name}" to the Active Menu!`);
    setSelectedRight((prev) => prev.filter((id) => id !== item.id));
  };

  const moveToInactive = (item: MenuItem) => {
    onUpdateItem(item.id, { availability: "sold_out" });
    onShowToast(`Moved "${item.name}" to Off-Menu / Out of Stock.`);
    setSelectedLeft((prev) => prev.filter((id) => id !== item.id));
  };

  // Bulk transfers
  const handleBulkMoveToActive = () => {
    selectedRight.forEach((id) => {
      onUpdateItem(id, { availability: "available" });
    });
    onShowToast(`Added ${selectedRight.length} dishes to the Active Menu!`);
    setSelectedRight([]);
  };

  const handleBulkMoveToInactive = () => {
    selectedLeft.forEach((id) => {
      onUpdateItem(id, { availability: "sold_out" });
    });
    onShowToast(`Moved ${selectedLeft.length} dishes to Off-Menu.`);
    setSelectedLeft([]);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: "left" | "right") => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: "left" | "right") => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const item = menu.find((m) => m.id === id);
    if (!item) return;

    if (targetCol === "left" && item.availability === "sold_out") {
      moveToActive(item);
    } else if (targetCol === "right" && item.availability !== "sold_out") {
      moveToInactive(item);
    }

    setDraggedId(null);
  };

  // Timing slot toggle
  const handleToggleTiming = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTiming: MealTiming =
      item.timing === "evening_only"
        ? "morning_only"
        : item.timing === "morning_only"
        ? "all_day"
        : "evening_only";

    onUpdateItem(item.id, { timing: nextTiming });
    const label =
      nextTiming === "evening_only"
        ? "Evening Only (Dinner)"
        : nextTiming === "morning_only"
        ? "Morning Only (Breakfast/Lunch)"
        : "All Day Availability";
    onShowToast(`Set "${item.name}" to ${label}.`);
  };

  const handleDeleteItem = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Permanently remove "${item.name}" from Chennai Spices system?`)) {
      onDeleteItem(item.id);
      onShowToast(`Removed "${item.name}".`);
      setSelectedLeft((prev) => prev.filter((id) => id !== item.id));
      setSelectedRight((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleSaveNewItem = () => {
    if (!name.trim()) {
      onShowToast("Please enter a food name.");
      return;
    }

    onAddItem({
      name: name.trim(),
      category,
      price: Number(price) || 50,
      servedGrams: Number(servedGrams) || 250,
      emoji: emoji || "🍽️",
      description: `Freshly prepared ${name.trim()} at Chennai Spices.`,
      availability: targetColumn === "left" ? "available" : "sold_out",
      timing,
    });

    onShowToast(`Added "${name.trim()}" to ${targetColumn === "left" ? "Active Menu" : "Off-Menu"}!`);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#1e4d35]/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-lg font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
              Interactive Menu Builder
            </h2>
          </div>
          <p className="text-xs text-[#6b6459] mt-0.5">
            <strong>Drag & drop</strong> or <strong>click arrows</strong> to move dishes into the Active Menu or Off-Menu. Today's waste % is displayed beside each dish.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setCategory("Main Course");
            setPrice(180);
            setServedGrams(350);
            setEmoji("🍛");
            setTiming("all_day");
            setTargetColumn("left");
            setIsAddModalOpen(true);
          }}
          className="bg-[#1e4d35] hover:bg-[#2d6b4a] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
        >
          <span>➕</span> Add New Item
        </button>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#1e4d35]/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#1e4d35] text-white"
                  : "bg-[#f8f4ee] text-[#6b6459] hover:bg-[#f0e9de]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-2 text-xs text-[#9b9088]">🔍</span>
          <input
            type="text"
            placeholder="Search dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8f4ee] border border-[#1e4d35]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30 text-[#1a1a18]"
          />
        </div>
      </div>

      {/* ── 2x2 / Split-Board Interactive Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT COLUMN: ACTIVE MENU ITEMS */}
        <div
          onDragOver={(e) => handleDragOver(e, "left")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "left")}
          className={`bg-white rounded-2xl p-4 border transition-all flex flex-col min-h-[500px] ${
            dragOverCol === "left"
              ? "border-[#1e4d35] ring-2 ring-[#1e4d35]/20 bg-emerald-50/20"
              : "border-[#1e4d35]/15"
          }`}
        >
          {/* Left Column Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1e4d35]/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                  🟢 Active Menu Items
                </h3>
                <p className="text-[11px] text-[#6b6459]">Live for waiters to take orders</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {activeItems.length} Dishes
              </span>

              {selectedLeft.length > 0 && (
                <button
                  onClick={handleBulkMoveToInactive}
                  className="text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer border border-red-200"
                >
                  Move {selectedLeft.length} Off-Menu ➡️
                </button>
              )}
            </div>
          </div>

          {/* Left Drop Helper indicator */}
          {dragOverCol === "left" && (
            <div className="mb-3 py-3 border-2 border-dashed border-emerald-500 rounded-xl bg-emerald-50 text-center text-xs font-bold text-emerald-800 animate-pulse">
              📥 Drop here to ADD dish to Active Menu!
            </div>
          )}

          {/* Active Items List */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 max-h-[620px]">
            {activeItems.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-[#1e4d35]/15 rounded-2xl p-4">
                <span className="text-3xl mb-1 block">🍽️</span>
                <p className="text-sm font-bold text-[#1a1a18]">Active Menu is empty</p>
                <p className="text-xs text-[#9b9088] mt-1">
                  Drag dishes from the right side or click <strong>"⬅️ Add to Menu"</strong> to make them live.
                </p>
              </div>
            ) : (
              activeItems.map((item) => {
                const waste = getItemWastePct(item);
                const isSelected = selectedLeft.includes(item.id);

                const wasteStyle =
                  waste <= 8
                    ? { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" }
                    : waste <= 15
                    ? { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" }
                    : { bg: "bg-red-50", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" };

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-[#1e4d35]/8 border-[#1e4d35]"
                        : "bg-[#fcfaf7] border-[#1e4d35]/10 hover:border-[#1e4d35]/30 hover:shadow-xs"
                    }`}
                  >
                    {/* Left: Drag Handle, Checkbox, Emoji, Name, Price */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[#9b9088] hover:text-[#1a1a18] cursor-grab text-xs select-none">
                        ⋮⋮
                      </span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedLeft((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                          );
                        }}
                        className="rounded text-[#1e4d35] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-[#1a1a18] truncate">{item.name}</p>
                          {item.timing === "evening_only" && (
                            <button
                              onClick={(e) => handleToggleTiming(item, e)}
                              className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-100 hover:bg-indigo-100"
                              title="Click to cycle timing slot"
                            >
                              🌙 Evening
                            </button>
                          )}
                          {item.timing === "morning_only" && (
                            <button
                              onClick={(e) => handleToggleTiming(item, e)}
                              className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.2 rounded border border-amber-100 hover:bg-amber-100"
                              title="Click to cycle timing slot"
                            >
                              ☀️ Morning
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9b9088]">
                          <strong className="text-[#1e4d35]">₹{item.price}</strong> · {item.category} · {item.servedGrams}g
                        </p>
                      </div>
                    </div>

                    {/* Right: Today's Waste % & Move to Off-Menu Action */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Today's Waste % Badge */}
                      <div
                        title={`Today's plate waste recorded for ${item.name}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${wasteStyle.bg} ${wasteStyle.text} ${wasteStyle.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${wasteStyle.dot}`} />
                        <span>{waste}% Waste</span>
                      </div>

                      {/* Move to Off-Menu Button */}
                      <button
                        onClick={() => moveToInactive(item)}
                        title="Move to Off-Menu (Completed / Sold Out)"
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-red-100 flex items-center gap-1"
                      >
                        <span>Off-Menu</span>
                        <span>➡️</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteItem(item, e)}
                        title="Delete dish"
                        className="text-[#9b9088] hover:text-red-600 p-1 transition-colors cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: OFF-MENU / COMPLETED DISHES */}
        <div
          onDragOver={(e) => handleDragOver(e, "right")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "right")}
          className={`bg-white rounded-2xl p-4 border transition-all flex flex-col min-h-[500px] ${
            dragOverCol === "right"
              ? "border-red-400 ring-2 ring-red-400/20 bg-red-50/20"
              : "border-[#1e4d35]/15"
          }`}
        >
          {/* Right Column Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1e4d35]/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <div>
                <h3 className="text-sm font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                  🔴 Off-Menu / Out of Stock
                </h3>
                <p className="text-[11px] text-[#6b6459]">Completed food, evening specials, or archived</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-100">
                {inactiveItems.length} Dishes
              </span>

              {selectedRight.length > 0 && (
                <button
                  onClick={handleBulkMoveToActive}
                  className="text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer border border-emerald-200"
                >
                  ⬅️ Add {selectedRight.length} to Menu
                </button>
              )}
            </div>
          </div>

          {/* Right Drop Helper indicator */}
          {dragOverCol === "right" && (
            <div className="mb-3 py-3 border-2 border-dashed border-red-400 rounded-xl bg-red-50 text-center text-xs font-bold text-red-800 animate-pulse">
              📤 Drop here to REMOVE dish from Active Menu!
            </div>
          )}

          {/* Inactive Items List */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 max-h-[620px]">
            {inactiveItems.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-[#1e4d35]/15 rounded-2xl p-4">
                <span className="text-3xl mb-1 block">✨</span>
                <p className="text-sm font-bold text-[#1a1a18]">No off-menu items</p>
                <p className="text-xs text-[#9b9088] mt-1">
                  When food runs out or is completed for the day, drag it here from the left.
                </p>
              </div>
            ) : (
              inactiveItems.map((item) => {
                const waste = getItemWastePct(item);
                const isSelected = selectedRight.includes(item.id);

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5 bg-red-50/15 border-red-100 opacity-80 hover:opacity-100 hover:border-red-200 ${
                      isSelected ? "ring-2 ring-red-300" : ""
                    }`}
                  >
                    {/* Left: Drag Grip, Checkbox, Emoji, Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[#9b9088] hover:text-[#1a1a18] cursor-grab text-xs select-none">
                        ⋮⋮
                      </span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedRight((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                          );
                        }}
                        className="rounded text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-2xl flex-shrink-0 grayscale-30">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1a1a18] truncate line-through opacity-75">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#9b9088]">
                          ₹{item.price} · {item.category}
                        </p>
                      </div>
                    </div>

                    {/* Right: Waste % & Add to Active Menu Action */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Waste % */}
                      <span className="text-[10px] bg-white text-[#6b6459] border border-[#1e4d35]/15 px-2 py-1 rounded-lg font-medium">
                        {waste}% Waste
                      </span>

                      {/* Add to Menu Button */}
                      <button
                        onClick={() => moveToActive(item)}
                        title="Add to Active Menu"
                        className="bg-[#1e4d35] hover:bg-[#2d6b4a] text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>⬅️</span>
                        <span>Add to Menu</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteItem(item, e)}
                        title="Delete dish"
                        className="text-[#9b9088] hover:text-red-600 p-1 transition-colors cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add New Dish Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#1e4d35]/15">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e4d35]/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                  Add Dish to Chennai Spices
                </h3>
                <p className="text-xs text-[#9b9088]">
                  Select whether this dish should go to Active Menu or Off-Menu.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#f0e9de] text-[#1e4d35] flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Name & Emoji */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="font-bold text-[#6b6459] block mb-1">Food Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Masala Dosa"
                    className="w-full px-3 py-2 text-sm bg-[#f8f4ee] border border-[#1e4d35]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30 text-[#1a1a18]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#6b6459] block mb-1">Emoji</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-full px-2 py-2 text-center text-base bg-[#f8f4ee] border border-[#1e4d35]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30"
                  />
                </div>
              </div>

              {/* Category, Price, Portion */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-[#6b6459] block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-[#f8f4ee] border border-[#1e4d35]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30 text-[#1a1a18]"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#6b6459] block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min={10}
                    className="w-full px-2.5 py-2 text-xs bg-[#f8f4ee] border border-[#1e4d35]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30 text-[#1a1a18]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#6b6459] block mb-1">Portion (g)</label>
                  <input
                    type="number"
                    value={servedGrams}
                    onChange={(e) => setServedGrams(Number(e.target.value))}
                    min={20}
                    className="w-full px-2.5 py-2 text-xs bg-[#f8f4ee] border border-[#1e4d35]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30 text-[#1a1a18]"
                  />
                </div>
              </div>

              {/* Destination Column */}
              <div>
                <label className="font-bold text-[#6b6459] block mb-1">Which side to add?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetColumn("left")}
                    className={`py-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer border ${
                      targetColumn === "left"
                        ? "bg-[#1e4d35] text-white border-[#1e4d35]"
                        : "bg-[#f8f4ee] text-[#6b6459] border-[#1e4d35]/15"
                    }`}
                  >
                    🟢 Add to Active Menu (Left)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetColumn("right")}
                    className={`py-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer border ${
                      targetColumn === "right"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-[#f8f4ee] text-[#6b6459] border-[#1e4d35]/15"
                    }`}
                  >
                    🔴 Add to Off-Menu (Right)
                  </button>
                </div>
              </div>

              {/* Timing Slot */}
              <div>
                <label className="font-bold text-[#6b6459] block mb-1">Serving Slot</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTiming("all_day")}
                    className={`py-2 px-1 rounded-xl text-center font-semibold text-xs transition-all cursor-pointer border ${
                      timing === "all_day"
                        ? "bg-[#1e4d35] text-white border-[#1e4d35]"
                        : "bg-[#f8f4ee] text-[#6b6459] border-[#1e4d35]/15"
                    }`}
                  >
                    ☀️🌙 All Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setTiming("evening_only")}
                    className={`py-2 px-1 rounded-xl text-center font-semibold text-xs transition-all cursor-pointer border ${
                      timing === "evening_only"
                        ? "bg-indigo-700 text-white border-indigo-700"
                        : "bg-[#f8f4ee] text-[#6b6459] border-[#1e4d35]/15"
                    }`}
                  >
                    🌙 Evening Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setTiming("morning_only")}
                    className={`py-2 px-1 rounded-xl text-center font-semibold text-xs transition-all cursor-pointer border ${
                      timing === "morning_only"
                        ? "bg-amber-700 text-white border-amber-700"
                        : "bg-[#f8f4ee] text-[#6b6459] border-[#1e4d35]/15"
                    }`}
                  >
                    ☀️ Morning Only
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-3 border-t border-[#1e4d35]/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#1e4d35]/20 text-[#6b6459] font-bold hover:bg-[#f8f4ee] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewItem}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e4d35] hover:bg-[#2d6b4a] text-white font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Dish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import {
  MENU, INITIAL_TABLES, OWNER_STATS, DISH_WASTE, INITIAL_ORDERS,
  getMenuItem, calcSubtotal, calcDiscount, simulateWasteAnalysis,
  type Table, type TableStatus, type MenuItem, type OrderItem, type WasteResult, type OrderRecord,
} from "./data";
import { TableDetailModal } from "./components/TableDetailModal";
import { OrderDetailModal, DishDetailModal, ExceptionDetailModal } from "./components/OwnerModals";
import { Toast, type ToastMessage } from "./components/Toast";
import { RealisticBill } from "./components/RealisticBill";
import { MenuManagement } from "./components/MenuManagement";

// ── Shared Primitives ─────────────────────────────────────────────────────────
type Screen =
  | "login"
  | "table-dashboard"
  | "order"
  | "order-confirm"
  | "checkout"
  | "analyzing"
  | "waste-result"
  | "discount"
  | "bill"
  | "receipt"
  | "owner-dashboard";

interface AppState {
  user: { name: string; role: "waiter" | "owner" } | null;
  tables: Table[];
  orders: Record<string, OrderRecord>;
  menu: MenuItem[];
  selectedTableId: string | null;
  orderItems: OrderItem[];
  orderId: string | null;
  wasteResults: WasteResult[] | null;
  discountPct: number;
  paymentDone: boolean;
}

const STATUS_COLOR: Record<TableStatus, { bg: string; text: string; dot: string }> = {
  "Available":           { bg: "bg-emerald-50",    text: "text-emerald-700",  dot: "bg-emerald-500" },
  "Occupied":            { bg: "bg-amber-50",       text: "text-amber-700",   dot: "bg-amber-500" },
  "Reserved":            { bg: "bg-slate-100",      text: "text-slate-600",   dot: "bg-slate-400" },
  "Ordering":            { bg: "bg-sky-50",         text: "text-sky-700",     dot: "bg-sky-500" },
  "Food Served":         { bg: "bg-orange-50",      text: "text-orange-700",  dot: "bg-orange-500" },
  "Checkout Requested":  { bg: "bg-purple-50",      text: "text-purple-700",  dot: "bg-purple-500" },
  "Analysis in Progress":{ bg: "bg-blue-50",        text: "text-blue-700",    dot: "bg-blue-500" },
  "Bill Ready":          { bg: "bg-[#1e4d35]/10",   text: "text-[#1e4d35]",  dot: "bg-[#1e4d35]" },
};

function StatusBadge({ status }: { status: TableStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function TopBar({ title, onBack, rightSlot }: { title: string; onBack?: () => void; rightSlot?: React.ReactNode }) {
  return (
    <div className="h-16 bg-white border-b border-[#1e4d35]/10 flex items-center px-4 gap-3 flex-shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full hover:bg-[#f0e9de] flex items-center justify-center transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="#1e4d35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <h1 className="font-bold text-[#1a1a18] flex-1 text-base md:text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      {rightSlot}
    </div>
  );
}

function Btn({
  children, onClick, variant = "primary", size = "md", className = "", disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-[#1e4d35] text-white hover:bg-[#2d6b4a]",
    outline: "border border-[#1e4d35]/30 text-[#1e4d35] hover:bg-[#1e4d35]/5",
    ghost: "text-[#6b6459] hover:bg-[#f0e9de]",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
    amber: "bg-[#d4813a] text-white hover:bg-[#c07030]",
  };
  const sizes = { sm: "text-xs px-3.5 py-1.5", md: "text-sm px-4.5 py-2.5", lg: "text-base px-6 py-3 font-semibold" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: "waiter" | "owner") => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handle = () => {
    if (!username.trim() || !password.trim()) { setError("Please enter credentials."); return; }
    if (username === "owner" || username === "admin") { onLogin("owner"); return; }
    onLogin("waiter");
  };

  return (
    <div className="min-h-screen bg-[#f8f4ee] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1e4d35] flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl">🍃</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
            EcoPlate
          </h1>
          <p className="text-[#9b9088] text-base mt-1">Smart Restaurant Waste Management</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#1e4d35]/10 text-[#1e4d35] px-3.5 py-1 rounded-full text-xs font-semibold border border-[#1e4d35]/15">
            <span>📍</span> Chennai Spices · Calgary, AB, Canada
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#1e4d35]/10 shadow-sm">
          <h2 className="text-lg font-bold text-[#1a1a18] mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Staff Login
          </h2>
          <p className="text-xs text-[#6b6459] mb-5">Chennai Spices — Calgary Branches (Northwest & Downtown)</p>

          <div className="space-y-3.5 mb-5">
            <div>
              <label className="text-sm font-semibold text-[#6b6459] block mb-1.5">Employee ID / Username</label>
              <input
                className="w-full border border-[#1e4d35]/15 rounded-xl px-3.5 py-2.5 text-base text-[#1a1a18] bg-[#f8f4ee] focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30"
                placeholder="e.g. rahul or owner"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handle()}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#6b6459] block mb-1.5">Password</label>
              <input
                type="password"
                className="w-full border border-[#1e4d35]/15 rounded-xl px-3.5 py-2.5 text-base text-[#1a1a18] bg-[#f8f4ee] focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handle()}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <Btn onClick={handle} className="w-full" size="lg">
            Sign In
          </Btn>

          <p className="text-center text-xs text-[#9b9088] mt-4">
            Use <span className="font-mono font-bold text-[#1e4d35]">owner</span> for owner dashboard · any other name for waiter
          </p>
        </div>

        <p className="text-center text-xs text-[#9b9088] mt-6">
          Chennai Spices (Canada) · Powered by EcoPlate
        </p>
      </div>
    </div>
  );
}

// ── Table Dashboard ───────────────────────────────────────────────────────────
function TableDashboard({
  tables,
  user,
  onSelectTable,
  onOwnerDashboard,
  onLogout,
}: {
  tables: Table[];
  user: AppState["user"];
  onSelectTable: (id: string) => void;
  onOwnerDashboard: () => void;
  onLogout: () => void;
}) {
  const [filter, setFilter] = useState<"All" | "Available" | "Occupied" | "Needs Attention">("All");

  const counts = {
    available: tables.filter((t) => t.status === "Available").length,
    occupied: tables.filter((t) => !["Available", "Reserved"].includes(t.status)).length,
    needsAttention: tables.filter((t) =>
      ["Checkout Requested", "Bill Ready", "Analysis in Progress"].includes(t.status)
    ).length,
  };

  const filteredTables = tables.filter((t) => {
    if (filter === "Available") return t.status === "Available";
    if (filter === "Occupied") return !["Available", "Reserved"].includes(t.status);
    if (filter === "Needs Attention") return ["Checkout Requested", "Bill Ready", "Analysis in Progress"].includes(t.status);
    return true;
  });

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-CA", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      {/* Header */}
      <div className="bg-[#1e4d35] text-white px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base">🍃</div>
            <div>
              <p className="text-sm text-white/70">Chennai Spices · Calgary</p>
              <p className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>Table Dashboard</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">{dateStr}</p>
            <p className="text-base font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{timeStr}</p>
          </div>
        </div>

        {/* Quick stats (Interactive Filter buttons) */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "Available" as const, label: "Available", value: counts.available, color: "text-emerald-300" },
            { key: "Occupied" as const, label: "Occupied", value: counts.occupied, color: "text-amber-300" },
            { key: "Needs Attention" as const, label: "Needs Attention", value: counts.needsAttention, color: "text-red-300" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setFilter(filter === s.key ? "All" : s.key)}
              title={`Click to filter by ${s.label}`}
              className={`rounded-xl p-2.5 text-center transition-all cursor-pointer ${
                filter === s.key
                  ? "bg-white/25 ring-2 ring-white/50 scale-[1.02]"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs text-white/70 leading-tight mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#9b9088] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
            Restaurant Floor {filter !== "All" && `· Filtering by ${filter}`}
          </p>
          {filter !== "All" && (
            <button
              onClick={() => setFilter("All")}
              className="text-xs text-[#1e4d35] font-bold hover:underline bg-[#f0e9de] px-2.5 py-1 rounded-full"
            >
              Show All ({tables.length}) ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {filteredTables.map((t) => {
            const c = STATUS_COLOR[t.status];
            const needsAttention = ["Checkout Requested", "Bill Ready", "Analysis in Progress"].includes(t.status);
            return (
              <button
                key={t.id}
                onClick={() => onSelectTable(t.id)}
                className={`${c.bg} rounded-2xl p-3.5 text-left border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${
                  needsAttention ? "border-current/30 shadow-sm" : "border-transparent"
                } ${c.text}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#1a1a18]">{t.id}</span>
                  {needsAttention && <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />}
                </div>
                <div className={`flex items-center gap-1.5 mb-1`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className="text-xs font-semibold">{t.status}</span>
                </div>
                <p className="text-xs text-[#9b9088]">{t.seats} seats</p>
                {t.reservedFor && (
                  <p className="text-xs text-[#6b6459] mt-1 truncate">{t.reservedFor}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 bg-white border-t border-[#1e4d35]/10 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#1e4d35]/10 flex items-center justify-center text-base">
            {user?.role === "owner" ? "👔" : "👤"}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a1a18]">{user?.name}</p>
            <p className="text-xs text-[#9b9088] capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user?.role === "owner" && (
            <Btn variant="outline" size="sm" onClick={onOwnerDashboard}>Analytics</Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={onLogout}>Sign Out</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Order Screen ──────────────────────────────────────────────────────────────
type MenuCategory = "Starters" | "Main Course" | "Drinks" | "Desserts";
const CATEGORIES: MenuCategory[] = ["Starters", "Main Course", "Drinks", "Desserts"];

function OrderScreen({
  table,
  items,
  menu,
  onUpdateItems,
  onConfirm,
  onBack,
}: {
  table: Table;
  items: OrderItem[];
  menu: MenuItem[];
  onUpdateItems: (items: OrderItem[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [category, setCategory] = useState<MenuCategory>("Main Course");
  const [showCart, setShowCart] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "available" | "evening" | "morning">("all");

  const menuFiltered = menu
    .filter((m) => m.category === category)
    .filter((m) => {
      if (filterMode === "available") return m.availability !== "sold_out";
      if (filterMode === "evening") return m.timing === "evening_only" || (!m.timing || m.timing === "all_day");
      if (filterMode === "morning") return m.timing === "morning_only" || (!m.timing || m.timing === "all_day");
      return true;
    });

  const subtotal = calcSubtotal(items, menu);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const getQty = (id: string) => items.find((i) => i.menuItemId === id)?.quantity ?? 0;

  const adjust = (id: string, delta: number) => {
    const existing = items.find((i) => i.menuItemId === id);
    if (!existing) {
      if (delta > 0) onUpdateItems([...items, { menuItemId: id, quantity: 1 }]);
      return;
    }
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      onUpdateItems(items.filter((i) => i.menuItemId !== id));
    } else {
      onUpdateItems(items.map((i) => (i.menuItemId === id ? { ...i, quantity: newQty } : i)));
    }
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar
        title={`${table.id} — ${table.orderId ? "Add Extra Items" : "New Order"}`}
        onBack={onBack}
        rightSlot={
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative flex items-center gap-1.5 bg-[#1e4d35] text-white text-sm font-semibold px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-[#2d6b4a] transition-colors"
          >
            🛒 Cart
            {totalItems > 0 && (
              <span className="bg-[#d4813a] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
        }
      />

      {/* Category tabs */}
      <div className="bg-white border-b border-[#1e4d35]/8 px-4 py-2.5 flex gap-2 flex-shrink-0 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              category === cat
                ? "bg-[#1e4d35] text-white"
                : "text-[#6b6459] hover:bg-[#f0e9de]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Slot & Availability quick-filters */}
      <div className="bg-[#f8f4ee] border-b border-[#1e4d35]/8 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
        <span className="text-[11px] text-[#9b9088] font-bold uppercase tracking-wider">Slot Filter:</span>
        <div className="flex gap-1.5">
          {[
            { id: "all" as const, label: "All" },
            { id: "available" as const, label: "🟢 In Stock" },
            { id: "evening" as const, label: "🌙 Evening" },
            { id: "morning" as const, label: "☀️ Morning" },
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setFilterMode(flt.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                filterMode === flt.id
                  ? "bg-[#1a1a18] text-white"
                  : "bg-white text-[#6b6459] border border-[#1e4d35]/10 hover:bg-[#f0e9de]"
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {showCart ? (
        /* Cart view */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#6b6459] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
              {table.orderId ? "Updated Order Items" : "Current Order"}
            </p>
            <button
              onClick={() => setShowCart(false)}
              className="text-xs text-[#1e4d35] font-bold hover:underline cursor-pointer"
            >
              + Add More Dishes
            </button>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-16 text-[#9b9088] text-base">No items added yet.</div>
          ) : (
            <div className="space-y-2.5 mb-4">
              {items.map((oi) => {
                const mi = getMenuItem(oi.menuItemId, menu);
                return (
                  <div key={oi.menuItemId} className="bg-white rounded-xl p-3.5 border border-[#1e4d35]/8 flex items-center gap-3">
                    <span className="text-2xl">{mi.emoji}</span>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-[#1a1a18]">{mi.name}</p>
                      <p className="text-xs text-[#9b9088]">₹{mi.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjust(oi.menuItemId, -1)} className="w-7 h-7 rounded-full bg-[#f0e9de] text-[#1e4d35] font-bold text-base flex items-center justify-center hover:bg-[#1e4d35] hover:text-white transition-colors cursor-pointer">−</button>
                      <span className="text-base font-bold w-5 text-center">{oi.quantity}</span>
                      <button onClick={() => adjust(oi.menuItemId, 1)} className="w-7 h-7 rounded-full bg-[#1e4d35] text-white font-bold text-base flex items-center justify-center hover:bg-[#2d6b4a] transition-colors cursor-pointer">+</button>
                    </div>
                    <span className="text-base font-bold text-[#1e4d35] w-16 text-right">₹{mi.price * oi.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="bg-white rounded-xl p-4 border border-[#1e4d35]/10">
            <div className="flex justify-between text-base font-bold text-[#1e4d35] mb-4">
              <span>Subtotal ({totalItems} items)</span>
              <span>₹{subtotal}</span>
            </div>
            <Btn onClick={onConfirm} disabled={items.length === 0} className="w-full" size="lg">
              {table.orderId ? "Confirm & Update Order →" : "Confirm Order"}
            </Btn>
          </div>
        </div>
      ) : (
        /* Menu grid */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2.5">
            {menuFiltered.map((mi) => {
              const qty = getQty(mi.id);
              const isSoldOut = mi.availability === "sold_out";
              return (
                <div
                  key={mi.id}
                  className={`bg-white rounded-xl p-3.5 border transition-all flex items-center gap-3 ${
                    isSoldOut ? "border-red-200 bg-red-50/20 opacity-75" : "border-[#1e4d35]/8"
                  }`}
                >
                  <span className="text-2xl">{mi.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-base font-semibold text-[#1a1a18] truncate">{mi.name}</p>
                      {isSoldOut && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded uppercase">
                          Sold Out
                        </span>
                      )}
                      {mi.timing === "evening_only" && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded">
                          🌙 Evening
                        </span>
                      )}
                      {mi.timing === "morning_only" && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.2 rounded">
                          ☀️ Morning
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9b9088] truncate">{mi.description}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-base font-bold text-[#1e4d35]">₹{mi.price}</span>
                    {isSoldOut ? (
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                        Completed
                      </span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => adjust(mi.id, 1)}
                        className="w-8 h-8 rounded-full bg-[#1e4d35] text-white font-bold text-base flex items-center justify-center hover:bg-[#2d6b4a] transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjust(mi.id, -1)} className="w-7 h-7 rounded-full bg-[#f0e9de] text-[#1e4d35] font-bold flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer">−</button>
                        <span className="text-base font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => adjust(mi.id, 1)} className="w-7 h-7 rounded-full bg-[#1e4d35] text-white font-bold flex items-center justify-center hover:bg-[#2d6b4a] transition-colors cursor-pointer">+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom summary bar */}
      {!showCart && totalItems > 0 && (
        <div className="flex-shrink-0 bg-[#1e4d35] text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70">{totalItems} items</p>
            <p className="text-base font-bold">₹{subtotal}</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="bg-white text-[#1e4d35] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#f0e9de] transition-colors cursor-pointer"
          >
            View Cart →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Order Confirm Screen ──────────────────────────────────────────────────────
function OrderConfirmScreen({
  table,
  items,
  orderId,
  onMarkServed,
  onRequestCheckout,
  onAddExtraItems,
  onQuickAddItem,
  onBack,
}: {
  table: Table;
  items: OrderItem[];
  orderId: string;
  onMarkServed: () => void;
  onRequestCheckout: () => void;
  onAddExtraItems: () => void;
  onQuickAddItem?: (menuItemId: string) => void;
  onBack: () => void;
}) {
  const subtotal = calcSubtotal(items);
  const isServed = table.status === "Food Served";

  const quickAddOptions = [
    { id: "F005", name: "Butter Naan", price: 50, emoji: "🫓" },
    { id: "F013", name: "Water (500ml)", price: 30, emoji: "💧" },
    { id: "F011", name: "Lime Soda", price: 70, emoji: "🍋" },
    { id: "F010", name: "Coke", price: 60, emoji: "🥤" },
    { id: "F014", name: "Gulab Jamun", price: 90, emoji: "🍮" },
  ];

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar title={`${table.id} — Order Confirmed`} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Order header */}
        <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[#9b9088]" style={{ fontFamily: "var(--font-mono)" }}>{orderId}</p>
              <h2 className="text-lg font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                Table {table.id}
              </h2>
            </div>
            <StatusBadge status={table.status} />
          </div>

          <div className="space-y-2 mb-3">
            {items.map((oi) => {
              const mi = getMenuItem(oi.menuItemId);
              return (
                <div key={oi.menuItemId} className="flex items-center gap-2">
                  <span className="text-base">{mi.emoji}</span>
                  <span className="flex-1 text-base text-[#1a1a18]">{mi.name}</span>
                  <span className="text-sm text-[#9b9088]">×{oi.quantity}</span>
                  <span className="text-base font-semibold text-[#1e4d35] w-16 text-right">₹{mi.price * oi.quantity}</span>
                </div>
              );
            })}
          </div>

          {/* Inline Add Extra Items button */}
          <button
            onClick={onAddExtraItems}
            className="w-full mb-3 border border-dashed border-[#1e4d35]/30 hover:border-[#1e4d35] bg-[#f8f4ee] hover:bg-[#f0e9de] text-[#1e4d35] font-semibold text-sm py-2.5 px-3.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>➕</span> Add Extra Items to Order
          </button>

          <div className="border-t border-[#1e4d35]/8 pt-3 flex justify-between text-base font-bold text-[#1e4d35]">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
        </div>

        {/* Quick Add Common Extras Bar */}
        {onQuickAddItem && (
          <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-[#6b6459] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
                ⚡ Quick Add Extras
              </p>
              <button
                onClick={onAddExtraItems}
                className="text-xs text-[#1e4d35] font-bold hover:underline cursor-pointer"
              >
                Browse Menu →
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickAddOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onQuickAddItem(opt.id)}
                  title={`Add +1 ${opt.name}`}
                  className="flex-shrink-0 bg-[#f8f4ee] hover:bg-[#1e4d35] hover:text-white group border border-[#1e4d35]/15 rounded-xl px-3 py-2 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{opt.emoji}</span>
                    <span className="text-xs font-bold text-[#1a1a18] group-hover:text-white">{opt.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#1e4d35] group-hover:text-emerald-200 font-semibold">₹{opt.price}</span>
                    <span className="text-[10px] bg-white group-hover:bg-white/20 text-[#1e4d35] group-hover:text-white px-1.5 py-0.5 rounded font-bold">+1 Add</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 mb-4">
          <p className="text-xs font-bold text-[#9b9088] uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-mono)" }}>
            Order Timeline
          </p>
          <div className="space-y-3">
            {[
              { label: "Order Created", done: true, time: "Now" },
              { label: "Order Confirmed", done: true, time: "Now" },
              { label: "Food Served", done: isServed, time: isServed ? "Done" : "Pending" },
              { label: "Checkout", done: false, time: "—" },
              { label: "Payment", done: false, time: "—" },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-[#1e4d35]" : "bg-[#f0e9de] border border-[#1e4d35]/20"}`}>
                  {step.done && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className={`text-sm flex-1 ${step.done ? "text-[#1a1a18] font-medium" : "text-[#9b9088]"}`}>{step.label}</span>
                <span className="text-xs text-[#9b9088]" style={{ fontFamily: "var(--font-mono)" }}>{step.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action area */}
        <div className="space-y-2.5">
          {isServed ? (
            <Btn onClick={onRequestCheckout} variant="amber" className="w-full" size="lg">
              💳 Start Checkout
            </Btn>
          ) : (
            <Btn onClick={onMarkServed} className="w-full" size="lg">
              🍽️ Mark Food as Served
            </Btn>
          )}

          <Btn
            onClick={onAddExtraItems}
            variant="outline"
            className="w-full"
            size="lg"
          >
            ➕ Add Extra Items
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Checkout / Capture Screen ─────────────────────────────────────────────────
function CheckoutScreen({
  table,
  items,
  orderId,
  onCapture,
  onBack,
}: {
  table: Table;
  items: OrderItem[];
  orderId: string;
  onCapture: () => void;
  onBack: () => void;
  }) {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [warning, setWarning] = useState<"blur" | "mismatch" | null>(null);

  const handleCapture = () => {
    const rand = Math.random();
    if (rand < 0.2) { setWarning("blur"); return; }
    if (rand < 0.3) { setWarning("mismatch"); return; }
    setPhotoTaken(true);
    setWarning(null);
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar title={`${table.id} — Checkout`} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Order summary */}
        <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[#9b9088]" style={{ fontFamily: "var(--font-mono)" }}>{orderId}</p>
              <h2 className="text-base font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                Table {table.id} — {items.reduce((s, i) => s + i.quantity, 0)} Items
              </h2>
            </div>
            <span className="text-base font-bold text-[#1e4d35]">₹{calcSubtotal(items)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((oi) => {
              const mi = getMenuItem(oi.menuItemId);
              return (
                <span key={oi.menuItemId} className="text-xs bg-[#f0e9de] text-[#6b6459] px-2.5 py-1 rounded-full font-medium">
                  {mi.emoji} {mi.name} ×{oi.quantity}
                </span>
              );
            })}
          </div>
        </div>

        {/* Warnings */}
        {warning === "blur" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-3 flex gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Image Quality Too Low</p>
              <p className="text-xs text-amber-700 mt-0.5">The food cannot be analyzed reliably. Please capture a clearer photo.</p>
            </div>
          </div>
        )}
        {warning === "mismatch" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-3 flex gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-800">Possible Table Mismatch</p>
              <p className="text-xs text-red-700 mt-0.5">This image may not belong to Table {table.id}. Please verify before continuing.</p>
            </div>
          </div>
        )}

        {/* Photo capture area */}
        <div className="bg-white rounded-2xl border border-[#1e4d35]/10 overflow-hidden mb-4">
          <div className="p-3.5 border-b border-[#1e4d35]/8">
            <p className="text-sm font-bold text-[#1a1a18]">📸 Capture Final Food Photo</p>
            <p className="text-xs text-[#9b9088] mt-0.5">Photograph all remaining food on the table so EcoPlate can analyse waste accurately.</p>
          </div>

          {/* Simulated camera view */}
          <div
            className={`aspect-video flex flex-col items-center justify-center cursor-pointer transition-all ${
              photoTaken
                ? "bg-[#1e4d35]/8"
                : "bg-[#f0e9de] hover:bg-[#e8ddd0]"
            }`}
            onClick={!photoTaken ? handleCapture : undefined}
          >
            {photoTaken ? (
              <div className="text-center">
                <div className="text-5xl mb-2">🍛🍗🥤</div>
                <p className="text-sm font-semibold text-[#1e4d35]">Photo Captured</p>
                <p className="text-xs text-[#9b9088] mt-0.5">Remaining food visible — ready for analysis</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-2 opacity-40">📷</div>
                <p className="text-sm text-[#9b9088]">Tap to capture photo</p>
              </div>
            )}
          </div>

          {photoTaken && (
            <div className="p-3.5 flex gap-2 items-center">
              <Btn variant="outline" size="sm" onClick={() => { setPhotoTaken(false); setWarning(null); }}>
                Retake Photo
              </Btn>
              <div className="flex-1" />
              <span className="text-xs text-[#5da86b] font-semibold flex items-center gap-1">✓ Image validated</span>
            </div>
          )}
        </div>

        {/* Confirmation before analysis */}
        {photoTaken && !confirmed && (
          <div className="bg-[#1e4d35]/6 border border-[#1e4d35]/15 rounded-2xl p-4 mb-4">
            <p className="text-sm font-bold text-[#1e4d35] mb-2">Photo Review — Final Confirmation</p>
            <p className="text-xs text-[#6b6459] mb-3 leading-relaxed">
              Selected Table: <strong>{table.id}</strong> · Order: <strong>{orderId}</strong><br />
              Is the captured photo showing the correct table's remaining food?
            </p>
            <div className="flex gap-2">
              <Btn size="sm" variant="outline" onClick={() => { setPhotoTaken(false); }}>Retake</Btn>
              <Btn size="sm" onClick={() => setConfirmed(true)}>Yes, Use This Photo</Btn>
            </div>
          </div>
        )}

        {confirmed && (
          <Btn onClick={onCapture} className="w-full" size="lg">
            🔍 Analyse Food Waste
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Analysing Screen ──────────────────────────────────────────────────────────
function AnalysingScreen({ onDone }: { onDone: () => void }) {
  const steps = [
    "Order identified",
    "Food items matched",
    "Final image processed",
    "Remaining food estimated",
    "Waste calculated",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= steps.length) { setTimeout(onDone, 600); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 rounded-full bg-[#1e4d35] flex items-center justify-center mb-6 animate-pulse">
        <span className="text-3xl">🤖</span>
      </div>
      <h2 className="text-2xl font-bold text-[#1a1a18] mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Analysing Food Waste…
      </h2>
      <p className="text-base text-[#9b9088] mb-8 text-center">EcoPlate is comparing your photo with reference food data</p>

      <div className="w-full max-w-xs space-y-3">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center gap-3 transition-all duration-300 ${i < step ? "opacity-100" : "opacity-25"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${i < step ? "bg-[#1e4d35]" : "bg-[#f0e9de] border border-[#1e4d35]/20"}`}>
              {i < step && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm font-medium text-[#1a1a18]">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Waste Result Screen ───────────────────────────────────────────────────────
function WasteResultScreen({
  items,
  wasteResults,
  onCorrect,
  onProceed,
  onBack,
}: {
  items: OrderItem[];
  wasteResults: WasteResult[];
  onCorrect: (id: string, newPct: number) => void;
  onProceed: () => void;
  onBack: () => void;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [correctionVal, setCorrectionVal] = useState("");

  const overallWaste = Math.round(
    wasteResults.reduce((s, r) => s + r.wastePct, 0) / wasteResults.length
  );
  const hasLowConfidence = wasteResults.some((r) => r.confidence < 85);

  const submitCorrection = (id: string) => {
    const val = parseInt(correctionVal);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onCorrect(id, val);
      setCorrecting(null);
      setCorrectionVal("");
    }
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar title="Waste Analysis Result" onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4">
        {hasLowConfidence && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-3 flex gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Low Confidence Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">Some results have low confidence. Please verify and correct if needed before proceeding.</p>
            </div>
          </div>
        )}

        {/* Per-dish results */}
        <div className="space-y-3 mb-4">
          {wasteResults.map((r) => {
            const mi = getMenuItem(r.menuItemId);
            const lowConf = r.confidence < 85;
            return (
              <div key={r.menuItemId} className={`bg-white rounded-2xl p-4 border ${lowConf ? "border-amber-200" : "border-[#1e4d35]/8"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mi.emoji}</span>
                    <span className="text-base font-bold text-[#1a1a18]">{mi.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.confidence >= 85 ? "bg-[#5da86b]/15 text-[#2d6b4a]" : "bg-amber-100 text-amber-700"}`} style={{ fontFamily: "var(--font-mono)" }}>
                      {r.confidence}% conf.
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${r.wastePct <= 10 ? "bg-[#5da86b]/15 text-[#2d6b4a]" : r.wastePct <= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {r.wastePct}% wasted
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#f0e9de] rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-[#1e4d35]" style={{ width: `${(r.consumedGrams / r.servedGrams) * 100}%` }} />
                </div>

                <div className="flex justify-between text-xs text-[#9b9088] mb-2" style={{ fontFamily: "var(--font-mono)" }}>
                  <span>Served {r.servedGrams}g</span>
                  <span>Consumed {r.consumedGrams}g</span>
                  <span>Wasted {r.remainingGrams}g</span>
                </div>

                {correcting === r.menuItemId ? (
                  <div className="flex items-center gap-2 mt-2 bg-[#f8f4ee] rounded-lg p-2.5">
                    <span className="text-xs text-[#6b6459]">Correct waste %:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 border border-[#1e4d35]/20 rounded px-2 py-1 text-sm"
                      value={correctionVal}
                      onChange={(e) => setCorrectionVal(e.target.value)}
                    />
                    <Btn size="sm" onClick={() => submitCorrection(r.menuItemId)}>Save</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setCorrecting(null)}>Cancel</Btn>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCorrecting(r.menuItemId); setCorrectionVal(String(r.wastePct)); }}
                    className="text-xs text-[#9b9088] hover:text-[#d4813a] transition-colors font-medium"
                  >
                    Correct Result
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall */}
        <div className="bg-[#1e4d35] text-white rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-white/70 mb-0.5">Overall Waste</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{overallWaste}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70 mb-0.5">Analysis</p>
              <p className="text-base font-semibold text-[#5da86b]">✓ Complete</p>
            </div>
          </div>
        </div>

        <Btn onClick={onProceed} className="w-full" size="lg">
          Calculate Eco Discount →
        </Btn>
      </div>
    </div>
  );
}

// ── Discount Screen ───────────────────────────────────────────────────────────
function DiscountScreen({
  table,
  orderId,
  items,
  wasteResults,
  discountPct,
  onPayment,
  onProceed,
  onBack,
  onShowToast,
}: {
  table: Table;
  orderId: string;
  items: OrderItem[];
  wasteResults: WasteResult[];
  discountPct: number;
  onPayment?: () => void;
  onProceed: () => void;
  onBack: () => void;
  onShowToast?: (msg: string) => void;
}) {
  const subtotal = calcSubtotal(items);
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const cgst = +(subtotal * 0.025).toFixed(2);
  const sgst = +(subtotal * 0.025).toFixed(2);
  const netPayable = +(subtotal + cgst + sgst - discountAmt).toFixed(2);
  const overallWaste = Math.round(wasteResults.reduce((s, r) => s + r.wastePct, 0) / (wasteResults.length || 1));

  const message =
    discountPct >= 10 ? "Outstanding! Excellent food completion." :
    discountPct >= 7 ? "Great job — very little food wasted!" :
    discountPct >= 4 ? "Good effort. Keep reducing waste." :
    "Every bit counts — thank you for trying!";

  const handlePrint = () => {
    window.print();
    if (onShowToast) onShowToast("Sending bill to printer...");
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar
        title={`${table.id} — EcoPlate Reward & Final Bill`}
        onBack={onBack}
        rightSlot={
          <button
            onClick={handlePrint}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span> Print Bill
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: EcoPlate Reward Card & Details */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Reward Card */}
            <div className="bg-[#1e4d35] text-white rounded-3xl p-6 md:p-7 text-center relative overflow-hidden shadow-md">
              <div className="absolute inset-0 opacity-10 text-9xl flex items-center justify-center">🌿</div>
              <div className="relative">
                <p className="text-sm text-white/70 mb-1">EcoPlate Reward</p>
                <div className="text-5xl md:text-6xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  {discountPct}%
                </div>
                <p className="text-white/90 text-sm md:text-base font-semibold">Eco Discount Earned</p>
                <div className="mt-3 bg-white/10 rounded-xl px-4 py-2">
                  <p className="text-white/90 text-xs md:text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>

            {/* Waste & Savings Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 text-center shadow-xs">
                <p className="text-xs text-[#9b9088] mb-1 font-semibold">Food Wasted</p>
                <p className="text-3xl font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                  {overallWaste}%
                </p>
                <span className="text-[11px] text-[#5da86b] font-semibold mt-0.5 block">
                  ↓ Well below target
                </span>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 text-center shadow-xs">
                <p className="text-xs text-[#9b9088] mb-1 font-semibold">You Saved</p>
                <p className="text-3xl font-bold text-[#1e4d35]" style={{ fontFamily: "var(--font-display)" }}>
                  ₹{discountAmt}
                </p>
                <span className="text-[11px] text-[#1e4d35] font-semibold mt-0.5 block">
                  🌿 Instant rebate
                </span>
              </div>
            </div>

            {/* Environmental Impact Summary */}
            <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10 shadow-xs">
              <p className="text-xs font-bold text-[#6b6459] uppercase tracking-wider mb-2.5 font-mono">
                Eco Impact Summary
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#1a1a18]">
                  <span className="text-[#6b6459]">Plate Consumption Rate</span>
                  <strong className="text-[#1e4d35] font-bold">{100 - overallWaste}% Completed</strong>
                </div>
                <div className="flex justify-between text-[#1a1a18]">
                  <span className="text-[#6b6459]">Greenhouse Gas Prevented</span>
                  <strong className="text-[#2d6b4a]">~450g CO₂e</strong>
                </div>
                <div className="flex justify-between items-center text-[#1a1a18]">
                  <span className="text-[#6b6459]">EcoPlate Dining Tier</span>
                  <span className="text-xs font-bold bg-[#5da86b]/15 text-[#2d6b4a] px-2.5 py-0.5 rounded-full">
                    🌱 Champion
                  </span>
                </div>
              </div>
            </div>

            {/* Left Action Area */}
            <div className="space-y-2.5 pt-1">
              {onPayment && (
                <Btn onClick={onPayment} className="w-full" size="lg">
                  💳 Settle & Confirm Payment · ₹{netPayable}
                </Btn>
              )}
              <Btn onClick={onProceed} variant="outline" className="w-full" size="md">
                Detailed Verification Check →
              </Btn>
            </div>
          </div>

          {/* Right Column: Real Restaurant Bill */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-[#6b6459] uppercase tracking-wider font-mono">
                Official Bill Receipt
              </span>
              <span className="text-xs text-[#9b9088] font-mono">
                Table {table.id} · {orderId}
              </span>
            </div>

            <RealisticBill
              table={table}
              orderId={orderId}
              items={items}
              wasteResults={wasteResults}
              discountPct={discountPct}
              onPayment={onPayment}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bill Screen ───────────────────────────────────────────────────────────────
function BillScreen({
  table,
  items,
  orderId,
  wasteResults,
  discountPct,
  onPayment,
  onBack,
}: {
  table: Table;
  items: OrderItem[];
  orderId: string;
  wasteResults: WasteResult[];
  discountPct: number;
  onPayment: () => void;
  onBack: () => void;
}) {
  const subtotal = calcSubtotal(items);
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const finalAmt = +(subtotal - discountAmt).toFixed(2);
  const [confirmed, setConfirmed] = useState(false);

  const now = new Date();
  const overallWaste = Math.round(wasteResults.reduce((s, r) => s + r.wastePct, 0) / wasteResults.length);

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar title="Final Bill" onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Final check banner */}
        {!confirmed && (
          <div className="bg-[#1e4d35]/8 border border-[#1e4d35]/20 rounded-xl p-3.5 mb-4 flex gap-3 items-start">
            <span className="text-lg">🔍</span>
            <div>
              <p className="text-sm font-bold text-[#1e4d35]">Final Check — Table {table.id} · {orderId}</p>
              <p className="text-xs text-[#6b6459] mt-0.5">Please verify all details before generating the bill.</p>
              <div className="flex gap-2 mt-2.5">
                <Btn size="sm" onClick={() => setConfirmed(true)}>Looks Correct</Btn>
                <Btn size="sm" variant="outline" onClick={onBack}>Go Back</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Bill receipt */}
        <div className="bg-white rounded-2xl border border-[#1e4d35]/10 overflow-hidden mb-4">
          {/* Header */}
          <div className="bg-[#1e4d35] text-white p-5 text-center">
            <p className="text-xs text-white/70 mb-0.5 uppercase tracking-wider font-semibold">ECOPLATE · TAX INVOICE</p>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Chennai Spices</h2>
            <p className="text-xs text-white/80 mt-0.5 font-medium">11 Hidden Creek Dr NW, Unit 206, Calgary, AB T3A 6L2, Canada</p>
            <p className="text-[11px] text-white/65 mt-0.5 font-mono">GST # 82451 9802 RT0001 · chennaispices.ca</p>
            <p className="text-xs text-white/60 mt-1.5">
              {now.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
              {now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="p-5">
            <div className="flex justify-between text-xs text-[#9b9088] mb-4 font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              <span>{orderId}</span>
              <span>Table {table.id}</span>
            </div>

            {/* Items */}
            <div className="space-y-2.5 mb-4">
              {items.map((oi) => {
                const mi = getMenuItem(oi.menuItemId);
                return (
                  <div key={oi.menuItemId} className="flex items-center">
                    <span className="mr-2 text-base">{mi.emoji}</span>
                    <span className="flex-1 text-sm text-[#1a1a18]">{mi.name}{oi.quantity > 1 ? ` ×${oi.quantity}` : ""}</span>
                    <span className="text-sm font-semibold text-[#1a1a18]">₹{mi.price * oi.quantity}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#1e4d35]/8 pt-3 space-y-1.5 mb-3">
              <div className="flex justify-between text-sm text-[#6b6459]">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5da86b] font-semibold">
                <span>🌿 EcoPlate Discount {discountPct}%</span>
                <span>−₹{discountAmt}</span>
              </div>
            </div>

            <div className="border-t border-[#1e4d35]/12 pt-3 flex justify-between text-base font-bold text-[#1e4d35]">
              <span>Final Amount</span>
              <span>₹{finalAmt}</span>
            </div>

            {/* Waste summary */}
            <div className="mt-4 bg-[#f8f4ee] rounded-xl p-3.5">
              <p className="text-xs text-[#9b9088] mb-1.5 font-medium">Food Waste Summary</p>
              <div className="flex flex-wrap gap-1.5">
                {wasteResults.map((r) => {
                  const mi = getMenuItem(r.menuItemId);
                  return (
                    <span key={r.menuItemId} className="text-xs bg-white border border-[#1e4d35]/10 text-[#6b6459] px-2 py-0.5 rounded">
                      {mi.emoji} {r.wastePct}% wasted
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-[#5da86b] mt-2 font-medium">Overall: {overallWaste}% wasted · {discountPct}% discount earned</p>
            </div>

            <p className="text-center text-xs text-[#9b9088] mt-4 italic">
              Thank you for reducing food waste with EcoPlate!
            </p>
          </div>
        </div>

        {confirmed && (
          <Btn onClick={onPayment} className="w-full" size="lg">
            💳 Confirm Payment · ₹{finalAmt}
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Receipt Screen ────────────────────────────────────────────────────────────
function ReceiptScreen({
  table,
  items,
  orderId,
  wasteResults,
  discountPct,
  onDone,
  onShowToast,
}: {
  table: Table;
  items: OrderItem[];
  orderId: string;
  wasteResults: WasteResult[];
  discountPct: number;
  onDone: () => void;
  onShowToast?: (msg: string) => void;
}) {
  const subtotal = calcSubtotal(items);
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const finalAmt = +(subtotal - discountAmt).toFixed(2);
  const now = new Date();
  const overallWaste = Math.round(wasteResults.reduce((s, r) => s + r.wastePct, 0) / wasteResults.length);

  const handleShare = () => {
    const summary = `🌿 EcoPlate Official Receipt — Chennai Spices (Calgary, Canada)\nTable: ${table.id} · Order: ${orderId}\n` +
      items.map((oi) => {
        const mi = getMenuItem(oi.menuItemId);
        return `${mi.name} ×${oi.quantity}: ₹${mi.price * oi.quantity}`;
      }).join("\n") +
      `\nSubtotal: ₹${subtotal.toFixed(2)}\nEcoPlate Discount (${discountPct}%): −₹${discountAmt}\nTotal Paid: ₹${finalAmt}\nFood Wasted: ${overallWaste}%\nThank you for reducing food waste!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
    }
    if (onShowToast) {
      onShowToast("Receipt details copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast("Preparing receipt for print...");
    }
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <TopBar title="Receipt" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        {/* Success badge */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#1e4d35] flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-lg font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>Payment Complete</p>
          <p className="text-sm text-[#9b9088]">Table {table.id} is now available</p>
        </div>

        {/* Receipt card */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#1e4d35]/10 overflow-hidden mb-5">
          <div className="bg-[#1e4d35] text-white p-4 text-center">
            <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">OFFICIAL RECEIPT</p>
            <h2 className="text-base font-bold mt-0.5" style={{ fontFamily: "var(--font-display)" }}>Chennai Spices</h2>
            <p className="text-[11px] text-white/80 mt-0.5">Calgary, AB, Canada · chennaispices.ca</p>
          </div>

          <div className="p-4 border-b border-dashed border-[#1e4d35]/15">
            <div className="flex justify-between text-xs text-[#9b9088] mb-3 font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              <span>{orderId}</span>
              <span>Table {table.id}</span>
            </div>
            {items.map((oi) => {
              const mi = getMenuItem(oi.menuItemId);
              return (
                <div key={oi.menuItemId} className="flex text-sm mb-1.5">
                  <span className="flex-1 text-[#6b6459]">{mi.name}{oi.quantity > 1 ? ` ×${oi.quantity}` : ""}</span>
                  <span className="text-[#1a1a18] font-semibold">₹{mi.price * oi.quantity}</span>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-b border-dashed border-[#1e4d35]/15 space-y-1.5">
            <div className="flex justify-between text-sm text-[#6b6459]">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#5da86b] font-semibold">
              <span>🌿 Eco Discount {discountPct}%</span><span>−₹{discountAmt}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#1e4d35] pt-1">
              <span>Total Paid</span><span>₹{finalAmt}</span>
            </div>
          </div>

          <div className="p-4 text-center">
            <p className="text-xs text-[#9b9088]">
              {now.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
              {now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })} · Payment: PAID
            </p>
            <div className="my-3 bg-[#f8f4ee] rounded-lg p-2.5">
              <p className="text-xs text-[#9b9088]">Food Wasted: {overallWaste}% · EcoPlate Saved: ₹{discountAmt}</p>
            </div>
            <p className="text-xs text-[#5da86b] font-medium italic">Thank you for reducing food waste! 🌿</p>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <Btn variant="outline" size="sm" className="flex-1" onClick={handleShare}>📤 Share</Btn>
          <Btn variant="outline" size="sm" className="flex-1" onClick={handlePrint}>🖨️ Print</Btn>
        </div>

        <div className="mt-4 w-full max-w-sm">
          <Btn onClick={onDone} className="w-full" size="lg">
            ← Back to Tables
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Owner Dashboard ───────────────────────────────────────────────────────────
function OwnerDashboard({
  onBack,
  orders,
  menu,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onShowToast,
}: {
  onBack: () => void;
  orders: Record<string, OrderRecord>;
  menu: MenuItem[];
  onAddItem: (item: Omit<MenuItem, "id">) => void;
  onUpdateItem: (id: string, updates: Partial<MenuItem>) => void;
  onDeleteItem: (id: string) => void;
  onShowToast?: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "waste" | "menu" | "orders">("overview");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [selectedDish, setSelectedDish] = useState<{ name: string; orders: number; avgWaste: number } | null>(null);
  const [selectedException, setSelectedException] = useState<{ label: string; count: number; color: string } | null>(null);

  const recentOrders = [
    { id: "ORD-1042", table: "T04", amount: 492.90, discount: 7, waste: 8, status: "Completed", items: "Chicken Biryani, Chicken 65, Coke ×2" },
    { id: "ORD-1041", table: "T05", amount: 380.00, discount: 5, waste: 12, status: "Completed", items: "Paneer Tikka, Dal Tadka, Lassi" },
    { id: "ORD-1040", table: "T02", amount: 620.00, discount: 10, waste: 4, status: "Completed", items: "Mutton Biryani, Paneer Tikka, Kulfi" },
    { id: "ORD-1039", table: "T08", amount: 210.00, discount: 4, waste: 18, status: "Completed", items: "Veg Spring Rolls, Butter Naan, Coke" },
    { id: "ORD-1038", table: "T11", amount: 870.00, discount: 10, waste: 5, status: "Bill Ready", items: "Chicken Biryani ×2, Chicken 65 ×2, Lassi ×2" },
  ];

  const handleExportReport = () => {
    window.print();
    if (onShowToast) onShowToast("Daily analytics report prepared!");
  };

  return (
    <div className="h-screen bg-[#f8f4ee] flex flex-col">
      <div className="bg-[#1a1a18] text-white px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-white/60">Chennai Spices (Calgary, Canada) · Owner View</p>
              <h1 className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>Analytics Dashboard</h1>
            </div>
          </div>
          <button
            onClick={handleExportReport}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span> Print Report
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Revenue", value: "₹42,850", target: "orders" as const },
            { label: "Active Dishes", value: `${menu.length}`, target: "menu" as const },
            { label: "Avg Waste", value: "8.4%", target: "waste" as const },
          ].map((k) => (
            <button
              key={k.label}
              onClick={() => setTab(k.target)}
              className="bg-white/8 hover:bg-white/15 rounded-xl p-2.5 text-center transition-all cursor-pointer"
            >
              <p className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{k.value}</p>
              <p className="text-xs text-white/60 mt-0.5">{k.label} →</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#1e4d35]/8 px-4 py-2.5 flex gap-2 flex-shrink-0 overflow-x-auto">
        {[
          { key: "overview" as const, label: "Overview" },
          { key: "menu" as const, label: "📋 Menu & Stock Editor" },
          { key: "waste" as const, label: "🌿 Food Waste" },
          { key: "orders" as const, label: "🧾 Orders" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              tab === t.key ? "bg-[#1e4d35] text-white" : "text-[#6b6459] hover:bg-[#f0e9de]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Extended KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Discounts Given", value: "₹2,430", icon: "🌿" },
                { label: "Tables Active", value: "4 / 12", icon: "🪑" },
                { label: "Avg Order Value", value: "₹337", icon: "🧾" },
                { label: "Eco Rewards", value: "89 today", icon: "⭐" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl p-3.5 border border-[#1e4d35]/8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{k.icon}</span>
                    <p className="text-xs text-[#9b9088]">{k.label}</p>
                  </div>
                  <p className="text-lg font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Exception centre */}
            <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
                  ⚠️ Exception Centre
                </p>
                <span className="text-xs text-[#9b9088]">Click for incident log</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Low Confidence Analysis", count: 3, color: "text-amber-600 bg-amber-50" },
                  { label: "Photo Quality Issues", count: 2, color: "text-amber-600 bg-amber-50" },
                  { label: "Manual Corrections", count: 5, color: "text-blue-600 bg-blue-50" },
                  { label: "Failed Payments", count: 1, color: "text-red-600 bg-red-50" },
                ].map((e) => (
                  <div
                    key={e.label}
                    onClick={() => setSelectedException(e)}
                    className="flex items-center justify-between text-sm cursor-pointer p-2 rounded-xl hover:bg-[#f0e9de]/70 transition-colors"
                  >
                    <span className="text-[#6b6459] font-medium">{e.label}</span>
                    <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${e.color}`}>{e.count} →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "waste" && (
          <div className="space-y-4">
            <div className="bg-[#1e4d35] text-white rounded-2xl p-5">
              <p className="text-sm text-white/70 mb-1">Today's Average Waste</p>
              <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>8.4%</p>
              <p className="text-sm text-[#5da86b] mt-1 font-medium">↓ 1.2% vs yesterday</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#1e4d35]/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#6b6459] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
                  Dish Waste Ranking
                </p>
                <span className="text-xs text-[#9b9088]">Click dish for tips</span>
              </div>
              <div className="space-y-3">
                {DISH_WASTE.map((d, i) => (
                  <div
                    key={d.name}
                    onClick={() => setSelectedDish(d)}
                    className="cursor-pointer p-2 rounded-xl hover:bg-[#f0e9de]/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-[#9b9088] w-4 font-mono">{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-[#1a1a18]">{d.name}</span>
                      <span className="text-xs text-[#9b9088]">{d.orders} orders</span>
                      <span
                        className="text-sm font-bold w-12 text-right"
                        style={{ color: d.avgWaste > 15 ? "#d4813a" : d.avgWaste > 8 ? "#e8a060" : "#5da86b" }}
                      >
                        {d.avgWaste}% →
                      </span>
                    </div>
                    <div className="ml-6 w-full bg-[#f0e9de] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(d.avgWaste / 25) * 100}%`,
                          background: d.avgWaste > 15 ? "#d4813a" : d.avgWaste > 8 ? "#e8a060" : "#5da86b",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9b9088] italic mt-3">
                High wastage indicates a pattern worth investigating — not necessarily poor taste.
              </p>
            </div>
          </div>
        )}

        {tab === "menu" && (
          <MenuManagement
            menu={menu}
            onAddItem={onAddItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onShowToast={onShowToast || (() => {})}
          />
        )}

        {tab === "orders" && (
          <div className="space-y-2.5">
            <p className="text-xs text-[#9b9088] mb-1 font-medium">Click on any order to view detailed breakdown & receipt.</p>
            {recentOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  const ord = orders[o.id] || {
                    orderId: o.id,
                    tableId: o.table,
                    items: [
                      { menuItemId: "F001", quantity: 1 },
                      { menuItemId: "F006", quantity: 1 },
                    ],
                    createdAt: "Today",
                    status: o.status as TableStatus,
                    discountPct: o.discount,
                    wasteResults: [
                      { menuItemId: "F001", servedGrams: 500, remainingGrams: Math.round(500 * o.waste / 100), consumedGrams: 500 - Math.round(500 * o.waste / 100), wastePct: o.waste, confidence: 92 },
                    ],
                    paymentDone: o.status === "Completed",
                  };
                  setSelectedOrder(ord);
                }}
                className="bg-white rounded-xl p-3.5 border border-[#1e4d35]/8 cursor-pointer hover:border-[#1e4d35]/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#9b9088] font-mono">{o.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#5da86b]/15 text-[#2d6b4a] px-2 py-0.5 rounded-full font-semibold">
                      {o.discount}% off
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.status === "Completed" ? "bg-[#1e4d35]/10 text-[#1e4d35]" : "bg-amber-100 text-amber-700"}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-[#1a1a18]">Table {o.table}</span>
                  <span className="text-xs text-[#9b9088]">·</span>
                  <span className="text-sm font-bold text-[#1e4d35]">₹{o.amount.toFixed(2)}</span>
                  <span className="text-xs text-[#9b9088]">· Waste {o.waste}%</span>
                </div>
                <p className="text-xs text-[#9b9088] truncate">{o.items}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={() => {
            window.print();
            if (onShowToast) onShowToast("Order receipt ready to print");
          }}
        />
      )}
      {selectedDish && (
        <DishDetailModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
        />
      )}
      {selectedException && (
        <ExceptionDetailModal
          exception={selectedException}
          onClose={() => setSelectedException(null)}
        />
      )}
    </div>
  );
}

// ── Fallback Screen (Prevents empty blank pages) ──────────────────────────────
function FallbackScreen({
  message,
  onBack,
}: {
  message?: string;
  onBack: () => void;
}) {
  return (
    <div
      className="h-screen bg-[#f8f4ee] flex flex-col items-center justify-center p-6 text-center"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="w-16 h-16 rounded-full bg-[#1e4d35]/10 flex items-center justify-center text-3xl mb-4">
        🍃
      </div>
      <h2
        className="text-2xl font-bold text-[#1a1a18] mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Table Session Ready
      </h2>
      <p className="text-base text-[#6b6459] mb-6 max-w-sm">
        {message || "No active order was loaded for this view. Please select a table from the floor to proceed."}
      </p>
      <Btn onClick={onBack} size="lg">
        ← Return to Table Dashboard
      </Btn>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [state, setState] = useState<AppState>({
    user: null,
    tables: INITIAL_TABLES,
    orders: INITIAL_ORDERS,
    menu: MENU,
    selectedTableId: null,
    orderItems: [],
    orderId: null,
    wasteResults: null,
    discountPct: 0,
    paymentDone: false,
  });
  const [sheetTableId, setSheetTableId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const orderIdCounter = useRef(1043);

  const showToast = (text: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ id: Date.now().toString(), text, type });
  };

  const handleAddMenuItem = (item: Omit<MenuItem, "id">) => {
    const newId = `F${String(state.menu.length + 1).padStart(3, "0")}`;
    const newItem: MenuItem = { ...item, id: newId };
    setState((s) => ({ ...s, menu: [newItem, ...s.menu] }));
  };

  const handleUpdateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setState((s) => ({
      ...s,
      menu: s.menu.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const handleDeleteMenuItem = (id: string) => {
    setState((s) => ({
      ...s,
      menu: s.menu.filter((m) => m.id !== id),
    }));
  };

  const selectedTable = state.tables.find((t) => t.id === state.selectedTableId) ?? null;

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setState((s) => ({
      ...s,
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
    }));
  };

  const handleLogin = (role: "waiter" | "owner") => {
    setState((s) => ({ ...s, user: { name: role === "owner" ? "Arjun (Owner)" : "Rahul", role } }));
    setScreen(role === "owner" ? "owner-dashboard" : "table-dashboard");
  };

  const handleSelectTable = (tableId: string) => {
    setState((s) => ({ ...s, selectedTableId: tableId }));
    setSheetTableId(tableId);
  };

  const handleNewOrder = (tableId?: string) => {
    const targetTableId = tableId || state.selectedTableId;
    if (!targetTableId) return;

    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: targetTableId,
      orderItems: [],
      orderId: null,
      wasteResults: null,
      discountPct: 0,
    }));
    updateTableStatus(targetTableId, "Ordering");
    setScreen("order");
  };

  const handleViewOrder = (tableId?: string) => {
    const targetTableId = tableId || state.selectedTableId;
    if (!targetTableId) return;
    const table = state.tables.find((t) => t.id === targetTableId);
    if (!table) return;

    // Look up order from state.orders
    let order = table.orderId ? state.orders[table.orderId] : undefined;
    if (!order) {
      order = Object.values(state.orders).find((o) => o.tableId === targetTableId && o.status !== "Available");
    }

    // If no order exists in mock data, create a default order so it NEVER fails
    if (!order) {
      const fallbackId = `ORD-${orderIdCounter.current++}`;
      const defaultItems: OrderItem[] = [
        { menuItemId: "F001", quantity: 1 },
        { menuItemId: "F005", quantity: 2 },
        { menuItemId: "F010", quantity: 1 },
      ];
      order = {
        orderId: fallbackId,
        tableId: targetTableId,
        items: defaultItems,
        createdAt: "Now",
        status: table.status,
      };
      setState((s) => ({
        ...s,
        orders: { ...s.orders, [fallbackId]: order! },
        tables: s.tables.map((t) => (t.id === targetTableId ? { ...t, orderId: fallbackId } : t)),
      }));
    }

    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: targetTableId,
      orderId: order!.orderId,
      orderItems: order!.items,
      wasteResults: order!.wasteResults || null,
      discountPct: order!.discountPct || 0,
    }));
    setScreen("order-confirm");
  };

  const handleAddMoreItems = (tableId?: string) => {
    const targetTableId = tableId || state.selectedTableId;
    if (!targetTableId) return;
    const table = state.tables.find((t) => t.id === targetTableId);
    if (!table) return;

    const order = table.orderId ? state.orders[table.orderId] : undefined;
    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: targetTableId,
      orderId: order?.orderId || null,
      orderItems: order?.items ? [...order.items] : [],
    }));
    setScreen("order");
  };

  const handleStartCheckoutFromModal = (tableId?: string) => {
    const targetTableId = tableId || state.selectedTableId;
    if (!targetTableId) return;
    const table = state.tables.find((t) => t.id === targetTableId);
    if (!table) return;

    let order = table.orderId ? state.orders[table.orderId] : undefined;
    if (!order) {
      order = Object.values(state.orders).find((o) => o.tableId === targetTableId);
    }
    if (!order) {
      handleViewOrder(targetTableId);
      return;
    }

    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: targetTableId,
      orderId: order!.orderId,
      orderItems: order!.items,
    }));
    updateTableStatus(targetTableId, "Checkout Requested");
    setScreen("checkout");
  };

  const handleViewBillFromModal = (tableId?: string) => {
    const targetTableId = tableId || state.selectedTableId;
    if (!targetTableId) return;
    const table = state.tables.find((t) => t.id === targetTableId);
    if (!table) return;

    let order = table.orderId ? state.orders[table.orderId] : undefined;
    if (!order) {
      order = Object.values(state.orders).find((o) => o.tableId === targetTableId);
    }
    if (!order) {
      handleViewOrder(targetTableId);
      return;
    }

    const wasteRes = order.wasteResults || simulateWasteAnalysis(order.items);
    const overallWaste = Math.round(wasteRes.reduce((s, r) => s + r.wastePct, 0) / wasteRes.length);
    const disc = order.discountPct ?? calcDiscount(overallWaste, calcSubtotal(order.items));

    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: targetTableId,
      orderId: order!.orderId,
      orderItems: order!.items,
      wasteResults: wasteRes,
      discountPct: disc,
    }));
    setScreen("bill");
  };

  const handleSeatGuest = (tableId: string) => {
    setSheetTableId(null);
    setState((s) => ({
      ...s,
      selectedTableId: tableId,
      orderItems: [],
      orderId: null,
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, status: "Ordering" } : t)),
    }));
    setScreen("order");
    showToast(`Guest seated at Table ${tableId}. Create initial order.`);
  };

  const handleReserveTable = (tableId: string, guestName: string, partySize: number) => {
    setState((s) => ({
      ...s,
      tables: s.tables.map((t) =>
        t.id === tableId ? { ...t, status: "Reserved", reservedFor: guestName, seats: Math.max(t.seats, partySize) } : t
      ),
    }));
    setSheetTableId(null);
    showToast(`Table ${tableId} reserved for ${guestName}!`);
  };

  const handleCancelReservation = (tableId: string) => {
    setState((s) => ({
      ...s,
      tables: s.tables.map((t) =>
        t.id === tableId ? { ...t, status: "Available", reservedFor: undefined } : t
      ),
    }));
    setSheetTableId(null);
    showToast(`Reservation for Table ${tableId} cancelled.`);
  };

  const handleClearTable = (tableId: string) => {
    setState((s) => ({
      ...s,
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, status: "Available", orderId: undefined, reservedFor: undefined } : t)),
    }));
    setSheetTableId(null);
    showToast(`Table ${tableId} is now Available.`);
  };

  const handleQuickAddItem = (menuItemId: string) => {
    const mi = getMenuItem(menuItemId);
    const existing = state.orderItems.find((i) => i.menuItemId === menuItemId);
    let updatedItems: OrderItem[];
    if (existing) {
      updatedItems = state.orderItems.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updatedItems = [...state.orderItems, { menuItemId, quantity: 1 }];
    }

    setState((s) => {
      const ordId = s.orderId;
      const updatedOrders = ordId && s.orders[ordId]
        ? {
            ...s.orders,
            [ordId]: {
              ...s.orders[ordId],
              items: updatedItems,
            },
          }
        : s.orders;
      return {
        ...s,
        orderItems: updatedItems,
        orders: updatedOrders,
      };
    });

    showToast(`Added +1 ${mi.name} to Table ${state.selectedTableId}`);
  };

  const handleConfirmOrder = () => {
    const id = state.orderId || `ORD-${orderIdCounter.current++}`;
    const existingOrder = state.orderId ? state.orders[state.orderId] : undefined;
    const isAdding = !!existingOrder;

    const newOrder: OrderRecord = {
      orderId: id,
      tableId: state.selectedTableId!,
      items: state.orderItems,
      createdAt: existingOrder?.createdAt || new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }),
      status: existingOrder?.status || "Occupied",
    };

    setState((s) => ({
      ...s,
      orderId: id,
      orders: { ...s.orders, [id]: newOrder },
      tables: s.tables.map((t) => (t.id === s.selectedTableId ? { ...t, status: (existingOrder?.status || "Occupied"), orderId: id } : t)),
    }));
    setScreen("order-confirm");
    showToast(isAdding ? `Order ${id} updated with extra items!` : `Order ${id} confirmed for Table ${state.selectedTableId}!`);
  };

  const handleMarkServed = () => {
    if (state.selectedTableId) {
      updateTableStatus(state.selectedTableId, "Food Served");
      showToast(`Food marked as served on Table ${state.selectedTableId}!`);
    }
  };

  const handleRequestCheckout = () => {
    if (state.selectedTableId) {
      updateTableStatus(state.selectedTableId, "Checkout Requested");
      setScreen("checkout");
    }
  };

  const handleCapture = () => {
    if (state.selectedTableId) {
      updateTableStatus(state.selectedTableId, "Analysis in Progress");
      setScreen("analyzing");
    }
  };

  const handleAnalysisDone = () => {
    const items = state.orderItems.length > 0 ? state.orderItems : [
      { menuItemId: "F001", quantity: 1 },
      { menuItemId: "F006", quantity: 1 }
    ];
    const results = simulateWasteAnalysis(items);
    const overallWaste = Math.round(results.reduce((s, r) => s + r.wastePct, 0) / results.length);
    const disc = calcDiscount(overallWaste, calcSubtotal(items));
    setState((s) => ({ ...s, orderItems: items, wasteResults: results, discountPct: disc }));
    setScreen("waste-result");
  };

  const handleCorrectWaste = (menuItemId: string, newPct: number) => {
    setState((s) => {
      const updated = s.wasteResults!.map((r) =>
        r.menuItemId === menuItemId
          ? { ...r, wastePct: newPct, remainingGrams: Math.round(r.servedGrams * newPct / 100), consumedGrams: r.servedGrams - Math.round(r.servedGrams * newPct / 100) }
          : r
      );
      const overall = Math.round(updated.reduce((sum, r) => sum + r.wastePct, 0) / updated.length);
      const disc = calcDiscount(overall, calcSubtotal(s.orderItems));
      return { ...s, wasteResults: updated, discountPct: disc };
    });
    showToast("Waste measurement updated");
  };

  const handleProceedToDiscount = () => {
    const overallWaste = Math.round(state.wasteResults!.reduce((s, r) => s + r.wastePct, 0) / state.wasteResults!.length);
    const disc = calcDiscount(overallWaste, calcSubtotal(state.orderItems));
    setState((s) => ({ ...s, discountPct: disc }));
    setScreen("discount");
  };

  const handlePayment = () => {
    if (state.selectedTableId) {
      updateTableStatus(state.selectedTableId, "Available");
      setState((s) => ({
        ...s,
        tables: s.tables.map((t) => (t.id === s.selectedTableId ? { ...t, orderId: undefined } : t)),
        paymentDone: true,
      }));
      setScreen("receipt");
      showToast("Payment processed successfully!");
    }
  };

  const handleDone = () => {
    setState((s) => ({
      ...s,
      selectedTableId: null,
      orderItems: [],
      orderId: null,
      wasteResults: null,
      discountPct: 0,
      paymentDone: false,
    }));
    setScreen("table-dashboard");
  };

  const sheetTable = state.tables.find((t) => t.id === sheetTableId);
  const currentTableOrder = sheetTable?.orderId
    ? state.orders[sheetTable.orderId]
    : Object.values(state.orders).find((o) => o.tableId === sheetTable?.id && o.status !== "Available");

  return (
    <div className="h-screen overflow-hidden relative" style={{ fontFamily: "var(--font-body)" }}>
      {/* 1. Login Screen */}
      {screen === "login" && <LoginScreen onLogin={handleLogin} />}

      {/* 2. Table Dashboard & Sheet */}
      {screen === "table-dashboard" && (
        <>
          <TableDashboard
            tables={state.tables}
            user={state.user}
            onSelectTable={handleSelectTable}
            onOwnerDashboard={() => setScreen("owner-dashboard")}
            onLogout={() => { setState((s) => ({ ...s, user: null })); setScreen("login"); }}
          />
          {sheetTable && (
            <TableDetailModal
              table={sheetTable}
              order={currentTableOrder}
              onNewOrder={() => handleNewOrder(sheetTable.id)}
              onViewOrder={() => handleViewOrder(sheetTable.id)}
              onAddItems={() => handleAddMoreItems(sheetTable.id)}
              onStartCheckout={() => handleStartCheckoutFromModal(sheetTable.id)}
              onViewBill={() => handleViewBillFromModal(sheetTable.id)}
              onSeatGuest={() => handleSeatGuest(sheetTable.id)}
              onReserveTable={(guest, size) => handleReserveTable(sheetTable.id, guest, size)}
              onCancelReservation={() => handleCancelReservation(sheetTable.id)}
              onClearTable={() => handleClearTable(sheetTable.id)}
              onClose={() => setSheetTableId(null)}
            />
          )}
        </>
      )}

      {/* 3. Order Creation / Editing */}
      {screen === "order" && (
        selectedTable ? (
          <OrderScreen
            table={selectedTable}
            items={state.orderItems}
            menu={state.menu}
            onUpdateItems={(items) => setState((s) => ({ ...s, orderItems: items }))}
            onConfirm={handleConfirmOrder}
            onBack={() => {
              if (state.orderId) {
                setScreen("order-confirm");
              } else {
                updateTableStatus(selectedTable.id, "Available");
                setScreen("table-dashboard");
              }
            }}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 4. Order Confirmation & Kitchen Workflow */}
      {screen === "order-confirm" && (
        selectedTable && state.orderId ? (
          <OrderConfirmScreen
            table={selectedTable}
            items={state.orderItems}
            orderId={state.orderId}
            onMarkServed={handleMarkServed}
            onRequestCheckout={handleRequestCheckout}
            onAddExtraItems={() => setScreen("order")}
            onQuickAddItem={handleQuickAddItem}
            onBack={() => setScreen("table-dashboard")}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 5. Checkout & Photo Upload */}
      {screen === "checkout" && (
        selectedTable && state.orderId ? (
          <CheckoutScreen
            table={selectedTable}
            items={state.orderItems}
            orderId={state.orderId}
            onCapture={handleCapture}
            onBack={() => setScreen("order-confirm")}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 6. AI Waste Analysis Animation */}
      {screen === "analyzing" && <AnalysingScreen onDone={handleAnalysisDone} />}

      {/* 7. Waste Breakdown Results */}
      {screen === "waste-result" && (
        selectedTable && state.wasteResults ? (
          <WasteResultScreen
            items={state.orderItems}
            wasteResults={state.wasteResults}
            onCorrect={handleCorrectWaste}
            onProceed={handleProceedToDiscount}
            onBack={() => setScreen("checkout")}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 8. EcoPlate Reward & Discount Screen */}
      {screen === "discount" && (
        selectedTable && state.wasteResults ? (
          <DiscountScreen
            table={selectedTable}
            orderId={state.orderId || "ORD-1043"}
            items={state.orderItems}
            wasteResults={state.wasteResults}
            discountPct={state.discountPct}
            onPayment={handlePayment}
            onProceed={() => setScreen("bill")}
            onBack={() => setScreen("waste-result")}
            onShowToast={showToast}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 9. Final Bill */}
      {screen === "bill" && (
        selectedTable && state.orderId && state.wasteResults ? (
          <BillScreen
            table={selectedTable}
            items={state.orderItems}
            orderId={state.orderId}
            wasteResults={state.wasteResults}
            discountPct={state.discountPct}
            onPayment={handlePayment}
            onBack={() => setScreen("discount")}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 10. Official Receipt */}
      {screen === "receipt" && (
        selectedTable && state.orderId && state.wasteResults ? (
          <ReceiptScreen
            table={selectedTable}
            items={state.orderItems}
            orderId={state.orderId}
            wasteResults={state.wasteResults}
            discountPct={state.discountPct}
            onDone={handleDone}
            onShowToast={(msg) => showToast(msg)}
          />
        ) : (
          <FallbackScreen onBack={() => setScreen("table-dashboard")} />
        )
      )}

      {/* 11. Owner Analytics Dashboard */}
      {screen === "owner-dashboard" && (
        <OwnerDashboard
          onBack={() => setScreen(state.user?.role === "owner" ? "table-dashboard" : "login")}
          orders={state.orders}
          menu={state.menu}
          onAddItem={handleAddMenuItem}
          onUpdateItem={handleUpdateMenuItem}
          onDeleteItem={handleDeleteMenuItem}
          onShowToast={(msg) => showToast(msg)}
        />
      )}

      {/* Global Toast Feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

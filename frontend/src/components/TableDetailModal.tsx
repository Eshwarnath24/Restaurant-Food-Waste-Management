import React, { useState } from "react";
import {
  type Table,
  type TableStatus,
  type OrderRecord,
  getMenuItem,
  calcSubtotal,
} from "../data";

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
  const c = STATUS_COLOR[status] || { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

interface TableDetailModalProps {
  table: Table;
  order?: OrderRecord;
  onNewOrder: () => void;
  onViewOrder: () => void;
  onAddItems?: () => void;
  onStartCheckout?: () => void;
  onViewBill?: () => void;
  onSeatGuest?: () => void;
  onReserveTable?: (guestName: string, partySize: number) => void;
  onCancelReservation?: () => void;
  onClearTable?: () => void;
  onClose: () => void;
}

export function TableDetailModal({
  table,
  order,
  onNewOrder,
  onViewOrder,
  onAddItems,
  onStartCheckout,
  onViewBill,
  onSeatGuest,
  onReserveTable,
  onCancelReservation,
  onClearTable,
  onClose,
}: TableDetailModalProps) {
  const [isReserving, setIsReserving] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [partySize, setPartySize] = useState(table.seats);

  const subtotal = order ? calcSubtotal(order.items) : 0;
  const totalItems = order ? order.items.reduce((s, i) => s + i.quantity, 0) : 0;

  const handleReserveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    if (onReserveTable) {
      onReserveTable(guestName.trim(), partySize);
    }
    setIsReserving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-2xl border-t border-[#1e4d35]/15 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-[#e0d8d0] rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2
                className="text-2xl font-bold text-[#1a1a18]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Table {table.id}
              </h2>
              <span className="text-xs bg-[#f0e9de] text-[#6b6459] font-semibold px-2.5 py-1 rounded-full">
                👥 {table.seats} seats
              </span>
            </div>
            {order && (
              <p
                className="text-xs text-[#9b9088] mt-1 font-medium"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Order: {order.orderId} · Started at {order.createdAt}
              </p>
            )}
          </div>
          <StatusBadge status={table.status} />
        </div>

        {/* Reservation details if reserved */}
        {table.status === "Reserved" && table.reservedFor && !isReserving && (
          <div className="bg-[#f8f4ee] rounded-2xl p-4 mb-5 border border-[#1e4d35]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1e4d35] uppercase tracking-wider">
                Reserved Party
              </span>
              <span className="text-xs text-[#9b9088]">Expected now</span>
            </div>
            <p className="text-base font-bold text-[#1a1a18]">{table.reservedFor}</p>
            <p className="text-xs text-[#6b6459] mt-0.5">Party of {table.seats} guests</p>
          </div>
        )}

        {/* Active Order Summary Card if table has an active order */}
        {order && order.items.length > 0 && (
          <div className="bg-[#f8f4ee] rounded-2xl p-4 mb-5 border border-[#1e4d35]/10">
            <div className="flex items-center justify-between mb-3 border-b border-[#1e4d35]/10 pb-2">
              <span className="text-xs font-bold text-[#1e4d35] uppercase tracking-wider">
                Active Order ({totalItems} items)
              </span>
              <span className="text-sm font-bold text-[#1e4d35]">
                Subtotal: ₹{subtotal}
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {order.items.map((oi) => {
                const mi = getMenuItem(oi.menuItemId);
                return (
                  <div
                    key={oi.menuItemId}
                    className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-1.5 border border-[#1e4d35]/8"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{mi.emoji}</span>
                      <span className="font-semibold text-[#1a1a18]">{mi.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#9b9088]">×{oi.quantity}</span>
                      <span className="font-bold text-[#1e4d35]">
                        ₹{mi.price * oi.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inline Reservation Form */}
        {isReserving ? (
          <form onSubmit={handleReserveSubmit} className="bg-[#f8f4ee] rounded-2xl p-4 mb-4 border border-[#1e4d35]/15">
            <h3 className="text-base font-bold text-[#1a1a18] mb-3">Reserve Table {table.id}</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#6b6459] block mb-1">Guest / Family Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verma Family"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-white border border-[#1e4d35]/20 rounded-xl px-3.5 py-2 text-sm text-[#1a1a18] focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b6459] block mb-1">Number of Guests</label>
                <input
                  type="number"
                  min={1}
                  max={table.seats + 2}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full bg-white border border-[#1e4d35]/20 rounded-xl px-3.5 py-2 text-sm text-[#1a1a18] focus:outline-none focus:ring-2 focus:ring-[#1e4d35]/30"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#1e4d35] text-white font-semibold py-2.5 rounded-full text-sm hover:bg-[#2d6b4a] transition-colors"
              >
                Confirm Reservation
              </button>
              <button
                type="button"
                onClick={() => setIsReserving(false)}
                className="px-4 py-2.5 text-sm font-semibold text-[#6b6459] hover:bg-white rounded-full transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          /* Contextual Action Buttons */
          <div className="flex flex-col gap-2.5">
            {/* Table is Available */}
            {table.status === "Available" && (
              <>
                <button
                  onClick={onNewOrder}
                  className="w-full bg-[#1e4d35] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#2d6b4a] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
                >
                  <span>➕</span> Create New Order
                </button>
                <button
                  onClick={() => setIsReserving(true)}
                  className="w-full border border-[#1e4d35]/30 text-[#1e4d35] py-3 px-6 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📅</span> Reserve This Table
                </button>
              </>
            )}

            {/* Table is Reserved */}
            {table.status === "Reserved" && (
              <>
                <button
                  onClick={onSeatGuest || onNewOrder}
                  className="w-full bg-[#1e4d35] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#2d6b4a] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>👤</span> Seat Guest & Start Order
                </button>
                {onCancelReservation && (
                  <button
                    onClick={onCancelReservation}
                    className="w-full border border-red-200 text-red-700 bg-red-50/50 py-2.5 px-6 rounded-full font-semibold text-sm hover:bg-red-50 transition-colors"
                  >
                    Cancel Reservation
                  </button>
                )}
              </>
            )}

            {/* Table is Occupied or Ordering */}
            {(table.status === "Occupied" || table.status === "Ordering") && (
              <>
                <button
                  onClick={onViewOrder}
                  className="w-full bg-[#1e4d35] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#2d6b4a] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>📋</span> View Current Order Details
                </button>
                {onAddItems && (
                  <button
                    onClick={onAddItems}
                    className="w-full border border-[#1e4d35]/30 text-[#1e4d35] py-2.5 px-6 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>➕</span> Add More Items to Order
                  </button>
                )}
                {onStartCheckout && (
                  <button
                    onClick={onStartCheckout}
                    className="w-full bg-[#d4813a] text-white py-3 px-6 rounded-full font-bold text-sm hover:bg-[#c07030] transition-colors flex items-center justify-center gap-2"
                  >
                    <span>💳</span> Proceed to Checkout
                  </button>
                )}
              </>
            )}

            {/* Table has Food Served */}
            {table.status === "Food Served" && (
              <>
                <button
                  onClick={onStartCheckout || onViewOrder}
                  className="w-full bg-[#d4813a] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#c07030] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>📸</span> Start Food Waste Checkout
                </button>
                <button
                  onClick={onViewOrder}
                  className="w-full border border-[#1e4d35]/30 text-[#1e4d35] py-2.5 px-6 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📋</span> View Served Items
                </button>
              </>
            )}

            {/* Table is Checkout Requested */}
            {table.status === "Checkout Requested" && (
              <>
                <button
                  onClick={onStartCheckout || onViewOrder}
                  className="w-full bg-[#1e4d35] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#2d6b4a] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>📸</span> Capture Remaining Food Photo
                </button>
                <button
                  onClick={onViewOrder}
                  className="w-full border border-[#1e4d35]/30 text-[#1e4d35] py-2.5 px-6 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📋</span> View Order Summary
                </button>
              </>
            )}

            {/* Table has Analysis in Progress or Bill Ready */}
            {(table.status === "Analysis in Progress" || table.status === "Bill Ready") && (
              <>
                <button
                  onClick={onViewBill || onViewOrder}
                  className="w-full bg-[#1e4d35] text-white py-3.5 px-6 rounded-full font-bold text-base hover:bg-[#2d6b4a] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>💳</span> View Final Bill & Discount
                </button>
                <button
                  onClick={onViewOrder}
                  className="w-full border border-[#1e4d35]/30 text-[#1e4d35] py-2.5 px-6 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📋</span> View Order Breakdown
                </button>
              </>
            )}

            {/* Free/Reset Table Option if needed */}
            {onClearTable && table.status !== "Available" && (
              <button
                onClick={onClearTable}
                className="w-full text-xs text-[#9b9088] hover:text-red-700 py-1 transition-colors font-medium mt-1"
              >
                Clear / Free Table {table.id}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full text-[#6b6459] hover:bg-[#f0e9de] py-2.5 rounded-full font-semibold text-sm transition-colors mt-1"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

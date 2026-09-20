import React from "react";
import { type OrderRecord, type MenuItem, getMenuItem, calcSubtotal } from "../data";

// ── Order Detail Modal ────────────────────────────────────────────────────────
interface OrderDetailModalProps {
  order: OrderRecord;
  onClose: () => void;
  onPrint?: () => void;
}

export function OrderDetailModal({ order, onClose, onPrint }: OrderDetailModalProps) {
  const subtotal = calcSubtotal(order.items);
  const discountPct = order.discountPct ?? 0;
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const finalAmt = +(subtotal - discountAmt).toFixed(2);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#1e4d35]/15 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex items-center justify-between mb-4 border-b border-[#1e4d35]/10 pb-3">
          <div>
            <span className="text-xs text-[#9b9088] font-mono">{order.orderId}</span>
            <h2 className="text-xl font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
              Table {order.tableId} Order Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0e9de] text-[#1a1a18] font-bold flex items-center justify-center hover:bg-[#1e4d35] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Order Status & Time */}
        <div className="flex items-center justify-between text-xs bg-[#f8f4ee] p-3 rounded-xl mb-4">
          <span className="text-[#6b6459]">Created at {order.createdAt}</span>
          <span className="font-semibold text-[#1e4d35] bg-white px-2.5 py-0.5 rounded-full border border-[#1e4d35]/10">
            {order.status}
          </span>
        </div>

        {/* Items List */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-bold text-[#6b6459] uppercase tracking-wider">Ordered Items</p>
          {order.items.map((oi) => {
            const mi = getMenuItem(oi.menuItemId);
            return (
              <div
                key={oi.menuItemId}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{mi.emoji}</span>
                  <span className="font-semibold text-[#1a1a18]">{mi.name}</span>
                  <span className="text-xs text-[#9b9088]">×{oi.quantity}</span>
                </div>
                <span className="font-bold text-[#1a1a18]">₹{mi.price * oi.quantity}</span>
              </div>
            );
          })}
        </div>

        {/* Financial Summary */}
        <div className="bg-[#f8f4ee] rounded-2xl p-4 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-[#6b6459]">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#5da86b] font-medium">
            <span>EcoPlate Discount ({discountPct}%)</span>
            <span>−₹{discountAmt}</span>
          </div>
          <div className="border-t border-[#1e4d35]/10 pt-2 flex justify-between font-bold text-base text-[#1e4d35]">
            <span>Total Amount</span>
            <span>₹{finalAmt}</span>
          </div>
        </div>

        {/* Waste breakdown if available */}
        {order.wasteResults && order.wasteResults.length > 0 && (
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-[#2d6b4a] uppercase tracking-wider mb-2">
              🌿 Food Waste Performance
            </p>
            <div className="space-y-1.5">
              {order.wasteResults.map((wr) => {
                const mi = getMenuItem(wr.menuItemId);
                return (
                  <div key={wr.menuItemId} className="flex justify-between text-xs">
                    <span className="text-[#1a1a18]">
                      {mi.emoji} {mi.name}
                    </span>
                    <span className="font-bold text-[#2d6b4a]">{wr.wastePct}% wasted</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex-1 border border-[#1e4d35]/30 text-[#1e4d35] py-2.5 rounded-full font-semibold text-sm hover:bg-[#1e4d35]/5 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🖨️</span> Print Order
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-[#1e4d35] text-white py-2.5 rounded-full font-semibold text-sm hover:bg-[#2d6b4a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dish Detail Modal ─────────────────────────────────────────────────────────
interface DishDetailModalProps {
  dish: { name: string; orders: number; avgWaste: number };
  onClose: () => void;
}

export function DishDetailModal({ dish, onClose }: DishDetailModalProps) {
  const getRecommendation = (waste: number) => {
    if (waste > 15) {
      return {
        level: "High Wastage — Immediate Action Recommended",
        badge: "bg-red-100 text-red-700",
        tips: [
          "Reduce standard portion weight by 15-20% to curb plate returns.",
          "Introduce a 'Light / Half Portion' option for customers with smaller appetites.",
          "Review recipe seasoning & accompaniment feedback with the head chef.",
        ],
      };
    }
    if (waste > 8) {
      return {
        level: "Moderate Wastage — Keep Monitoring",
        badge: "bg-amber-100 text-amber-700",
        tips: [
          "Side garnish or excess rice/bread accounted for 40% of leftover mass.",
          "Train wait staff to ask guests about portion preferences when ordering.",
        ],
      };
    }
    return {
      level: "Optimal Consumption — Excellent Performance",
      badge: "bg-emerald-100 text-emerald-700",
      tips: [
        "Consistently finished with over 93% consumption rate.",
        "Portion sizing and ingredient formulation are well matched with guest preferences.",
      ],
    };
  };

  const rec = getRecommendation(dish.avgWaste);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#1e4d35]/15 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex items-center justify-between mb-4 border-b border-[#1e4d35]/10 pb-3">
          <div>
            <p className="text-xs text-[#9b9088] uppercase tracking-wider font-semibold">Dish Waste Analytics</p>
            <h2 className="text-xl font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
              {dish.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0e9de] text-[#1a1a18] font-bold flex items-center justify-center hover:bg-[#1e4d35] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#f8f4ee] p-3 rounded-2xl text-center">
            <p className="text-xs text-[#9b9088]">Avg Waste</p>
            <p className="text-xl font-bold text-[#1e4d35]">{dish.avgWaste}%</p>
          </div>
          <div className="bg-[#f8f4ee] p-3 rounded-2xl text-center">
            <p className="text-xs text-[#9b9088]">Orders</p>
            <p className="text-xl font-bold text-[#1a1a18]">{dish.orders}</p>
          </div>
          <div className="bg-[#f8f4ee] p-3 rounded-2xl text-center">
            <p className="text-xs text-[#9b9088]">Eaten</p>
            <p className="text-xl font-bold text-[#5da86b]">{100 - dish.avgWaste}%</p>
          </div>
        </div>

        {/* Recommendation Box */}
        <div className="bg-[#f8f4ee] rounded-2xl p-4 mb-4 border border-[#1e4d35]/10">
          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 ${rec.badge}`}>
            {rec.level}
          </span>
          <p className="text-xs font-bold text-[#6b6459] mb-2 uppercase tracking-wide">
            AI Kitchen Recommendations:
          </p>
          <ul className="space-y-1.5 text-xs text-[#1a1a18]">
            {rec.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#1e4d35] font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#1e4d35] text-white py-2.5 rounded-full font-semibold text-sm hover:bg-[#2d6b4a] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Exception Detail Modal ────────────────────────────────────────────────────
interface ExceptionDetailModalProps {
  exception: { label: string; count: number; color: string } | null;
  onClose: () => void;
}

export function ExceptionDetailModal({ exception, onClose }: ExceptionDetailModalProps) {
  if (!exception) return null;

  const getLogs = (label: string) => {
    switch (label) {
      case "Low Confidence Analysis":
        return [
          { time: "19:12", table: "T08", detail: "Confidence score 78% on Dal Tadka plate coverage." },
          { time: "18:40", table: "T02", detail: "Confidence score 81% due to bowl shadow reflections." },
          { time: "17:55", table: "T04", detail: "Confidence score 79% on mixed rice plate." },
        ];
      case "Photo Quality Issues":
        return [
          { time: "19:05", table: "T08", detail: "Motion blur detected — prompted waiter to retake." },
          { time: "18:15", table: "T01", detail: "Extreme low lighting — flash automatically advised." },
        ];
      case "Manual Corrections":
        return [
          { time: "19:30", table: "T02", detail: "Waiter corrected waste percentage from 18% to 12%." },
          { time: "18:50", table: "T04", detail: "Waiter adjusted Biryani waste from 10% to 5%." },
          { time: "18:22", table: "T07", detail: "Customer consumed gravy; waiter updated to 0%." },
          { time: "17:45", table: "T09", detail: "Bone discard excluded from waste calculation." },
          { time: "17:10", table: "T11", detail: "Dessert shared across tables; corrected manually." },
        ];
      default:
        return [
          { time: "18:35", table: "T06", detail: "UPI QR timeout — re-attempted and succeeded." },
        ];
    }
  };

  const logs = getLogs(exception.label);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#1e4d35]/15 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex items-center justify-between mb-4 border-b border-[#1e4d35]/10 pb-3">
          <div>
            <p className="text-xs text-[#9b9088] uppercase tracking-wider font-semibold">Exception Centre Log</p>
            <h2 className="text-lg font-bold text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
              {exception.label}
            </h2>
          </div>
          <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${exception.color}`}>
            {exception.count} events today
          </span>
        </div>

        <div className="space-y-2 mb-5">
          {logs.map((log, i) => (
            <div key={i} className="bg-[#f8f4ee] p-3 rounded-xl border border-[#1e4d35]/8 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[#1e4d35]">Table {log.table}</span>
                <span className="text-[#9b9088] font-mono">{log.time}</span>
              </div>
              <p className="text-[#6b6459]">{log.detail}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#1e4d35] text-white py-2.5 rounded-full font-semibold text-sm hover:bg-[#2d6b4a] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

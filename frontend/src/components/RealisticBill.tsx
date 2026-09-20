import React from "react";
import { type Table, type OrderItem, type WasteResult, getMenuItem, calcSubtotal } from "../data";

interface RealisticBillProps {
  table: Table;
  orderId: string;
  items: OrderItem[];
  wasteResults: WasteResult[];
  discountPct: number;
  onPayment?: () => void;
  onPrint?: () => void;
}

export function RealisticBill({
  table,
  orderId,
  items,
  wasteResults,
  discountPct,
  onPayment,
  onPrint,
}: RealisticBillProps) {
  const subtotal = calcSubtotal(items);
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const cgst = +(subtotal * 0.025).toFixed(2);
  const sgst = +(subtotal * 0.025).toFixed(2);
  const netPayable = +(subtotal + cgst + sgst - discountAmt).toFixed(2);

  const overallWaste = Math.round(
    wasteResults.reduce((s, r) => s + r.wastePct, 0) / (wasteResults.length || 1)
  );

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full max-w-md mx-auto print:max-w-none print:shadow-none">
      {/* Receipt Paper Card */}
      <div
        className="bg-[#fefcf8] text-[#24211d] rounded-2xl shadow-xl border border-[#e4dbcc] p-6 relative overflow-hidden"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Top Serrated Edge (Receipt Paper Cut) */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#f8f4ee] flex space-x-1 justify-between px-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="w-2 h-2 bg-[#e4dbcc] rounded-full -translate-y-1 block" />
          ))}
        </div>

        {/* Restaurant Header */}
        <div className="text-center pt-2 pb-3 border-b border-dashed border-gray-400">
          <div className="text-2xl font-bold tracking-wider text-[#1a1a18]" style={{ fontFamily: "var(--font-display)" }}>
            CHENNAI SPICES
          </div>
          <p className="text-xs uppercase tracking-wider text-[#6b6459] font-sans font-semibold mt-0.5">
            Authentic Indian Cuisine & Eco Kitchen
          </p>
          <p className="text-[11px] text-[#78716c] font-mono mt-1">
            11 Hidden Creek Dr NW, Unit 206, Calgary, AB T3A 6L2
          </p>
          <p className="text-[10px] text-[#78716c] font-mono">
            Ph: (403) 457-6055 · GST # 82451 9802 RT0001
          </p>
          <p className="text-[10px] text-[#1e4d35] font-mono font-semibold">
            chennaispices.ca · Calgary, Alberta, Canada
          </p>
          <div className="inline-block bg-[#1e4d35]/10 text-[#1e4d35] font-sans text-[11px] font-bold px-3 py-0.5 rounded-full mt-1.5 border border-[#1e4d35]/20">
            TAX INVOICE · FINAL BILL
          </div>
        </div>

        {/* Metadata section */}
        <div className="py-2.5 border-b border-dashed border-gray-400 text-xs leading-relaxed">
          <div className="flex justify-between">
            <span>Bill No: <strong className="font-bold">INV-{orderId.replace("ORD-", "")}</strong></span>
            <span>Date: <strong>{dateStr}</strong></span>
          </div>
          <div className="flex justify-between">
            <span>Table: <strong className="font-bold text-[#1e4d35]">{table.id}</strong> ({table.seats} Seats)</span>
            <span>Time: <strong>{timeStr}</strong></span>
          </div>
          <div className="flex justify-between">
            <span>Server: <strong>Rahul (#42)</strong></span>
            <span>Mode: <strong>Dine-In</strong></span>
          </div>
        </div>

        {/* Itemized Table Header */}
        <div className="pt-2.5 pb-1 text-xs font-bold border-b border-gray-400 flex justify-between">
          <span className="w-1/2">ITEM</span>
          <span className="w-12 text-center">QTY</span>
          <span className="w-16 text-right">RATE</span>
          <span className="w-16 text-right">AMT (₹)</span>
        </div>

        {/* Itemized Rows */}
        <div className="py-2 space-y-1.5 text-xs border-b border-dashed border-gray-400">
          {items.map((oi) => {
            const mi = getMenuItem(oi.menuItemId);
            const lineTotal = (mi.price * oi.quantity).toFixed(2);
            return (
              <div key={oi.menuItemId} className="flex justify-between items-start">
                <span className="w-1/2 font-sans font-medium text-[#1a1a18] truncate pr-1">
                  {mi.emoji} {mi.name}
                </span>
                <span className="w-12 text-center">{oi.quantity}</span>
                <span className="w-16 text-right">{mi.price.toFixed(2)}</span>
                <span className="w-16 text-right font-bold">{lineTotal}</span>
              </div>
            );
          })}
        </div>

        {/* Summary Breakdown */}
        <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-gray-400">
          <div className="flex justify-between">
            <span className="text-[#6b6459]">Subtotal ({totalQty} items)</span>
            <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#78716c]">
            <span>Alberta GST @ 5%</span>
            <span>+₹{(cgst + sgst).toFixed(2)}</span>
          </div>

          {/* EcoPlate Discount Highlight */}
          <div className="bg-[#1e4d35]/10 -mx-2 px-2 py-1.5 rounded-lg border border-[#1e4d35]/25 my-1">
            <div className="flex justify-between text-[#1e4d35] font-bold text-xs">
              <span>🌿 EcoPlate Reward ({discountPct}%)</span>
              <span>−₹{discountAmt}</span>
            </div>
            <div className="text-[10px] text-[#2d6b4a] flex justify-between mt-0.5">
              <span>Plate Waste: {overallWaste}%</span>
              <span className="font-semibold">Zero-Waste Saver</span>
            </div>
          </div>
        </div>

        {/* Total Payable Box */}
        <div className="py-3 border-b-2 border-black">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-black tracking-wider uppercase">NET AMOUNT:</span>
            <span className="text-2xl font-black text-[#1e4d35]" style={{ fontFamily: "var(--font-display)" }}>
              ₹{netPayable}
            </span>
          </div>
          <p className="text-[10px] text-[#78716c] italic mt-0.5 text-right font-sans">
            (Includes 5% Canadian GST & Eco Discount)
          </p>
        </div>

        {/* Payment & Contactless Section */}
        <div className="py-3.5 border-b border-dashed border-gray-400 flex items-center gap-3">
          <div className="w-20 h-20 bg-white border border-gray-300 rounded-lg p-1 flex-shrink-0 flex flex-col items-center justify-center">
            {/* Authentic SVG QR Code Representation */}
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="#1a1a18">
              <rect x="5" y="5" width="28" height="28" fill="#1e4d35" rx="3" />
              <rect x="11" y="11" width="16" height="16" fill="#fff" rx="2" />
              <rect x="15" y="15" width="8" height="8" fill="#1e4d35" />

              <rect x="67" y="5" width="28" height="28" fill="#1e4d35" rx="3" />
              <rect x="73" y="11" width="16" height="16" fill="#fff" rx="2" />
              <rect x="77" y="15" width="8" height="8" fill="#1e4d35" />

              <rect x="5" y="67" width="28" height="28" fill="#1e4d35" rx="3" />
              <rect x="11" y="73" width="16" height="16" fill="#fff" rx="2" />
              <rect x="15" y="77" width="8" height="8" fill="#1e4d35" />

              <rect x="40" y="8" width="6" height="6" />
              <rect x="52" y="8" width="8" height="6" />
              <rect x="42" y="20" width="6" height="12" />
              <rect x="54" y="22" width="6" height="6" />
              <rect x="8" y="42" width="12" height="6" />
              <rect x="26" y="42" width="10" height="6" />
              <rect x="42" y="42" width="16" height="16" fill="#1e4d35" />
              <rect x="64" y="42" width="8" height="6" />
              <rect x="78" y="42" width="14" height="6" />
              <rect x="8" y="54" width="6" height="8" />
              <rect x="22" y="54" width="12" height="6" />
              <rect x="68" y="54" width="10" height="10" />
              <rect x="84" y="54" width="8" height="8" />
              <rect x="40" y="66" width="6" height="12" />
              <rect x="52" y="66" width="8" height="6" />
              <rect x="64" y="72" width="14" height="6" />
              <rect x="84" y="70" width="8" height="12" />
              <rect x="40" y="84" width="16" height="8" />
              <rect x="62" y="84" width="8" height="8" />
              <rect x="76" y="84" width="16" height="8" />
            </svg>
          </div>
          <div className="flex-1 font-sans text-xs">
            <p className="font-bold text-[#1a1a18]">Scan / Tap to Pay</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="bg-[#f0e9de] text-[#1e4d35] font-bold text-[10px] px-1.5 py-0.5 rounded">Interac</span>
              <span className="bg-[#f0e9de] text-[#1e4d35] font-bold text-[10px] px-1.5 py-0.5 rounded">Apple Pay</span>
              <span className="bg-[#f0e9de] text-[#1e4d35] font-bold text-[10px] px-1.5 py-0.5 rounded">GPay</span>
            </div>
            <p className="text-[10px] text-[#78716c] font-mono mt-1">
              E-Transfer: pay@chennaispices.ca
            </p>
          </div>
        </div>

        {/* Eco Badge & Footer */}
        <div className="pt-3 text-center text-xs space-y-1">
          <p className="font-bold text-[#1e4d35] font-sans">
            🌱 ECOPLATE VERIFIED ZERO-WASTE DINING
          </p>
          <p className="text-[11px] text-[#78716c]">
            Prevented 450g of food waste in Calgary, Canada today.
          </p>
          <p className="text-[10px] text-[#9b9088] tracking-widest mt-2 font-mono">
            * * * THANK YOU · CHENNAI SPICES · VISIT AGAIN * * *
          </p>

          {/* Barcode representation */}
          <div className="pt-2 flex justify-center items-center gap-1 opacity-60">
            <div className="h-6 w-1 bg-black" />
            <div className="h-6 w-0.5 bg-black" />
            <div className="h-6 w-2 bg-black" />
            <div className="h-6 w-0.5 bg-black" />
            <div className="h-6 w-1.5 bg-black" />
            <div className="h-6 w-1 bg-black" />
            <div className="h-6 w-2.5 bg-black" />
            <div className="h-6 w-0.5 bg-black" />
            <div className="h-6 w-1 bg-black" />
            <div className="h-6 w-2 bg-black" />
            <div className="h-6 w-1 bg-black" />
            <div className="h-6 w-0.5 bg-black" />
            <div className="h-6 w-2 bg-black" />
            <div className="h-6 w-1 bg-black" />
          </div>
          <p className="text-[9px] text-[#9b9088] font-mono">INV-2026-1043-TX</p>
        </div>

        {/* Bottom Serrated Edge (Receipt Paper Cut) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#f8f4ee] flex space-x-1 justify-between px-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="w-2 h-2 bg-[#e4dbcc] rounded-full translate-y-1 block" />
          ))}
        </div>
      </div>

      {/* Bill Action Bar */}
      <div className="mt-3 flex gap-2 print:hidden">
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex-1 bg-white border border-[#1e4d35]/20 hover:bg-[#f0e9de] text-[#1e4d35] font-semibold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>🖨️</span> Print Bill Receipt
          </button>
        )}
        {onPayment && (
          <button
            onClick={onPayment}
            className="flex-1 bg-[#1e4d35] hover:bg-[#2d6b4a] text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>💳</span> Settle Bill (₹{netPayable})
          </button>
        )}
      </div>
    </div>
  );
}

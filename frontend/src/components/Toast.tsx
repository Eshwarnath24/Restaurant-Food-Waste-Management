import React, { useEffect } from "react";

export interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "info" | "warning";
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const bg =
    toast.type === "warning"
      ? "bg-amber-800 text-white"
      : "bg-[#1e4d35] text-white";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-short">
      <div
        className={`${bg} px-5 py-3 rounded-full shadow-xl flex items-center gap-2.5 text-sm font-semibold border border-white/20`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <span>{toast.type === "warning" ? "⚠️" : "🍃"}</span>
        <span>{toast.text}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white/70 hover:text-white text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

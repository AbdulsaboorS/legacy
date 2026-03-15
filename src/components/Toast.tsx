"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

type ToastType = "success" | "info" | "error" | "copied";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    info: (msg: string) => void;
    error: (msg: string) => void;
    copied: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast("success", msg),
    info: (msg: string) => addToast("info", msg),
    error: (msg: string) => addToast("error", msg),
    copied: (msg: string) => addToast("copied", msg),
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success": return "✓";
      case "error": return "✕";
      case "copied": return "📋";
      default: return "ℹ";
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "rgba(34, 197, 94, 0.15)",
          border: "rgba(34, 197, 94, 0.4)",
          iconColor: "#22C55E",
        };
      case "error":
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          border: "rgba(239, 68, 68, 0.4)",
          iconColor: "#EF4444",
        };
      case "copied":
        return {
          bg: "rgba(217, 119, 6, 0.12)",
          border: "rgba(217, 119, 6, 0.35)",
          iconColor: "var(--accent)",
        };
      default:
        return {
          bg: "rgba(217, 119, 6, 0.12)",
          border: "rgba(217, 119, 6, 0.35)",
          iconColor: "var(--accent)",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-24 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const colors = getColors(t.type);
          return (
            <button
              key={t.id}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium animate-slide-up max-w-xs w-full text-left"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: "var(--foreground)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  color: colors.iconColor,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {getIcon(t.type)}
              </span>
              <span className="flex-1">{t.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

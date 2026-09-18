/**
 * Toasts. Deliberately not animated with framer-motion: motion in this
 * application is spent on three state changes only (see styles/index.css and
 * the brief), and a toast sliding in is not one of them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
  /** Milliseconds on screen. Errors default to longer than successes. */
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "message">> {
  id: number;
  message?: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { ring: string; icon: string; Icon: typeof Info }> = {
  success: {
    ring: "border-status-received/30",
    icon: "bg-status-received-bg text-status-received",
    Icon: CheckCircle2,
  },
  error: {
    ring: "border-status-lost/30",
    icon: "bg-status-lost-bg text-status-lost",
    Icon: AlertCircle,
  },
  info: {
    ring: "border-border",
    icon: "bg-surface-overlay text-text-muted",
    Icon: Info,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ tone = "info", title, message, durationMs }: ToastInput) => {
      const id = nextId.current++;
      const ttl = durationMs ?? (tone === "error" ? 8000 : 4500);

      setToasts((current) => [...current, { id, tone, title, message, durationMs: ttl }]);

      const timer = window.setTimeout(() => dismiss(id), ttl);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Clear outstanding timers if the provider ever unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-24 sm:items-end sm:pb-6 sm:pr-6 lg:pb-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const { ring, icon, Icon } = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={[
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-raised p-3.5 shadow-raised",
                ring,
              ].join(" ")}
            >
              <span
                className={["flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", icon].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-text-muted">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 rounded-md p-1 text-text-subtle transition-colors hover:bg-surface-overlay hover:text-text"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

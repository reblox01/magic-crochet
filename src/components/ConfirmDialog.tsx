import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  // Close on Escape
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#1c1917]/40 backdrop-blur-sm"
            onClick={handleCancel}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-[#1c1917]/10 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 text-[#1c1917]/30 hover:text-[#1c1917]/60 transition-colors"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-serif text-lg text-[#1c1917] pr-6">{state.title}</h3>
            <p className="text-sm text-[#1c1917]/50 mt-2 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors"
              >
                {state.cancelLabel || "Annuler"}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors active:scale-95 ${
                  state.danger
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-[#1c1917] text-white hover:bg-[#F506EA]"
                }`}
              >
                {state.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

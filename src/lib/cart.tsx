import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Product = {
  id: string;
  name: string;
  sub: string;
  description: string;
  materials: string;
  dimensions: string;
  price: number; // in MAD
  img: string;
  gallery?: string[];
  tag?: string;
};

export type CartItem = Product & { qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

const KEY = "mc_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* noop */
    }
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.price, 0),
      add: (p, qty = 1) =>
        setItems((cur) => {
          const ex = cur.find((c) => c.id === p.id);
          if (ex)
            return cur.map((c) => (c.id === p.id ? { ...c, qty: Math.min(99, c.qty + qty) } : c));
          return [...cur, { ...p, qty }];
        }),
      remove: (id) => setItems((cur) => cur.filter((c) => c.id !== id)),
      setQty: (id, qty) =>
        setItems((cur) =>
          cur
            .map((c) => (c.id === id ? { ...c, qty: Math.max(0, Math.min(99, qty)) } : c))
            .filter((c) => c.qty > 0),
        ),
      clear: () => setItems([]),
      open,
      setOpen,
    }),
    [items, open],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}

export function formatMAD(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " DH";
}

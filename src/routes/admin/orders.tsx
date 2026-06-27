import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  items: { id: string; name: string; price: number; qty: number }[] | null;
  notes: string | null;
  is_paid: boolean;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: "bg-amber-50 text-amber-700" },
  { value: "processing", label: "En cours", color: "bg-blue-50 text-blue-700" },
  { value: "completed", label: "Terminée", color: "bg-green-50 text-green-700" },
  { value: "cancelled", label: "Annulée", color: "bg-red-50 text-red-600" },
] as const;

async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AdminOrders() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchOrders,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("orders").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const filtered = filter === "all" ? orders : orders?.filter((o) => o.status === filter);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Commandes</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">{orders?.length ?? 0} commande(s) au total.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" count={orders?.length} />
        {STATUS_OPTIONS.map((s) => (
          <FilterBtn
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={s.label}
            count={orders?.filter((o) => o.status === s.value).length}
          />
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucune commande.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((order) => {
            const isOpen = expandedId === order.id;
            return (
              <div key={order.id} className="rounded-2xl bg-white border border-[#1c1917]/5 overflow-hidden">
                {/* Summary row — clickable */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-[#f3f0ec]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-[#1c1917]">{order.customer_name}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_OPTIONS.find((s) => s.value === order.status)?.color ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ?? order.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePaid.mutate({ id: order.id, is_paid: !order.is_paid }); }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          order.is_paid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {order.is_paid ? "Payée" : "Impayée"}
                      </button>
                    </div>
                    <p className="text-xs text-[#1c1917]/40">
                      {order.customer_email}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                      {" · "}
                      {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {order.notes && !isOpen && (
                      <p className="text-xs text-[#1c1917]/50 mt-2 line-clamp-1">{order.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-xl text-[#1c1917]">{Number(order.total_amount).toLocaleString("fr-FR")} DH</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <select
                        value={order.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                        className="text-xs border border-[#1c1917]/10 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#F506EA]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#1c1917]/30 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#1c1917]/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Client info */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Client</p>
                        <div className="space-y-1.5 text-sm">
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Nom :</span> {order.customer_name}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Email :</span> {order.customer_email}</p>
                          {order.customer_phone && (
                            <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Tél :</span> {order.customer_phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Produits</p>
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-2">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[#1c1917]/40 shrink-0">{item.qty}×</span>
                                  <span className="text-[#1c1917] truncate">{item.name}</span>
                                </div>
                                <span className="text-[#1c1917]/60 shrink-0 ml-2">{Number(item.price).toLocaleString("fr-FR")} DH</span>
                              </div>
                            ))}
                            <div className="border-t border-[#1c1917]/5 pt-2 flex justify-between text-sm font-medium">
                              <span className="text-[#1c1917]/50">Sous-total</span>
                              <span className="text-[#1c1917]">
                                {order.items.reduce((sum, it) => sum + it.price * it.qty, 0).toLocaleString("fr-FR")} DH
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#1c1917]/30 italic">Pas de produits</p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Détails</p>
                        <div className="space-y-1.5 text-sm">
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Commande :</span> #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Date :</span> {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Total :</span> <span className="font-serif text-lg">{Number(order.total_amount).toLocaleString("fr-FR")} DH</span></p>
                        </div>
                        {order.notes && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold mb-1">Notes</p>
                            <p className="text-sm text-[#1c1917]/70 bg-[#f3f0ec]/50 rounded-lg p-3">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-[#1c1917] text-white border-[#1c1917]"
          : "bg-white text-[#1c1917]/60 border-[#1c1917]/10 hover:border-[#F506EA]"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#1c1917]/30"}`}>{count}</span>
      )}
    </button>
  );
}

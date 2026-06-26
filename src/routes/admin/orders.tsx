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
  items: unknown;
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
          {filtered?.map((order) => (
            <div key={order.id} className="p-5 rounded-2xl bg-white border border-[#1c1917]/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-[#1c1917]">{order.customer_name}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_OPTIONS.find((s) => s.value === order.status)?.color ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ?? order.status}
                    </span>
                    <button
                      onClick={() => togglePaid.mutate({ id: order.id, is_paid: !order.is_paid })}
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
                  {order.notes && (
                    <p className="text-xs text-[#1c1917]/50 mt-2 line-clamp-2">{order.notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-serif text-xl text-[#1c1917]">{Number(order.total_amount).toLocaleString("fr-FR")} DH</p>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                    className="mt-2 text-xs border border-[#1c1917]/10 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#F506EA]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
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

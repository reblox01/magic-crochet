import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

async function fetchStats() {
  const [products, orders, reservations, contacts, reviews] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id, total_amount, status, is_paid"),
    supabase.from("reservations").select("id, seats, status, date"),
    supabase.from("contacts").select("id, status"),
    supabase.from("reviews").select("id, rating, is_visible"),
  ]);

  const totalRevenue = orders.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) ?? 0;
  const paidRevenue = orders.data?.filter((o) => o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) ?? 0;
  const pendingOrders = orders.data?.filter((o) => o.status === "pending").length ?? 0;
  const totalSeats = reservations.data?.reduce((sum, r) => sum + (r.seats || 0), 0) ?? 0;
  const upcomingReservations = reservations.data?.filter((r) => r.status === "pending" || r.status === "confirmed").length ?? 0;
  const unreadContacts = contacts.data?.filter((c) => c.status === "new").length ?? 0;
  const visibleReviews = reviews.data?.filter((r) => r.is_visible).length ?? 0;
  const avgRating = reviews.data?.length
    ? (reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length).toFixed(1)
    : "—";

  return {
    productCount: products.count ?? 0,
    orderCount: orders.data?.length ?? 0,
    totalRevenue,
    paidRevenue,
    pendingOrders,
    reservationCount: reservations.data?.length ?? 0,
    totalSeats,
    upcomingReservations,
    contactCount: contacts.data?.length ?? 0,
    unreadContacts,
    reviewCount: reviews.data?.length ?? 0,
    visibleReviews,
    avgRating,
  };
}

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Tableau de bord</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">Vue d'ensemble de votre activité.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse">
              <div className="h-3 w-20 bg-[#1c1917]/5 rounded mb-3" />
              <div className="h-8 w-16 bg-[#1c1917]/5 rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Revenue */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Revenus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Revenu total" value={`${stats.totalRevenue.toLocaleString("fr-FR")} DH`} color="text-[#1c1917]" />
              <StatCard label="Revenu encaissé" value={`${stats.paidRevenue.toLocaleString("fr-FR")} DH`} color="text-green-600" />
              <StatCard label="En attente" value={`${stats.pendingOrders}`} sub="commandes" color="text-amber-600" />
            </div>
          </div>

          {/* Activity */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Activité</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Produits" value={`${stats.productCount}`} sub="actifs" />
              <StatCard label="Réservations" value={`${stats.upcomingReservations}`} sub={`à venir · ${stats.totalSeats} places`} />
              <StatCard label="Contacts" value={`${stats.unreadContacts}`} sub={`non lus / ${stats.contactCount}`} highlight={stats.unreadContacts > 0} />
              <StatCard label="Avis" value={stats.avgRating} sub={`${stats.visibleReviews} visibles`} />
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Actions rapides</h2>
            <div className="flex flex-wrap gap-3">
              <QuickAction to="/admin/contacts" label="Voir les contacts" badge={stats.unreadContacts > 0 ? stats.unreadContacts : undefined} />
              <QuickAction to="/admin/orders" label="Gérer les commandes" badge={stats.pendingOrders > 0 ? stats.pendingOrders : undefined} />
              <QuickAction to="/admin/reservations" label="Voir les réservations" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = "text-[#1c1917]",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 rounded-2xl bg-white border transition-colors ${highlight ? "border-[#F506EA]/30 bg-[#F506EA]/5" : "border-[#1c1917]/5"}`}>
      <p className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-2">{label}</p>
      <p className={`font-serif text-3xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#1c1917]/40 mt-1">{sub}</p>}
    </div>
  );
}

function QuickAction({ to, label, badge }: { to: string; label: string; badge?: number }) {
  return (
    <a
      href={to}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#1c1917]/10 text-sm font-medium text-[#1c1917]/70 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors"
    >
      {label}
      {badge !== undefined && (
        <span className="size-5 rounded-full bg-[#F506EA] text-white text-[10px] font-bold grid place-items-center">
          {badge}
        </span>
      )}
    </a>
  );
}

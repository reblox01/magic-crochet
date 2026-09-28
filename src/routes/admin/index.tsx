import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

async function fetchStats() {
  const [products, orders, reservations, contacts, reviews] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id, total_amount, status, is_paid, created_at"),
    supabase.from("reservations").select("id, seats, status, date"),
    supabase.from("contacts").select("id, status"),
    supabase.from("reviews").select("id, rating, is_visible"),
  ]);

  const totalRevenue = orders.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) ?? 0;
  const paidRevenue =
    orders.data
      ?.filter((o) => o.is_paid)
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) ?? 0;
  const pendingOrders = orders.data?.filter((o) => o.status === "pending").length ?? 0;
  const totalSeats = reservations.data?.reduce((sum, r) => sum + (r.seats || 0), 0) ?? 0;
  const upcomingReservations =
    reservations.data?.filter((r) => r.status === "pending" || r.status === "confirmed").length ??
    0;
  const unreadContacts = contacts.data?.filter((c) => c.status === "new").length ?? 0;
  const visibleReviews = reviews.data?.filter((r) => r.is_visible).length ?? 0;
  const avgRating = reviews.data?.length
    ? (reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length).toFixed(1)
    : "—";

  // Revenus encaissés par semaine (12 dernières semaines, lundi en tête)
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const startOfWeek = (d: Date) => {
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  const currentWeek = startOfWeek(new Date());
  const firstWeekMs = currentWeek.getTime() - 11 * WEEK_MS;
  const revenueWeeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(firstWeekMs + i * WEEK_MS);
    return {
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      value: 0,
    };
  });
  for (const o of orders.data ?? []) {
    if (!o.is_paid || !o.created_at) continue;
    const idx = Math.round((startOfWeek(new Date(o.created_at)).getTime() - firstWeekMs) / WEEK_MS);
    if (idx >= 0 && idx < revenueWeeks.length) {
      revenueWeeks[idx].value += Number(o.total_amount) || 0;
    }
  }

  // Places réservées par date pour les prochains ateliers
  const today = new Date().toISOString().split("T")[0];
  const seatsByDate = new Map<string, { pending: number; confirmed: number }>();
  for (const r of reservations.data ?? []) {
    if (r.date < today || (r.status !== "pending" && r.status !== "confirmed")) continue;
    const entry = seatsByDate.get(r.date) ?? { pending: 0, confirmed: 0 };
    if (r.status === "confirmed") entry.confirmed += r.seats || 0;
    else entry.pending += r.seats || 0;
    seatsByDate.set(r.date, entry);
  }
  const seatBars = [...seatsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 7)
    .map(([date, seats]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
      }),
      ...seats,
    }));

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
    revenueWeeks,
    seatBars,
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
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse"
            >
              <div className="h-3 w-20 bg-[#1c1917]/5 rounded mb-3" />
              <div className="h-8 w-16 bg-[#1c1917]/5 rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Tendance */}
          <TrendSection stats={stats} />

          {/* Revenue */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Revenus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Revenu total"
                value={`${stats.totalRevenue.toLocaleString("fr-FR")} DH`}
                color="text-[#1c1917]"
              />
              <StatCard
                label="Revenu encaissé"
                value={`${stats.paidRevenue.toLocaleString("fr-FR")} DH`}
                color="text-green-600"
              />
              <StatCard
                label="En attente"
                value={`${stats.pendingOrders}`}
                sub="commandes"
                color="text-amber-600"
              />
            </div>
          </div>

          {/* Activity */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Activité</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Produits" value={`${stats.productCount}`} sub="actifs" />
              <StatCard
                label="Réservations"
                value={`${stats.upcomingReservations}`}
                sub={`à venir · ${stats.totalSeats} places`}
              />
              <StatCard
                label="Contacts"
                value={`${stats.unreadContacts}`}
                sub={`non lus / ${stats.contactCount}`}
                highlight={stats.unreadContacts > 0}
              />
              <StatCard
                label="Avis"
                value={stats.avgRating}
                sub={`${stats.visibleReviews} visibles`}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">
              Actions rapides
            </h2>
            <div className="flex flex-wrap gap-3">
              <QuickAction
                to="/admin/contacts"
                label="Voir les contacts"
                badge={stats.unreadContacts > 0 ? stats.unreadContacts : undefined}
              />
              <QuickAction
                to="/admin/orders"
                label="Gérer les commandes"
                badge={stats.pendingOrders > 0 ? stats.pendingOrders : undefined}
              />
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
    <div
      className={`p-6 rounded-2xl bg-white border transition-colors ${highlight ? "border-[#F506EA]/30 bg-[#F506EA]/5" : "border-[#1c1917]/5"}`}
    >
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

type Stats = Awaited<ReturnType<typeof fetchStats>>;

const revenueConfig = {
  value: { label: "Revenus encaissés", color: "var(--color-brand-primary)" },
} satisfies ChartConfig;

const seatConfig = {
  confirmed: { label: "Confirmées", color: "var(--color-brand-primary)" },
  pending: { label: "En attente", color: "var(--color-brand-clay)" },
} satisfies ChartConfig;

function TrendSection({ stats }: { stats: Stats }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs uppercase tracking-widest text-[#1c1917]/40 mb-4">Tendance</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenus — 12 dernières semaines */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-[#1c1917]/5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="text-sm font-medium text-[#1c1917]">Revenus encaissés</h3>
            <p className="text-xs text-[#1c1917]/40">12 dernières semaines</p>
          </div>
          <ChartContainer config={revenueConfig} className="h-52 w-full">
            <AreaChart data={stats.revenueWeeks} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1c191714" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                tick={{ fontSize: 10, fill: "#1c191766" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={46}
                tick={{ fontSize: 10, fill: "#1c191766" }}
                tickFormatter={(v) =>
                  Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <>
                        <span className="size-2.5 shrink-0 rounded-full bg-brand-primary" />
                        <span className="flex flex-1 flex-col gap-1">
                          <span className="text-[#1c1917]/50">
                            {revenueConfig[name as keyof typeof revenueConfig]?.label ?? name}
                          </span>
                          <span className="font-semibold tabular-nums text-[#1c1917]">
                            {Number(value).toLocaleString("fr-FR")}
                            <span className="font-medium text-[#1c1917]/60"> DH</span>
                          </span>
                        </span>
                      </>
                    )}
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#gradRevenue)"
                stroke="var(--color-brand-primary)"
                strokeWidth={2.5}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Places réservées — prochains ateliers */}
        <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-sm font-medium text-[#1c1917]">Prochains ateliers</h3>
            <p className="text-xs text-[#1c1917]/40">places réservées</p>
          </div>
          <div className="flex items-center gap-4 mb-4 text-[10px] text-[#1c1917]/50">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-primary" /> Confirmées
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-clay" /> En attente
            </span>
          </div>
          <ChartContainer config={seatConfig} className="h-48 w-full">
            <BarChart data={stats.seatBars} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1c191714" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval={0}
                tick={{ fontSize: 9, fill: "#1c191766" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={34}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#1c191766" }}
              />
              <ChartTooltip
                cursor={{ fill: "#1c19170a" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const seats = Number(value);
                      const confirmed = `${name}` === "confirmed";
                      return (
                        <>
                          <span
                            className={`size-2.5 shrink-0 rounded-full ${
                              confirmed ? "bg-brand-primary" : "bg-brand-clay"
                            }`}
                          />
                          <span className="flex flex-1 flex-col gap-1">
                            <span className="text-[#1c1917]/50">
                              {seatConfig[name as keyof typeof seatConfig]?.label ?? name}
                            </span>
                            <span className="font-semibold tabular-nums text-[#1c1917]">
                              {seats.toLocaleString("fr-FR")}
                              <span className="font-medium text-[#1c1917]/60">
                                {seats === 1 ? " place" : " places"}
                              </span>
                            </span>
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="pending" stackId="a" fill="var(--color-brand-clay)" />
              <Bar
                dataKey="confirmed"
                stackId="a"
                fill="var(--color-brand-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}

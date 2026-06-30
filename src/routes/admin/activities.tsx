import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Package, Users, Image, Star, ShoppingCart, MessageSquare, Calendar, FileText, Settings, User, Clock, Plus, Pencil, Trash2, Reply, ArrowRightLeft, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

export const Route = createFileRoute("/admin/activities")({
  component: AdminActivitiesPage,
});

interface ActivityLog {
  id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "Cree", icon: Plus, color: "text-green-500 bg-green-50" },
  update: { label: "Modifie", icon: Pencil, color: "text-blue-500 bg-blue-50" },
  delete: { label: "Supprime", icon: Trash2, color: "text-red-500 bg-red-50" },
  reply: { label: "Repondu", icon: Reply, color: "text-cyan-500 bg-cyan-50" },
  status_change: { label: "Statut", icon: ArrowRightLeft, color: "text-orange-500 bg-orange-50" },
  activate: { label: "Active", icon: Plus, color: "text-green-600 bg-green-50" },
  deactivate: { label: "Desactive", icon: Trash2, color: "text-orange-500 bg-orange-50" },
  login: { label: "Connexion", icon: User, color: "text-purple-500 bg-purple-50" },
  logout: { label: "Deconnexion", icon: User, color: "text-neutral-400 bg-neutral-50" },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: typeof Package }> = {
  product: { label: "Produit", icon: Package },
  partnership: { label: "Partenaire", icon: Users },
  gallery: { label: "Galerie", icon: Image },
  review: { label: "Avis", icon: Star },
  avis: { label: "Temoignage", icon: Star },
  order: { label: "Commande", icon: ShoppingCart },
  contact: { label: "Contact", icon: MessageSquare },
  reservation: { label: "Reservation", icon: Calendar },
  atelier: { label: "Atelier", icon: FileText },
  settings: { label: "Parametres", icon: Settings },
  user: { label: "Utilisateur", icon: User },
  profile: { label: "Profil", icon: User },
};

function AdminActivitiesPage() {
  const [filter, setFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as ActivityLog[];
    },
    refetchInterval: 30_000,
  });

  const filtered = activities.filter((a) => {
    if (filter !== "all" && a.entity_type !== filter) return false;
    if (dateFrom) {
      const activityDate = new Date(a.created_at);
      const fromDate = new Date(dateFrom + "T00:00:00");
      if (activityDate < fromDate) return false;
    }
    if (dateTo) {
      const activityDate = new Date(a.created_at);
      const toDate = new Date(dateTo + "T23:59:59");
      if (activityDate > toDate) return false;
    }
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, ActivityLog[]>>((acc, a) => {
    const date = new Date(a.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(a);
    return acc;
  }, {});

  const entityTypes = [...new Set(activities.map((a) => a.entity_type))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1c1917]">Activités récentes</h1>
          <p className="text-sm text-[#1c1917]/40 mt-1">
            {activities.length} evenement{activities.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker
            value={dateFrom || null}
            onChange={(v) => setDateFrom(v ?? "")}
            placeholder="Du..."
          />
          <span className="text-xs text-[#1c1917]/30">→</span>
          <DatePicker
            value={dateTo || null}
            onChange={(v) => setDateTo(v ?? "")}
            placeholder="Au..."
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] border border-[#1c1917]/10 rounded-xl px-4 py-2 text-sm bg-white text-[#1c1917]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {entityTypes.map((t) => (
                <SelectItem key={t} value={t}>{ENTITY_CONFIG[t]?.label || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(dateFrom || dateTo || filter !== "all") && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setFilter("all"); }}
              className="p-2 rounded-xl text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
              title="Réinitialiser les filtres"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-[#1c1917]/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#1c1917]/5 rounded-full w-1/3" />
                <div className="h-2 bg-[#1c1917]/5 rounded-full w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="w-10 h-10 text-[#1c1917]/10 mx-auto mb-3" />
          <p className="text-[#1c1917]/30 text-sm">Aucune activite enregistree</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-[#1c1917]/30 uppercase tracking-wider mb-3 px-1">{date}</h3>
              <div className="space-y-1">
                {items.map((a) => {
                  const actionCfg = ACTION_CONFIG[a.action] || ACTION_CONFIG.update;
                  const entityCfg = ENTITY_CONFIG[a.entity_type] || { label: a.entity_type, icon: Package };
                  const ActionIcon = actionCfg.icon;
                  const EntityIcon = entityCfg.icon;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1c1917]/[0.02] transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionCfg.color}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1c1917]">
                          <span className="font-medium">{actionCfg.label}</span>
                          <span className="text-[#1c1917]/40 mx-1">{entityCfg.label.toLowerCase()}</span>
                          {a.entity_name && (
                            <span className="font-medium"> {a.entity_name}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-[#1c1917]/30">{a.user_email ?? "Systeme"}</span>
                          <span className="text-[11px] text-[#1c1917]/15">-</span>
                          <span className="text-[11px] text-[#1c1917]/25">
                            {new Date(a.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <EntityIcon className="w-3.5 h-3.5 text-[#1c1917]/15 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

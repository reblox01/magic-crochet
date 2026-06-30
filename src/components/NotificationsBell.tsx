import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/routes/api/-notifications";
import { Bell, Mail, CalendarDays, ShoppingCart, Info, CheckCheck } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  contact: { icon: Mail, color: "text-cyan-500" },
  reservation: { icon: CalendarDays, color: "text-orange-500" },
  order: { icon: ShoppingCart, color: "text-green-500" },
  system: { icon: Info, color: "text-neutral-400" },
};

export function NotificationsBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications({ data: { userId: user!.id } }),
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n: { is_read: boolean }) => !n.is_read).length;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      queryClient.setQueryData(["notifications", user?.id], (old: typeof notifications) =>
        old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead({ data: { userId: user!.id } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-[#1c1917]/5 active:scale-95 transition-all"
      >
        <Bell className="w-[18px] h-[18px] text-[#1c1917]/60" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#F506EA] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl border border-[#1c1917]/8 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1917]/5">
            <span className="text-sm font-semibold text-[#1c1917]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-[#1c1917]/40 hover:text-[#F506EA] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto" data-lenis-prevent>
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-[#1c1917]/10 mx-auto mb-2" />
                <p className="text-sm text-[#1c1917]/30">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n: { id: string; type: string; title: string; body: string | null; is_read: boolean; created_at: string }) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead.mutate(n.id);
                    }}
                    className={`w-full px-5 py-3 text-left flex items-start gap-3 transition-colors border-b border-[#1c1917]/[0.03] last:border-0 ${
                      !n.is_read ? "bg-[#F506EA]/[0.03] hover:bg-[#F506EA]/[0.06]" : "hover:bg-[#1c1917]/[0.02]"
                    }`}
                  >
                    <div className={`mt-0.5 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${!n.is_read ? "font-medium text-[#1c1917]" : "text-[#1c1917]/70"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-[#1c1917]/35 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[10px] text-[#1c1917]/25 mt-1">
                        {new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F506EA] mt-2 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

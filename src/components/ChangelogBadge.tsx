import { useState, useRef, useEffect } from "react";
import { Megaphone, X, Sparkles, Check } from "lucide-react";

const CHANGELOG_VERSION = "2.0";

const ENTRIES = [
  {
    title: "Profil utilisateur",
    items: [
      "Photo de profil avec upload direct",
      "Changement de mot de passe sécurisé",
      "Nom d'affichage personnalisable",
    ],
  },
  {
    title: "Permissions avancées",
    items: [
      "Accès Lecture / Écriture par page",
      "Expiration des accès personnalisés",
      "Protection des boutons en lecture seule",
    ],
  },
  {
    title: "Système de notifications",
    items: [
      "Nouveau contacts, réservations, commandes",
      "Marquer lu / tout marquer lu",
      "Synchronisation en temps réel",
    ],
  },
  {
    title: "Refonte du design",
    items: [
      "Sélecteurs améliorés (Shadcn Select)",
      "Calendrier et time picker personnalisés",
      "Optimistic updates sur tous les toggles",
    ],
  },
  {
    title: "Sécurité",
    items: [
      "Rate limiting sur les routes publiques",
      "Headers de sécurité (Vercel)",
      "RLS complet avec fonctions SECURITY DEFINER",
    ],
  },
];

export function ChangelogBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-[#1c1917]/5 active:scale-95 transition-all"
      >
        <Megaphone className="w-[18px] h-[18px] text-[#1c1917]/60" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#F506EA] rounded-full" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl border border-[#1c1917]/8 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1917]/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F506EA]" />
              <span className="text-sm font-semibold text-[#1c1917]">Nouveautés</span>
              <span className="text-[10px] font-bold text-[#F506EA] bg-[#F506EA]/10 px-1.5 py-0.5 rounded-full">v{CHANGELOG_VERSION}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[#1c1917]/5 transition-colors">
              <X className="w-3.5 h-3.5 text-[#1c1917]/40" />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-5 py-4 space-y-5" data-lenis-prevent>
            {ENTRIES.map((entry) => (
              <div key={entry.title}>
                <h3 className="text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">{entry.title}</h3>
                <ul className="space-y-1.5">
                  {entry.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-[#1c1917]/60">
                      <Check className="w-3.5 h-3.5 text-[#F506EA] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

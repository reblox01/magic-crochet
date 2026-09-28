import { useState, useRef, useEffect } from "react";
import { Megaphone, X, Sparkles, Check, ChevronDown } from "lucide-react";

const CURRENT_VERSION = "2.2";

const VERSIONS = [
  {
    version: "2.2",
    defaultOpen: true,
    entries: [
      {
        title: "Assistant IA amélioré",
        items: [
          "Titres de conversation générés par l'IA",
          "Réponses enrichies : gras, listes et tableaux",
          "Réflexion repliée par défaut",
          "Nouvel effet de chargement et bouton d'envoi animé",
        ],
      },
      {
        title: "Chat administrateur",
        items: [
          "Appels d'outils visibles dans la conversation",
          "Édition des messages et reprise des réponses",
          "Correction des doublons de messages",
        ],
      },
      {
        title: "Corrections",
        items: [
          "Dates des ateliers : filtre Du/Au et tri chronologique",
          "Sélecteur de date : fermeture et repositionnement",
          "Boutons en icônes sur mobile",
          "Icônes Bot sur les conversations IA",
          "Correction de la connexion à la base de données",
        ],
      },
    ],
  },
  {
    version: "2.1",
    defaultOpen: false,
    entries: [
      {
        title: "Agent IA admin",
        items: [
          "Assistant intelligent dans le dashboard admin",
          "Requêtes en langage naturel sur la base de données",
          "Upload de fichiers CSV/Markdown/images dans le chat",
          "Markdown formaté avec tableaux stylisés",
          "Bouton stop pour annuler la génération",
        ],
      },
      {
        title: "Upload profil amélioré",
        items: [
          "Upload d'avatar via fonction serveur (bypass RLS)",
          "Conversion base64 côté serveur",
          "Vérification mot de passe côté client",
        ],
      },
      {
        title: "Sécurité & UX",
        items: [
          "Dialog de confirmation personnalisé avec case à cocher",
          "Date picker avec portail Radix (overflow fix)",
          "Select Radix sur toutes les pages admin",
          "Optimistic updates sur les mutations",
        ],
      },
    ],
  },
  {
    version: "2.0",
    defaultOpen: false,
    entries: [
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
    ],
  },
];

function VersionSection({ version, entries, defaultOpen }: { version: string; entries: typeof VERSIONS[0]["entries"]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#1c1917]/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#1c1917]/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#F506EA] bg-[#F506EA]/10 px-1.5 py-0.5 rounded-full">v{version}</span>
          {version === CURRENT_VERSION && (
            <span className="text-[9px] font-semibold text-white bg-[#F506EA] px-1.5 py-0.5 rounded-full">NEW</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#1c1917]/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-4">
          {entries.map((entry) => (
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
      )}
    </div>
  );
}

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
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[#1c1917]/5 transition-colors">
              <X className="w-3.5 h-3.5 text-[#1c1917]/40" />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto" data-lenis-prevent>
            {VERSIONS.map((v) => (
              <VersionSection key={v.version} version={v.version} entries={v.entries} defaultOpen={v.defaultOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

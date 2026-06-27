import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart, formatMAD } from "@/lib/cart";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/boutique", label: "Boutique" },
  { to: "/demande", label: "Sur mesure" },
  { to: "/atelier", label: "Atelier" },
  { to: "/reserver", label: "Réserver" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteNav() {
  const { count, setOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <nav className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-5xl">
      <div ref={sentinelRef} className="absolute -top-24 left-0 w-full h-24" aria-hidden />
      <div
        className={`glass border border-brand-text/5 rounded-[2.5rem] px-4 sm:px-7 py-2.5 sm:py-3.5 flex items-center justify-between shadow-[0_10px_40px_-18px_rgba(28,25,23,0.18)] transition-colors ${
          scrolled ? "bg-white/85" : "bg-white/55"
        }`}
      >
        <Link to="/" className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
          Magic <span className="italic text-brand-primary">Crochet</span>
        </Link>
        <div className="hidden md:flex gap-7 text-sm font-medium text-brand-text/65">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative py-1 hover:text-brand-text transition-colors ${pathname === l.to ? "text-brand-primary" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Panier (${count})`}
            className="relative grid place-items-center size-10 sm:size-11 rounded-full bg-brand-muted hover:bg-brand-accent/40 transition-colors active:scale-95"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="21" r="1.4" />
              <circle cx="18" cy="21" r="1.4" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-brand-primary text-white text-[10px] font-bold grid place-items-center">
                {count}
              </span>
            )}
          </button>
          <Link
            to="/reserver"
            className="hidden sm:inline-flex bg-brand-text text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors active:scale-[0.97]"
          >
            Réserver
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden grid place-items-center size-10 rounded-full bg-brand-muted active:scale-95"
            aria-label="Menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden mt-2 glass bg-white/95 border border-brand-text/5 rounded-[2rem] p-3 shadow-[0_20px_50px_-25px_rgba(28,25,23,0.25)] animate-reveal">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block px-5 py-3 rounded-[1.4rem] text-sm font-medium hover:bg-brand-muted"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export function CartDrawer() {
  const { items, total, count, setQty, remove, open, setOpen, clear } = useCart();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-brand-text/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] bg-brand-bg rounded-l-[2.5rem] shadow-[-20px_0_60px_-20px_rgba(28,25,23,0.25)] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Panier"
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-brand-text/10">
          <h2 className="font-serif text-2xl italic">Votre panier</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid place-items-center size-10 rounded-full bg-brand-muted hover:bg-brand-accent/40 active:scale-95"
            aria-label="Fermer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">
          {count === 0 && (
            <div className="text-center py-20 text-brand-text/55">
              <p className="font-serif text-xl italic mb-2">Panier vide</p>
              <p className="text-sm">Découvrez notre collection bouclée à la main.</p>
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} className="flex gap-4 p-3 rounded-[1.8rem] bg-brand-muted/60">
              <img src={it.img} alt={it.name} className="size-20 rounded-[1.4rem] object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg leading-tight truncate">{it.name}</p>
                <p className="text-xs text-brand-text/55 mb-2">{formatMAD(it.price)}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-full border border-brand-text/10">
                    <button
                      type="button"
                      onClick={() => setQty(it.id, it.qty - 1)}
                      className="size-8 grid place-items-center active:scale-90"
                      aria-label="Moins"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(it.id, it.qty + 1)}
                      className="size-8 grid place-items-center active:scale-90"
                      aria-label="Plus"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    className="ml-auto text-xs text-brand-text/50 hover:text-brand-primary"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {count > 0 && (
          <div className="border-t border-brand-text/10 px-6 sm:px-8 py-6 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm uppercase tracking-widest text-brand-text/55">
                Sous-total
              </span>
              <span className="font-serif text-3xl">{formatMAD(total)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="w-full bg-brand-text text-white py-4 rounded-full text-sm font-semibold text-center block hover:bg-brand-primary transition-colors active:scale-[0.98]"
            >
              Commander · {formatMAD(total)}
            </Link>
            <button
              type="button"
              onClick={clear}
              className="w-full text-xs text-brand-text/50 hover:text-brand-primary"
            >
              Vider le panier
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function SiteFooter() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", "site").single();
      if (error || !data?.value) return null;
      return data.value as Record<string, string>;
    },
  });

  const instagram = settings?.instagram ?? "";
  const tiktok = settings?.tiktok ?? "";
  const instagramHandle = instagram.replace("@", "");
  const tiktokHandle = tiktok.replace("@", "");

  return (
    <footer className="pt-24 pb-12 bg-brand-text text-white rounded-t-[3rem] sm:rounded-t-[4rem] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 mb-20">
          <div>
            <h2 className="font-serif text-4xl sm:text-6xl leading-[0.95] tracking-tight italic">
              Rejoignez
              <br />
              l'atelier Magic.
            </h2>
            <p className="opacity-50 text-lg mt-6 max-w-sm">
              Drops, ateliers et rapports d'impact, une fois par mois. Sans spam.
            </p>
            <form
              className="mt-10 flex gap-2 p-2 bg-white/[0.06] rounded-full border border-white/10 max-w-md"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                maxLength={120}
                placeholder="Votre adresse e-mail"
                className="bg-transparent flex-1 px-5 text-sm focus:outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                className="bg-white text-brand-text px-6 py-3 rounded-full text-sm font-semibold hover:bg-brand-accent transition-colors active:scale-95"
              >
                S'abonner
              </button>
            </form>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-40 mb-4">Connecter</p>
              {instagram && (
                <a
                  href={`https://www.instagram.com/${instagramHandle}/`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block hover:text-brand-accent transition-colors"
                >
                  Instagram
                </a>
              )}
              {tiktok && (
                <a
                  href={`https://www.tiktok.com/@${tiktokHandle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block hover:text-brand-accent transition-colors"
                >
                  TikTok
                </a>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-40 mb-4">Studio</p>
              <Link to="/boutique" className="block hover:text-brand-accent transition-colors">
                Boutique
              </Link>
              <Link to="/demande" className="block hover:text-brand-accent transition-colors">
                Sur mesure
              </Link>
              <Link to="/reserver" className="block hover:text-brand-accent transition-colors">
                Ateliers
              </Link>
              <Link to="/contact" className="block hover:text-brand-accent transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/10 gap-4">
          <span className="font-serif text-2xl italic">Magic Crochet</span>
          <div className="flex flex-wrap gap-6 justify-center text-[10px] uppercase tracking-[0.25em] opacity-40">
            <span>© {new Date().getFullYear()}</span>
            <a href="#">Confidentialité</a>
            <a href="#">Mentions légales</a>
          </div>
          <a
            href="https://bghitcode.com"
            target="_blank"
            rel="noreferrer noopener"
            className="font-serif text-lg italic opacity-40 hover:opacity-100 hover:text-brand-accent transition-all"
          >
            Code by BghitCode
          </a>
        </div>
      </div>
    </footer>
  );
}

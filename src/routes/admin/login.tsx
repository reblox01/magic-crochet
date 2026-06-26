import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { setInitialPassword } from "@/routes/api/-admin-users";
import { Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

const RATE_LIMIT_KEY = "mc_admin_login_rate_limit";
const MAX_ATTEMPTS = 5;
const LOCKOUT_BASE_MS = 15 * 60 * 1000;
const LOCKOUT_ESCALATION_MS = 30 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000;

function getRateLimit() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { attempts: 0, lockoutCount: 0, lockedUntil: 0, lastAttemptAt: 0 };
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.lastAttemptAt > ATTEMPT_WINDOW_MS) {
      return { attempts: 0, lockoutCount: 0, lockedUntil: 0, lastAttemptAt: 0 };
    }
    return parsed;
  } catch {
    return { attempts: 0, lockoutCount: 0, lockedUntil: 0, lastAttemptAt: 0 };
  }
}

function AdminLoginPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Invite password setup state
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Detect invite confirmation from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = params.get("type");

    if (type === "invite") {
      // Clear the hash immediately
      window.history.replaceState(null, "", window.location.pathname);

      // Wait for Supabase to establish the session from the invite tokens
      const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setInviteEmail(session.user.email || "");
          setIsInviteFlow(true);
          setInviteLoading(false);
        } else {
          // Session not ready yet, retry
          const retry = setTimeout(async () => {
            const { data: { session: s2 } } = await supabase.auth.getSession();
            if (s2?.user) {
              setInviteEmail(s2.user.email || "");
              setIsInviteFlow(true);
            }
            setInviteLoading(false);
          }, 2000);
          return () => clearTimeout(retry);
        }
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setInviteLoading(false);
    }
  }, []);

  // Redirect if already logged in (but not during invite flow)
  useEffect(() => {
    if (!authLoading && user && !isInviteFlow && !inviteLoading) {
      navigate({ to: "/admin" });
    }
  }, [user, authLoading, navigate, isInviteFlow, inviteLoading]);

  // --- Invite password setup handler ---
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError("Veuillez entrer un mot de passe.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSettingPassword(true);
    try {
      await setInitialPassword({ data: { password: newPassword } });
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la configuration du mot de passe.");
    } finally {
      setSettingPassword(false);
    }
  }

  // --- Regular login handler ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rateLimit = getRateLimit();
    if (Date.now() < rateLimit.lockedUntil) {
      const minutesLeft = Math.ceil((rateLimit.lockedUntil - Date.now()) / 60000);
      setError(`Trop de tentatives. Réessayez dans ${minutesLeft} minute(s).`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      localStorage.removeItem(RATE_LIMIT_KEY);
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      const newAttempts = rateLimit.attempts + 1;
      const isLockout = newAttempts >= MAX_ATTEMPTS;
      const lockoutDuration = rateLimit.lockoutCount > 0 ? LOCKOUT_ESCALATION_MS : LOCKOUT_BASE_MS;

      const newRateLimit = {
        attempts: newAttempts,
        lockoutCount: isLockout ? rateLimit.lockoutCount + 1 : rateLimit.lockoutCount,
        lockedUntil: isLockout ? Date.now() + lockoutDuration : 0,
        lastAttemptAt: Date.now(),
      };
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newRateLimit));

      const message =
        err instanceof Error ? err.message : "Erreur de connexion.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || inviteLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f7]">
        <div className="size-8 border-2 border-[#F506EA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !isInviteFlow) return null;

  // --- Invite: set password form ---
  if (isInviteFlow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="mx-auto size-14 rounded-2xl bg-[#F506EA] grid place-items-center mb-5">
              <Lock className="size-6 text-white" />
            </div>
            <h1 className="font-serif text-2xl text-[#1c1917]">Bienvenue !</h1>
            <p className="text-sm text-[#1c1917]/50 mt-1">
              Choisissez votre mot de passe pour activer votre compte.
            </p>
            <p className="text-xs text-[#1c1917]/40 mt-2 font-medium">{inviteEmail}</p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                  autoComplete="new-password"
                  className="w-full rounded-full bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#F506EA] transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1c1917]/40 hover:text-[#1c1917]/70 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                autoComplete="new-password"
                className="w-full rounded-full bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#F506EA] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={settingPassword}
              className="w-full bg-[#1c1917] text-white py-4 rounded-full text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingPassword ? "Configuration…" : "Activer mon compte"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#1c1917]/40">
            Accès réservé aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  // --- Regular login form ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="mx-auto size-14 rounded-2xl bg-[#F506EA] grid place-items-center mb-5">
            <span className="text-white font-serif text-xl font-bold">M</span>
          </div>
          <h1 className="font-serif text-2xl text-[#1c1917]">Magic Crochet</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">Administration</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              autoComplete="email"
              className="w-full rounded-full bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#F506EA] transition-colors"
              placeholder="admin@magic-crochet.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                autoComplete="current-password"
                className="w-full rounded-full bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#F506EA] transition-colors pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1c1917]/40 hover:text-[#1c1917]/70 transition-colors"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1c1917] text-white py-4 rounded-full text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#1c1917]/40">
          Accès réservé aux administrateurs.
        </p>
      </div>
    </div>
  );
}

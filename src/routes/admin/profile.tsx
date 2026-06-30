import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { avatarUpload, changePassword, updateProfile } from "@/routes/api/-profile";
import { toast } from "sonner";
import { Camera, Check, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["admin_users", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("admin_users").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const displayNameValue = displayName || profile?.display_name || "";

  const nameMutation = useMutation({
    mutationFn: () => updateProfile({ data: { display_name: displayNameValue, callerEmail: user?.email, callerId: user?.id } }),
    onSuccess: () => {
      toast.success("Nom mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Non autorisé");
      // Verify current password client-side first
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyErr) throw new Error("Mot de passe actuel incorrect");
      return changePassword({ data: { newPassword, callerEmail: user?.email, callerId: user?.id } });
    },
    onSuccess: () => {
      toast.success("Mot de passe changé");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 2MB)");
      return;
    }
    setAvatarUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await avatarUpload({ data: { fileBase64: base64, fileName: file.name, callerEmail: user?.email, callerId: user?.id } });

      await updateProfile({ data: { avatar_url: url, callerEmail: user?.email, callerId: user?.id } });

      toast.success("Photo mise à jour");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const pwValid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
  const pwMatch = newPassword === confirmPassword && newPassword.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="font-serif text-3xl font-bold text-[#1c1917]">Mon profil</h1>

      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F506EA]/10 to-[#F506EA]/5 flex items-center justify-center overflow-hidden ring-2 ring-[#F506EA]/20 ring-offset-2 transition-all">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-serif text-[#F506EA]/60">
                {(profile?.display_name || user?.email || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
          >
            {avatarUploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-medium text-[#1c1917]">{profile?.display_name || "Sans nom"}</p>
          <p className="text-sm text-[#1c1917]/40">{user?.email}</p>
          <p className="text-xs text-[#1c1917]/30 mt-1">JPG, PNG ou WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#1c1917]/60 uppercase tracking-wider">Informations</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-1.5">Nom d'affichage</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayNameValue}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 border border-[#1c1917]/10 rounded-xl px-4 py-2.5 bg-white text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#F506EA]/30 focus:border-[#F506EA] transition"
              />
              <button
                onClick={() => nameMutation.mutate()}
                disabled={nameMutation.isPending || !displayNameValue.trim() || displayNameValue === profile?.display_name}
                className="px-5 py-2.5 rounded-xl bg-[#1c1917] text-white text-sm font-medium hover:bg-[#1c1917]/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {nameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full border border-[#1c1917]/10 rounded-xl px-4 py-2.5 bg-[#1c1917]/[0.02] text-[#1c1917]/40 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#1c1917]/60 uppercase tracking-wider">Changer le mot de passe</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-1.5">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-[#1c1917]/10 rounded-xl px-4 py-2.5 bg-white text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#F506EA]/30 focus:border-[#F506EA] transition pr-10"
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1c1917]/30 hover:text-[#1c1917]/60 transition">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[#1c1917]/10 rounded-xl px-4 py-2.5 bg-white text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#F506EA]/30 focus:border-[#F506EA] transition pr-10"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1c1917]/30 hover:text-[#1c1917]/60 transition">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { ok: newPassword.length >= 8, label: "8+ chars" },
                  { ok: /[A-Z]/.test(newPassword), label: "Majuscule" },
                  { ok: /[a-z]/.test(newPassword), label: "Minuscule" },
                  { ok: /\d/.test(newPassword), label: "Chiffre" },
                  { ok: /[^A-Za-z0-9]/.test(newPassword), label: "Special" },
                ].map((r) => (
                  <span key={r.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.ok ? "bg-green-50 text-green-600" : "bg-[#1c1917]/5 text-[#1c1917]/30"}`}>
                    {r.ok ? <Check className="w-2.5 h-2.5 inline mr-0.5" /> : null}{r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-1.5">Confirmer</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#1c1917]/10 rounded-xl px-4 py-2.5 bg-white text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#F506EA]/30 focus:border-[#F506EA] transition"
            />
            {confirmPassword.length > 0 && (
              <p className={`text-xs mt-1.5 ${pwMatch ? "text-green-600" : "text-red-400"}`}>
                {pwMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
              </p>
            )}
          </div>
          <button
            onClick={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending || !currentPassword || !pwValid || !pwMatch}
            className="px-5 py-2.5 rounded-xl bg-[#1c1917] text-white text-sm font-medium hover:bg-[#1c1917]/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Changer le mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}

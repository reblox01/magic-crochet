import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Trash2, Clock, CheckCircle2, X } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  inviteUser,
  updateUserRole,
  updateUserName,
  updateUserEmail,
  resetUserPassword,
  deleteUser,
} from "@/routes/api/-admin-users";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type AdminUser = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  created_at: string;
  invited_at: string | null;
  invited_accepted_at: string | null;
};

function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const confirm = useConfirm();

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.from("admin_users").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("admin_users").select("role").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const isOwner = me?.role === "owner";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      await deleteUser({ data: { id } });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Utilisateur supprimé.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isOwner) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="font-serif text-xl text-[#1c1917]/40">Accès réservé au propriétaire.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Utilisateurs</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">
            {admins?.length ?? 0} administrateur(s).
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setEditingUser(null); }}
          className="px-5 py-2 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95"
        >
          {showInvite ? <X className="size-4" /> : "+ Ajouter"}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && <InviteForm onDone={() => { setShowInvite(false); invalidate(); }} />}

      {/* Edit form */}
      {editingUser && (
        <EditUserForm
          adminUser={editingUser}
          onCancel={() => setEditingUser(null)}
          onDone={() => { setEditingUser(null); invalidate(); }}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {admins?.map((a) => {
            const isPending = a.invited_at && !a.invited_accepted_at;
            const isAccepted = a.invited_at && a.invited_accepted_at;
            return (
              <div key={a.id} className="p-4 rounded-2xl bg-white border border-[#1c1917]/5">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-[#1c1917]/5 grid place-items-center shrink-0">
                    <span className="text-sm font-medium text-[#1c1917]/60">
                      {(a.display_name || a.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1c1917]">
                        {a.display_name || "Sans nom"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          a.role === "owner"
                            ? "bg-[#F506EA]/10 text-[#F506EA]"
                            : "bg-[#1c1917]/5 text-[#1c1917]/50"
                        }`}
                      >
                        {a.role === "owner" ? "Propriétaire" : "Admin"}
                      </span>
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
                          <Clock className="size-3" />
                          En attente
                        </span>
                      )}
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-200">
                          <CheckCircle2 className="size-3" />
                          Accepté
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#1c1917]/40 mt-0.5">{a.email}</p>
                  </div>
                  {a.id !== user?.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingUser(a); setShowInvite(false); }}
                        className="p-2 rounded-lg text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {a.role !== "owner" && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Supprimer l'utilisateur",
                              message: `Supprimer ${a.email} ? Cette action est irréversible.`,
                              confirmLabel: "Supprimer",
                              danger: true,
                            });
                            if (ok) removeAdmin.mutate(a.id);
                          }}
                          className="p-2 rounded-lg text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const addAdmin = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      await inviteUser({ data: { email, display_name: name } });
    },
    onSuccess: () => {
      toast.success("Administrateur invité !");
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    addAdmin.mutate(
      { email: email.trim(), name: name.trim() },
      { onSettled: () => setAdding(false) }
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-5 rounded-2xl bg-white border border-[#F506EA]/20 shadow-sm mb-6">
      <p className="font-medium text-[#1c1917] mb-4">Ajouter un administrateur</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom"
            className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@exemple.com"
            className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={adding || !email.trim()}
        className="px-5 py-2 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50"
      >
        {adding ? "Invitation…" : "Inviter"}
      </button>
    </form>
  );
}

function EditUserForm({
  adminUser,
  onCancel,
  onDone,
}: {
  adminUser: AdminUser;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(adminUser.display_name || "");
  const [email, setEmail] = useState(adminUser.email);
  const [role, setRole] = useState(adminUser.role);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const nameMutation = useMutation({
    mutationFn: async () => {
      await updateUserName({ data: { id: adminUser.id, display_name: name.trim() } });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      await updateUserEmail({ data: { id: adminUser.id, email: email.trim() } });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async () => {
      await updateUserRole({ data: { id: adminUser.id, role } });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await resetUserPassword({ data: { id: adminUser.id, password } });
    },
  });

  async function handleSave() {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (name.trim() !== (adminUser.display_name || "")) {
        promises.push(nameMutation.mutateAsync());
      }
      if (email.trim() !== adminUser.email) {
        promises.push(emailMutation.mutateAsync());
      }
      if (role !== adminUser.role) {
        promises.push(roleMutation.mutateAsync());
      }
      if (password.trim()) {
        promises.push(passwordMutation.mutateAsync());
      }

      await Promise.all(promises);
      toast.success("Utilisateur mis à jour !");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#F506EA]/20 shadow-sm mb-6">
      <h2 className="font-medium text-[#1c1917] mb-4">
        Modifier — {adminUser.display_name || adminUser.email}
      </h2>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
            >
              <option value="admin">Admin</option>
              <option value="owner">Propriétaire</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour conserver"
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50"
        >
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

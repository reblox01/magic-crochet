import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth-guard";

export const avisMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { action, id, data: payload } = data;

    if (action === "insert") {
      const { error } = await admin.from("avis").insert(payload);
      if (error) throw new Error(error.message);
    } else if (action === "update" && id) {
      const { error } = await admin.from("avis").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (action === "delete" && id) {
      const { error } = await admin.from("avis").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input: Record<string, unknown> & { callerEmail?: string; callerId?: string }) => input)
  .handler(async ({ data, request }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "site", value: data, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) {
      console.error("Settings save error:", error);
      throw new Error(error.message);
    }
    await logActivity({ action: "update", entityType: "settings", entityName: "Paramètres du site", userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

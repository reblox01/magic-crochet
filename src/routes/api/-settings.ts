import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data }) => {
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
    return { success: true };
  });

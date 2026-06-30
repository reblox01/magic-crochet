import { getAdminSupabase, getServerSupabase } from "@/lib/supabase";

type ActivityAction = "create" | "update" | "delete" | "activate" | "deactivate" | "login" | "logout" | "reply" | "status_change";

interface LogActivityInput {
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  userEmail?: string;
  userId?: string;
}

/**
 * Log admin action. Accepts explicit userEmail/userId OR extracts from request cookie.
 * Callers: { logActivity({ ..., request }) } from server function handlers.
 */
export async function logActivity(
  input: LogActivityInput,
  request?: Request,
) {
  try {
    let userEmail = input.userEmail ?? null;
    let userId = input.userId ?? null;

    if (!userEmail && request) {
      try {
        const cookie = request.headers.get("cookie") ?? "";
        if (cookie) {
          const supabase = getServerSupabase(cookie);
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userEmail = user.email ?? null;
            userId = user.id;
          }
        }
      } catch {
        // not in request context
      }
    }

    const admin = getAdminSupabase();
    const { error } = await admin.from("activity_log").insert({
      user_id: userId,
      user_email: userEmail,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      details: input.details ?? null,
    });
    if (error) console.error("[activity-log] insert error:", error.message);
  } catch (e) {
    console.error("[activity-log]", e);
  }
}

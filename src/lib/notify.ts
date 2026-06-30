import { getAdminSupabase } from "@/lib/supabase";

interface CreateNotificationInput {
  userId: string;
  type: "contact" | "reservation" | "order" | "system";
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create a notification for a specific admin user.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const admin = getAdminSupabase();
    await admin.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    });
  } catch (e) {
    console.error("[notify] createNotification failed:", e);
  }
}

/**
 * Create a notification for all admin users (owner + admins).
 */
export async function notifyAllAdmins(input: Omit<CreateNotificationInput, "userId">) {
  try {
    const admin = getAdminSupabase();
    const { data: admins, error: adminsErr } = await admin
      .from("admin_users")
      .select("id")
      .in("role", ["owner", "admin"]);

    if (adminsErr) {
      console.error("[notify] fetch admins failed:", adminsErr);
      return;
    }
    if (!admins?.length) {
      console.warn("[notify] no admin users found");
      return;
    }

    const { error: insertErr } = await admin.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
      }))
    );
    if (insertErr) {
      console.error("[notify] insert notifications failed:", insertErr);
    }
  } catch (e) {
    console.error("[notify] notifyAllAdmins failed:", e);
  }
}

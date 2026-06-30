import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const getNotifications = createServerFn({ method: "GET" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { data: notifications, error } = await admin
      .from("notifications")
      .select("*")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return notifications ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", data.userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { success: true };
  });

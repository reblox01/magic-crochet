import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ponytail: map DB table names → actual React Query keys used by admin pages
const TABLE_TO_QUERY_KEY: Record<string, string> = {
  products: "admin-products",
  partnerships: "admin-partnerships",
  gallery_images: "admin-gallery",
  reviews: "admin-reviews",
  avis: "admin-avis",
  orders: "admin-orders",
  contacts: "admin-contacts",
  contact_replies: "admin-contacts",
  ateliers: "ateliers",
  admin_users: "admin-users",
  notifications: "admin-settings",
  activity_log: "activity_log",
  app_settings: "admin-settings",
};

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "*" },
        (payload) => {
          const key = TABLE_TO_QUERY_KEY[payload.table];
          if (key) queryClient.invalidateQueries({ queryKey: [key] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

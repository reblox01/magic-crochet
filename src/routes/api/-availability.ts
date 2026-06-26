import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

const CAPACITY = 10;
const SLOTS = ["10:00", "14:00", "17:00"] as const;

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((date: string) => date)
  .handler(async ({ data: date }) => {
    const supabase = getAdminSupabase();

    const { data: existing, error } = await supabase
      .from("reservations")
      .select("time, seats")
      .eq("date", date)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      console.error("Availability query error:", error);
      // Return all slots as available on error
      const result: Record<string, { available: boolean; remaining: number }> = {};
      for (const time of SLOTS) {
        result[time] = { available: true, remaining: CAPACITY };
      }
      return result;
    }

    // Calculate used seats per slot
    const usedBySlot: Record<string, number> = {};
    for (const r of existing ?? []) {
      usedBySlot[r.time] = (usedBySlot[r.time] ?? 0) + r.seats;
    }

    const result: Record<string, { available: boolean; remaining: number }> = {};
    for (const time of SLOTS) {
      const remaining = Math.max(0, CAPACITY - (usedBySlot[time] ?? 0));
      result[time] = { available: remaining > 0, remaining };
    }
    return result;
  });

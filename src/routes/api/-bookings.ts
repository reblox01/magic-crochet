import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

const bookingSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  seats: z.number().int().min(1).max(10),
  format: z.enum(["individuel", "equipe"]),
  date: z.string().min(1),
  time: z.enum(["10:00", "14:00", "17:00"]),
  notes: z.string().optional(),
});

type BookingInput = z.infer<typeof bookingSchema>;

// ponytail: atomic booking via PostgreSQL function — prevents race condition double-booking
export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input: BookingInput) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    if (!checkRateLimit("booking", 3, 60_000)) {
      throw new Error("Trop de demandes. Réessayez dans un moment.");
    }

    const supabase = getAdminSupabase();
    const { data: result, error } = await supabase.rpc("book_seat", {
      p_date: data.date,
      p_time: data.time,
      p_seats: data.seats,
      p_name: data.name,
      p_email: data.email,
      p_phone: data.phone,
      p_format: data.format,
      p_notes: data.notes || null,
      p_status: "pending",
    });

    if (error) throw new Error("Erreur lors de la réservation. Réessayez.");
    if (result && !result.success) return { success: false, error: result.error };
    return { success: true };
  });

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

const CAPACITY = 10;

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input: BookingInput) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    // Rate limit: 3 booking submissions per minute (per server instance)
    if (!checkRateLimit("booking", 3, 60_000)) {
      throw new Error("Trop de demandes. Réessayez dans un moment.");
    }

    const supabase = getAdminSupabase();

    // Check availability
    const { data: existing, error: fetchError } = await supabase
      .from("reservations")
      .select("seats")
      .eq("date", data.date)
      .eq("time", data.time)
      .in("status", ["pending", "confirmed"]);

    if (fetchError) {
      console.error("Availability check error:", fetchError);
      throw new Error("Erreur lors de la vérification des disponibilités.");
    }

    const usedSeats = (existing ?? []).reduce((sum, r) => sum + r.seats, 0);
    if (usedSeats + data.seats > CAPACITY) {
      return {
        success: false,
        error: "Ce créneau est complet. Choisissez un autre horaire.",
      };
    }

    // Create reservation
    const { error: insertError } = await supabase.from("reservations").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      seats: data.seats,
      format: data.format,
      date: data.date,
      time: data.time,
      notes: data.notes || null,
      status: "pending",
    });

    if (insertError) {
      console.error("Booking insert error:", insertError);
      throw new Error("Erreur lors de la réservation. Réessayez.");
    }

    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import { notifyAllAdmins } from "@/lib/notify";

const adminBookingSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  seats: z.number().int().min(1).max(10),
  format: z.enum(["individuel", "equipe"]),
  date: z.string().min(1),
  time: z.enum(["10:00", "14:00", "17:00"]),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
});

type AdminBookingInput = z.infer<typeof adminBookingSchema>;

// ponytail: atomic booking via PostgreSQL function — prevents race condition double-booking
export const createAdminBooking = createServerFn({ method: "POST" })
  .inputValidator((input: AdminBookingInput & { callerEmail?: string; callerId?: string }) => ({
    ...adminBookingSchema.parse(input),
    callerEmail: input.callerEmail,
    callerId: input.callerId,
  }))
  .handler(async ({ data, request }) => {
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
      p_status: data.status,
    });

    if (error) throw new Error("Erreur lors de la réservation. Réessayez.");
    if (result && !result.success) return { success: false, error: result.error };

    await logActivity({ action: "create", entityType: "reservation", entityName: data.name, userEmail: data.callerEmail, userId: data.callerId }, request);
    await notifyAllAdmins({
      type: "reservation",
      title: `Nouvelle réservation de ${data.name}`,
      body: `${data.date} à ${data.time} — ${data.seats} place(s)`,
      entityType: "reservation",
    });

    return { success: true };
  });

export const deleteReservation = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { data: existing } = await admin.from("reservations").select("name").eq("id", data.id).single();
    const { error } = await admin.from("reservations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "delete", entityType: "reservation", entityName: existing?.name ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

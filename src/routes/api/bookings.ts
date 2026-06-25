import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createBooking } from "@/lib/bookings";

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

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input: BookingInput) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    return createBooking(data);
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * In-memory booking store. Cloudflare workers are stateless, so persistence
 * across cold starts is best-effort — for production wire this to a database.
 * The store still prevents concurrent double-booking within a live worker
 * and enforces server-side validation rules.
 */
const CAPACITY_PER_SLOT = 6;
const ALLOWED_SLOTS = ["10:00", "14:00", "17:00"] as const;

type SlotKey = `${string}__${string}`; // date__time
type BookingRecord = {
  id: string;
  date: string;
  time: string;
  seats: number;
  name: string;
  email: string;
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __mc_bookings: Map<SlotKey, BookingRecord[]> | undefined;
}

function store(): Map<SlotKey, BookingRecord[]> {
  if (!globalThis.__mc_bookings) globalThis.__mc_bookings = new Map();
  return globalThis.__mc_bookings;
}

function key(date: string, time: string): SlotKey {
  return `${date}__${time}` as SlotKey;
}

function seatsTaken(date: string, time: string): number {
  return (store().get(key(date, time)) ?? []).reduce((s, b) => s + b.seats, 0);
}

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(20).regex(/^[0-9+\s().-]+$/),
  seats: z.number().int().min(1).max(10),
  format: z.enum(["individuel", "equipe"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  time: z.enum(ALLOWED_SLOTS),
  notes: z.string().max(500).optional(),
});

const availabilitySchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(60),
});

export type AvailabilityMap = Record<string, Record<string, number>>;

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { dates: string[] }) => availabilitySchema.parse(data))
  .handler(async ({ data }): Promise<{ capacity: number; remaining: AvailabilityMap }> => {
    const remaining: AvailabilityMap = {};
    for (const date of data.dates) {
      remaining[date] = {};
      for (const t of ALLOWED_SLOTS) {
        remaining[date][t] = Math.max(0, CAPACITY_PER_SLOT - seatsTaken(date, t));
      }
    }
    return { capacity: CAPACITY_PER_SLOT, remaining };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    // Server-side date validation: must be in the future, within next 60 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setDate(today.getDate() + 60);
    const requested = new Date(`${data.date}T00:00:00`);
    if (Number.isNaN(requested.getTime()) || requested < today || requested > max) {
      throw new Error("Cette date n'est pas disponible.");
    }

    const taken = seatsTaken(data.date, data.time);
    const remaining = CAPACITY_PER_SLOT - taken;
    if (data.seats > remaining) {
      throw new Error(
        remaining <= 0
          ? "Désolé, ce créneau est complet."
          : `Il reste seulement ${remaining} place(s) sur ce créneau.`,
      );
    }

    const record: BookingRecord = {
      id: `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      date: data.date,
      time: data.time,
      seats: data.seats,
      name: data.name,
      email: data.email,
      createdAt: Date.now(),
    };
    const k = key(data.date, data.time);
    const list = store().get(k) ?? [];
    list.push(record);
    store().set(k, list);

    return {
      ok: true as const,
      reference: record.id,
      date: data.date,
      time: data.time,
      seats: data.seats,
      remainingAfter: CAPACITY_PER_SLOT - (taken + data.seats),
    };
  });

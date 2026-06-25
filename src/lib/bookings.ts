export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  seats: number;
  format: "individuel" | "equipe";
  date: string;
  time: string;
  notes?: string;
  createdAt: number;
};

const CAPACITY = 10;

const bookings = new Map<string, Booking[]>();

function slotKey(date: string, time: string): string {
  return `${date}:${time}`;
}

export function getBookingsForSlot(date: string, time: string): Booking[] {
  return bookings.get(slotKey(date, time)) ?? [];
}

export function getRemainingSeats(date: string, time: string): number {
  const used = getBookingsForSlot(date, time).reduce((sum, b) => sum + b.seats, 0);
  return Math.max(0, CAPACITY - used);
}

export function isSlotAvailable(date: string, time: string, requestedSeats: number): boolean {
  return getRemainingSeats(date, time) >= requestedSeats;
}

export function createBooking(data: Omit<Booking, "id" | "createdAt">): {
  success: boolean;
  booking?: Booking;
  error?: string;
} {
  if (!isSlotAvailable(data.date, data.time, data.seats)) {
    return { success: false, error: "Ce créneau est complet. Choisissez un autre horaire." };
  }

  const booking: Booking = {
    ...data,
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  const key = slotKey(data.date, data.time);
  const existing = bookings.get(key) ?? [];
  existing.push(booking);
  bookings.set(key, existing);

  return { success: true, booking };
}

export function getAvailabilityForDate(
  date: string,
): Record<string, { available: boolean; remaining: number }> {
  const times = ["10:00", "14:00", "17:00"];
  const result: Record<string, { available: boolean; remaining: number }> = {};
  for (const time of times) {
    const remaining = getRemainingSeats(date, time);
    result[time] = { available: remaining > 0, remaining };
  }
  return result;
}

import { createServerFn } from "@tanstack/react-start";
import { getAvailabilityForDate } from "@/lib/bookings";

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((date: string) => date)
  .handler(async ({ data }) => {
    return getAvailabilityForDate(data);
  });

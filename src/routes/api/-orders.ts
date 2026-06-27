import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const orderCreate = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    items: { id: string; name: string; price: number; qty: number }[];
    notes: string | null;
    total_amount: number;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { error } = await admin.from("orders").insert({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      items: data.items,
      notes: data.notes,
      total_amount: data.total_amount,
      status: "pending",
      is_paid: false,
    });
    if (error) throw new Error(error.message);
  });

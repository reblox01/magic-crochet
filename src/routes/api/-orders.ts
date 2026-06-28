import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth-guard";

export const orderCreate = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_address: string | null;
    items: { id: string; name: string; price: number; qty: number }[];
    notes: string | null;
    total_amount: number;
    livraison_prix: number;
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("orders").insert({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      items: data.items,
      notes: data.notes,
      total_amount: data.total_amount,
      livraison_prix: data.livraison_prix,
      status: "pending",
      is_paid: false,
    });
    if (error) throw new Error(error.message);
  });

// ponytail: public checkout — no auth required, uses anon client
export const checkoutCreate = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_address: string | null;
    items: { id: string; name: string; price: number; qty: number }[];
    notes: string | null;
    total_amount: number;
  }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("orders").insert({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      items: data.items,
      notes: data.notes,
      total_amount: data.total_amount,
      livraison_prix: 0,
      status: "pending",
      is_paid: false,
    });
    if (error) throw new Error(error.message);
  });

export const orderQrImageUpload = createServerFn({ method: "POST" })
  .validator((data: { fileBase64: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getAdminSupabase();
    const ext = data.fileName.split(".").pop() ?? "png";
    const path = `qr/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(data.fileBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const { error: upErr } = await supabase.storage.from("orders").upload(path, buf, { contentType: `image/${ext}`, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: urlData } = supabase.storage.from("orders").getPublicUrl(path);
    return { url: urlData.publicUrl };
  });

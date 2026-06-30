import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyAllAdmins } from "@/lib/notify";
import { logActivity } from "@/lib/activity-log";

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
    callerEmail?: string;
    callerId?: string;
  }) => data)
  .handler(async ({ data, request }) => {
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
    await logActivity({ action: "create", entityType: "order", entityName: data.customer_name, userEmail: data.callerEmail, userId: data.callerId }, request);
    await notifyAllAdmins({ type: "order", title: "Nouvelle commande", body: `${data.customer_name} — ${data.total_amount} DH`, entityType: "order", entityId: null });
  });

// ponytail: public checkout — no auth required, uses admin client for DB lookup
export const checkoutCreate = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_address: string | null;
    items: { id: string; qty: number }[];
    notes: string | null;
  }) => data)
  .handler(async ({ data }) => {
    if (!checkRateLimit("checkout", 5, 60_000)) {
      throw new Error("Trop de demandes. Réessayez dans un moment.");
    }
    if (!data.items.length) throw new Error("Panier vide");
    if (!data.customer_name.trim()) throw new Error("Nom requis");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) throw new Error("Email invalide");
    for (const item of data.items) {
      if (item.qty < 1 || item.qty > 99 || !Number.isInteger(item.qty)) throw new Error("Quantité invalide");
    }

    const supabase = getAdminSupabase();

    // Fetch actual prices from DB — never trust client
    const productIds = [...new Set(data.items.map((i) => i.id))];
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, price, name")
      .in("id", productIds);
    if (fetchErr) throw new Error("Erreur lors de la vérification des produits");
    if (!products?.length) throw new Error("Aucun produit trouvé");

    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    const nameMap = new Map(products.map((p) => [p.id, p.name]));

    let totalAmount = 0;
    const sanitizedItems = data.items.map((item) => {
      const dbPrice = priceMap.get(item.id);
      if (dbPrice === undefined) throw new Error(`Produit inconnu: ${item.id}`);
      totalAmount += dbPrice * item.qty;
      return { id: item.id, name: nameMap.get(item.id) ?? item.id, price: dbPrice, qty: item.qty };
    });

    const { error } = await supabase.from("orders").insert({
      customer_name: data.customer_name.trim(),
      customer_email: data.customer_email.trim().toLowerCase(),
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      items: sanitizedItems,
      notes: data.notes,
      total_amount: totalAmount,
      livraison_prix: 0,
      status: "pending",
      is_paid: false,
    });
    if (error) throw new Error(error.message);

    await notifyAllAdmins({
      type: "order",
      title: `Nouvelle commande de ${data.customer_name.trim()}`,
      body: `${totalAmount.toLocaleString("fr-FR")} DA — ${sanitizedItems.length} article(s)`,
      entityType: "order",
    });
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { data: existing } = await admin.from("orders").select("customer_name").eq("id", data.id).single();
    const { error } = await admin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "delete", entityType: "order", entityName: existing?.customer_name ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const orderQrImageUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { fileBase64: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    // ponytail: auto-create bucket if missing
    const { error: bucketErr } = await supabase.storage.createBucket("orders", { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] });
    if (bucketErr && !bucketErr.message.includes("already exists")) throw new Error(bucketErr.message);
    const path = `qr/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const buf = Buffer.from(data.fileBase64, "base64");
    const { error: upErr } = await supabase.storage.from("orders").upload(path, buf, { contentType: "image/webp", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: urlData } = supabase.storage.from("orders").getPublicUrl(path);
    return { url: urlData.publicUrl };
  });

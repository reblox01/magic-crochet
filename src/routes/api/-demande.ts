import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

const demandeSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  phone: z.string().min(6).max(20),
  productType: z.string().min(1),
  size: z.string().min(1),
  color: z.string().max(100).optional(),
  quantity: z.number().int().min(1).max(20),
  description: z.string().min(10).max(1000),
  budget: z.string().max(50).optional(),
});

type DemandeInput = z.infer<typeof demandeSchema>;

export const submitDemande = createServerFn({ method: "POST" })
  .inputValidator((input: DemandeInput) => demandeSchema.parse(input))
  .handler(async ({ data }) => {
    if (!checkRateLimit("demande", 3, 60_000)) {
      throw new Error("Trop de demandes. Réessayez dans un moment.");
    }
    const supabase = getAdminSupabase();

    const budgetMatch = data.budget?.match(/\d+/);
    const budgetNum = budgetMatch ? parseInt(budgetMatch[0], 10) : 0;
    const price = isNaN(budgetNum) ? 0 : budgetNum;

    const items = [
      {
        name: `Sur mesure — ${data.productType}`,
        price,
        qty: data.quantity,
        size: data.size,
        color: data.color || null,
      },
    ];

    const notes = [
      `Type: ${data.productType}`,
      `Taille: ${data.size}`,
      `Couleur: ${data.color || "Non spécifié"}`,
      `Quantité: ${data.quantity}`,
      `Budget: ${data.budget || "Non spécifié"}`,
      ``,
      `Description: ${data.description}`,
    ].join("\n");

    const { error } = await supabase.from("orders").insert({
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
      total_amount: price,
      status: "pending",
      items,
      notes,
      livraison_prix: 0,
      is_paid: false,
    });

    if (error) {
      console.error("Demande insert error:", error);
      throw new Error("Erreur lors de l'envoi de la demande. Réessayez.");
    }

    return { success: true };
  });

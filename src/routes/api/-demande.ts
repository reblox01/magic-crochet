import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";

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
    const supabase = getAdminSupabase();

    const items = [
      {
        product_type: data.productType,
        size: data.size,
        color: data.color || null,
        quantity: data.quantity,
      },
    ];

    const notes = [
      `Type: ${data.productType}`,
      `Taille: ${data.size}`,
      data.color ? `Couleur: ${data.color}` : null,
      `Quantité: ${data.quantity}`,
      data.budget ? `Budget: ${data.budget}` : null,
      ``,
      data.description,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("orders").insert({
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
      total_amount: 0,
      status: "pending",
      items,
      notes,
      is_paid: false,
    });

    if (error) {
      console.error("Demande insert error:", error);
      throw new Error("Erreur lors de l'envoi de la demande. Réessayez.");
    }

    return { success: true };
  });

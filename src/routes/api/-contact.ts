import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  phone: z.string().min(6).max(20).optional(),
  subject: z.enum(["commande", "atelier", "partenariat", "autre"]),
  message: z.string().min(10).max(1000),
});

type ContactInput = z.infer<typeof contactSchema>;

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: ContactInput) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("contacts").insert({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject,
      message: data.message,
      status: "new",
    });

    if (error) {
      console.error("Contact insert error:", error);
      throw new Error("Erreur lors de l'envoi du message. Réessayez.");
    }

    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth-guard";

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
    // Rate limit: 5 contact submissions per minute (per server instance)
    if (!checkRateLimit("contact", 5, 60_000)) {
      throw new Error("Trop de demandes. Réessayez dans un moment.");
    }

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

export const sendReply = createServerFn({ method: "POST" })
  .inputValidator((data: { contactId: string; to: string; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || "hello.magic@bghitcode.com";

    const { error: emailError } = await resend.emails.send({
      from,
      to: data.to,
      subject: data.subject.startsWith("Re:") ? data.subject : `Re: ${data.subject}`,
      text: data.body,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error("Erreur lors de l'envoi de l'email.");
    }

    const admin = getAdminSupabase();
    const { error: dbError } = await admin.from("contacts").update({ status: "replied" }).eq("id", data.contactId);
    if (dbError) console.error("Contact status update error:", dbError);

    return { success: true };
  });

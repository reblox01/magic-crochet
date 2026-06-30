import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { Resend } from "resend";
import { logActivity } from "@/lib/activity-log";
import { notifyAllAdmins } from "@/lib/notify";

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
    const { data: inserted, error } = await supabase.from("contacts").insert({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject,
      message: data.message,
      status: "new",
    }).select("id").single();

    if (error) {
      console.error("Contact insert error:", error);
      throw new Error("Erreur lors de l'envoi du message. Réessayez.");
    }

    await notifyAllAdmins({
      type: "contact",
      title: `Nouveau message de ${data.name}`,
      body: data.subject,
      entityType: "contact",
      entityId: inserted?.id,
    });

    return { success: true };
  });

export const sendReply = createServerFn({ method: "POST" })
  .inputValidator((data: { contactId: string; to: string; subject: string; body: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
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

    // Save reply to contact_replies table
    const { error: replyError } = await admin.from("contact_replies").insert({
      contact_id: data.contactId,
      body: data.body,
      sent_by: from,
    });
    if (replyError) console.error("Contact reply insert error:", replyError);

    // Update contact status
    const { error: dbError } = await admin.from("contacts").update({ status: "replied" }).eq("id", data.contactId);
    if (dbError) console.error("Contact status update error:", dbError);

    await logActivity({ action: "reply", entityType: "contact", entityId: data.contactId, entityName: data.to, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const getContactReplies = createServerFn({ method: "GET" })
  .inputValidator((data: { contactId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { data: replies, error } = await admin
      .from("contact_replies")
      .select("*")
      .eq("contact_id", data.contactId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return replies ?? [];
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { data: existing } = await admin.from("contacts").select("name").eq("id", data.id).single();
    const { error } = await admin.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "delete", entityType: "contact", entityName: existing?.name ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

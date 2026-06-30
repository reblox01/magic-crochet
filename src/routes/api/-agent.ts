import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase";
import { streamAgentResponse } from "@/lib/ai-provider";
import { buildToolDefinitions } from "@/lib/agent-tools";
import { getSystemPrompt } from "@/lib/agent-context";
import { MemoryManager } from "@/lib/agent-memory";
import { detectInjection, sanitizeInput, validateOutput } from "@/lib/agent-security";
import { checkRateLimit } from "@/lib/rate-limit";
import type { CoreMessage } from "ai";

const memory = new MemoryManager();

export const agentChat = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      message: string;
      conversationId?: string;
      callerEmail: string;
      callerId: string;
      userRole: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    // Rate limit
    if (!checkRateLimit(`agent:${data.callerId}`, 10, 60_000)) {
      throw new Error("Trop de requêtes. Réessayez dans 1 minute.");
    }

    // Input validation
    if (!data.message.trim() || data.message.length > 2000) {
      throw new Error("Message vide ou trop long (max 2000 caractères).");
    }

    // Injection detection
    const injection = detectInjection(data.message);
    if (!injection.safe) {
      throw new Error("Message refusé pour des raisons de sécurité.");
    }

    const sanitized = sanitizeInput(data.message);

    // Role check
    if (!["owner", "admin"].includes(data.userRole)) {
      throw new Error("Accès agent réservé aux administrateurs.");
    }

    // Get or create conversation
    const conversationId = await memory.getOrCreateConversation(data.callerId, data.conversationId);

    // Save user message
    await memory.saveMessage(conversationId, { role: "user", content: sanitized });

    // Build context
    const recentMessages = await memory.getRecentMessages(conversationId, 30);
    const summary = await memory.getConversationSummary(conversationId);

    // Build AI messages
    const aiMessages: CoreMessage[] = [{ role: "system", content: getSystemPrompt() }];

    if (summary) {
      aiMessages.push({ role: "system", content: `Résumé de la conversation précédente:\n${summary}` });
    }

    for (const msg of recentMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Build tools
    const tools = buildToolDefinitions(data.userRole, data.callerEmail, data.callerId);

    // Stream response
    const result = await streamAgentResponse({
      messages: aiMessages,
      tools,
      maxSteps: 3,
    });

    // Collect full response text for saving
    let fullText = "";
    const textStream = result.textStream;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`));
          }

          // Validate output
          const validated = validateOutput(fullText);
          if (validated.cleaned !== fullText) {
            fullText = validated.cleaned;
          }

          // Save assistant message
          await memory.saveMessage(conversationId, {
            role: "assistant",
            content: fullText,
            tokens_used: result.usage?.totalTokens,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                conversationId,
                tokensUsed: result.usage?.totalTokens ?? 0,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Erreur lors de la génération." })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

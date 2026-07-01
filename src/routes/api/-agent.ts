import { createServerFn } from "@tanstack/react-start";
import { runAgentLoop } from "@/lib/ai-provider";
import { getToolDefinitions, createToolExecutor } from "@/lib/agent-tools";
import { getSystemPrompt } from "@/lib/agent-context";
import { MemoryManager } from "@/lib/agent-memory";
import { detectInjection, sanitizeInput, validateOutput } from "@/lib/agent-security";
import { checkRateLimit } from "@/lib/rate-limit";

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
    if (!checkRateLimit(`agent:${data.callerId}`, 10, 60_000)) {
      throw new Error("Trop de requêtes. Réessayez dans 1 minute.");
    }
    if (!data.message.trim() || data.message.length > 2000) {
      throw new Error("Message vide ou trop long (max 2000 caractères).");
    }
    const injection = detectInjection(data.message);
    if (!injection.safe) {
      throw new Error("Message refusé pour des raisons de sécurité.");
    }
    const sanitized = sanitizeInput(data.message);
    if (!["owner", "admin"].includes(data.userRole)) {
      throw new Error("Accès agent réservé aux administrateurs.");
    }

    const conversationId = await memory.getOrCreateConversation(data.callerId, data.conversationId);
    await memory.saveMessage(conversationId, { role: "user", content: sanitized });

    const recentMessages = await memory.getRecentMessages(conversationId, 30);
    const summary = await memory.getConversationSummary(conversationId);

    let systemPrompt = getSystemPrompt();
    if (summary) {
      systemPrompt += `\n\nRésumé de la conversation précédente:\n${summary}`;
    }

    // Build conversation history as single user message with context
    let userMessage = sanitized;
    if (recentMessages.length > 1) {
      const history = recentMessages
        .slice(0, -1)
        .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
        .join("\n");
      userMessage = `Historique:\n${history}\n\nQuestion actuelle: ${sanitized}`;
    }

    const tools = getToolDefinitions();
    const executeTool = createToolExecutor(data.userRole, data.callerEmail, data.callerId);

    const result = await runAgentLoop(systemPrompt, userMessage, tools, executeTool);

    let fullText = result.content;
    const validated = validateOutput(fullText);
    if (validated.cleaned !== fullText) fullText = validated.cleaned;

    await memory.saveMessage(conversationId, {
      role: "assistant",
      content: fullText,
      tokens_used: result.tokensUsed,
    });

    return {
      content: fullText,
      conversationId,
      tokensUsed: result.tokensUsed,
    };
  });

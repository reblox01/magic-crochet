import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

// ponytail: using openai package directly instead of @ai-sdk/openai
// Vercel AI SDK v7 Responses API format incompatible with OpenRouter/NIM

function createOpenRouterClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    timeout: 30_000,
    defaultHeaders: {
      "HTTP-Referer": "https://magic-crochet.vercel.app",
      "X-Title": "Magic Crochet Admin Agent",
    },
  });
}

function createOpenCodeZenClient() {
  return new OpenAI({
    baseURL: "https://opencode.ai/zen/v1",
    apiKey: process.env.OPENCODE_ZEN_API_KEY ?? "",
    timeout: 30_000,
  });
}

function createGoogleClient() {
  return new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY ?? "",
    timeout: 30_000,
  });
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentResult {
  content: string;
  tokensUsed: number;
  toolCalls?: { name: string; args: Record<string, unknown>; result: string }[];
}

const MAX_ITERATIONS = 5;
const MAX_TOOL_CALLS = 12;
const MAX_TOOL_RESULT_CHARS = 12_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (e.status === 429) return true;
  if (e.status && e.status >= 500) return true;
  if (e.message?.includes("timeout") || e.message?.includes("TIMEOUT")) return true;
  return false;
}

async function callWithRetry(
  client: OpenAI,
  model: string,
  params: Omit<ChatCompletionCreateParamsNonStreaming, "model">,
  retries = MAX_RETRIES,
): Promise<Awaited<ReturnType<typeof client.chat.completions.create>>> {
  try {
    return await client.chat.completions.create({ model, ...params });
  } catch (err: unknown) {
    if (isRetryable(err) && retries > 0) {
      const e = err as { status?: number; message?: string };
      const delay = BASE_RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
      console.warn(`[agent] retryable error on ${model} (${e.status ?? e.message}), retrying in ${delay}ms (${retries} left)`);
      await new Promise((r) => setTimeout(r, delay));
      return callWithRetry(client, model, params, retries - 1);
    }
    throw err;
  }
}

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  tools: AgentTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  images?: { name: string; base64: string; mimeType: string }[],
): Promise<AgentResult> {
  // ponytail: never throw — return error as content so TanStack Start error boundary never fires
  try {
    return await runAgentLoopInner(systemPrompt, userMessage, tools, executeTool, images);
  } catch (err: unknown) {
    console.error("[agent] runAgentLoop fatal:", err);
    const msg = err instanceof Error ? err.message : "Erreur interne agent";
    return { content: `Erreur: ${msg}`, tokensUsed: 0 };
  }
}

async function runAgentLoopInner(
  systemPrompt: string,
  userMessage: string,
  tools: AgentTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  images?: { name: string; base64: string; mimeType: string }[],
): Promise<AgentResult> {
  const openaiTools: ChatCompletionTool[] = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  // Build user message with optional vision content
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: userMessage },
  ];
  if (images && images.length > 0) {
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      });
    }
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent as unknown as string },
  ];

  const client = createOpenRouterClient();
  const openCodeZenClient = createOpenCodeZenClient();
  const googleClient = createGoogleClient();
  let totalTokens = 0;
  let toolCallCount = 0;
  const seenToolCalls = new Set<string>();
  const collectedToolCalls: { name: string; args: Record<string, unknown>; result: string }[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Awaited<ReturnType<typeof client.chat.completions.create>>;

    try {
      response = await callWithRetry(openCodeZenClient, "mimo-v2.5-free", {
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? "auto" : undefined,
        max_tokens: 4096,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.warn("[agent] OpenCode Zen failed:", err.status, err.message);
      console.warn("[agent] Falling back to Google AI");
      try {
        response = await callWithRetry(googleClient, "gemma-4-26b-a4b-it", {
          messages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          tool_choice: openaiTools.length > 0 ? "auto" : undefined,
          max_tokens: 4096,
        });
      } catch (googleError: unknown) {
        const googleErr = googleError as { status?: number; message?: string };
        console.warn("[agent] Google AI also failed:", googleErr.status, googleErr.message);
        console.warn("[agent] Falling back to OpenRouter");
        try {
          response = await callWithRetry(client, "google/gemma-4-26b-a4b-it:free", {
            messages,
            tools: openaiTools.length > 0 ? openaiTools : undefined,
            tool_choice: openaiTools.length > 0 ? "auto" : undefined,
            max_tokens: 4096,
          });
        } catch (orError: unknown) {
          const orErr = orError as { status?: number; message?: string };
          console.error("[agent] All providers failed. OpenCode Zen:", err.message, "Google:", googleErr.message, "OpenRouter:", orErr.message);
          return {
            content: `AI indisponible. OpenCode Zen: ${err.message}. Google: ${googleErr.message}. OpenRouter: ${orErr.message}`,
            tokensUsed: 0,
          };
        }
      }
    }

    const choice = response.choices?.[0];
    if (!choice) return { content: "Pas de réponse de l'IA", tokensUsed: 0 };

    totalTokens += response.usage?.total_tokens ?? 0;
    const msg = choice.message;

    // No tool calls — return final response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { content: msg.content ?? "", tokensUsed: totalTokens, toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined };
    }

    // Add assistant message with tool calls
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });

    // Execute each tool call
    for (const tc of msg.tool_calls) {
      toolCallCount += 1;
      if (toolCallCount > MAX_TOOL_CALLS) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            error:
              "Limite d'execution atteinte. Reformule la demande ou reduis le nombre d'actions.",
          }),
        });
        continue;
      }

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }

      const signature = `${tc.function.name}:${JSON.stringify(args)}`;
      if (seenToolCalls.has(signature)) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: "Appel outil duplique bloque pour eviter une boucle." }),
        });
        continue;
      }
      seenToolCalls.add(signature);

      const result = await executeTool(tc.function.name, args);
      collectedToolCalls.push({ name: tc.function.name, args, result: result.slice(0, 500) });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result.slice(0, MAX_TOOL_RESULT_CHARS),
      });
    }
  }

  // Max iterations reached — return last assistant text, never raw tool JSON
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && typeof m.content === "string" && m.content.trim()) {
      return {
        content: m.content,
        tokensUsed: totalTokens,
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
      };
    }
  }
  return {
    content: "Trop d'étapes. Reformulez votre question.",
    tokensUsed: totalTokens,
    toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
  };
}

/** Generate a short conversation title from the first user message (ChatGPT-style). */
export async function generateConversationTitle(userMessage: string): Promise<string | null> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "Tu generes un titre court pour une conversation d'assistant admin. " +
        "N'ecris PAS de reflexion ni de bloc <thought>: reponds DIRECTEMENT par une ligne au format exact: " +
        "TITRE: <titre de 3 a 6 mots en francais>, sans markdown, sans guillemets, sans ponctuation finale. " +
        '"Exemples: TITRE: Stats ateliers mai — TITRE: Commandes en attente.',
    },
    { role: "user", content: `Sujet de la conversation: ${userMessage.slice(0, 500)}` },
  ];

  const providers: [OpenAI, string][] = [
    [createOpenCodeZenClient(), "mimo-v2.5-free"],
    [createGoogleClient(), "gemma-4-26b-a4b-it"],
    [createOpenRouterClient(), "google/gemma-4-26b-a4b-it:free"],
  ];

  // the model reasons inside <thought>…</thought> first — the real title comes after it
  const extractTitle = (raw: string): string | null => {
    const afterThought = raw.includes("</thought>")
      ? raw.slice(raw.lastIndexOf("</thought>") + "</thought>".length)
      : raw.replace(/<\/?thought>/g, " ");
    const firstLine =
      afterThought
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)[0] ?? "";
    const tagged = firstLine.match(/TITRE:\s*(.+)/i);
    const title = (tagged ? tagged[1] : firstLine)
      .replace(/^[\s\-*>#"'«»`]+/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/["'«»`.*]+$/, "")
      .trim();
    return title.length >= 3 && title.length <= 60 ? title : null;
  };

  const attempt = async (): Promise<string | null> => {
    for (const [client, model] of providers) {
      try {
        const r = await client.chat.completions.create({ model, messages, max_tokens: 1200 });
        const raw = r.choices?.[0]?.message?.content ?? "";
        const title = extractTitle(raw);
        if (title) return title;
        console.warn("[agent] title extraction failed:", JSON.stringify(raw.slice(0, 250)));
      } catch (err) {
        console.warn("[agent] title generation failed on", model, err);
      }
    }
    return null;
  };

  // never block the answer more than 20s on the title — fall back to the first message
  return Promise.race([
    attempt(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
  ]);
}

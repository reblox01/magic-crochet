import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

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

function createNimClient() {
  return new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_NIM_API_KEY ?? "",
    timeout: 45_000,
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
}

const MAX_ITERATIONS = 3;

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  tools: AgentTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
): Promise<AgentResult> {
  const openaiTools: ChatCompletionTool[] = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const client = createOpenRouterClient();
  let totalTokens = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Awaited<ReturnType<typeof client.chat.completions.create>>;

    try {
      response = await client.chat.completions.create({
        model: "qwen/qwen3-coder:free",
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? "auto" : undefined,
        max_tokens: 4096,
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.warn("[agent] OpenRouter failed:", err.status, err.message);
      console.warn("[agent] Falling back to NIM");
      try {
        const nimClient = createNimClient();
        response = await nimClient.chat.completions.create({
          model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
          messages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          tool_choice: openaiTools.length > 0 ? "auto" : undefined,
          max_tokens: 4096,
        });
      } catch (nimError: unknown) {
        const nimErr = nimError as { status?: number; message?: string };
        console.error("[agent] NIM also failed:", nimErr.status, nimErr.message);
        throw new Error(`AI indisponible. OpenRouter: ${err.message}. NIM: ${nimErr.message}`);
      }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error("Pas de réponse de l'IA");

    totalTokens += response.usage?.total_tokens ?? 0;
    const msg = choice.message;

    // No tool calls — return final response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { content: msg.content ?? "", tokensUsed: totalTokens };
    }

    // Add assistant message with tool calls
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });

    // Execute each tool call
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      const result = await executeTool(tc.function.name, args);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  // Max iterations reached — return last assistant content
  const lastMsg = messages[messages.length - 1];
  const content = lastMsg && "content" in lastMsg ? String(lastMsg.content ?? "") : "Trop d'étapes. Reformulez votre question.";
  return { content, tokensUsed: totalTokens };
}

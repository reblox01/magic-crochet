import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  name: "openrouter",
  headers: {
    "HTTP-Referer": "https://magic-crochet.vercel.app",
    "X-Title": "Magic Crochet Admin Agent",
  },
});

const nim = createOpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_NIM_API_KEY ?? "",
  name: "nvidia-nim",
});

export interface AgentStreamInput {
  messages: CoreMessage[];
  tools: Record<string, unknown>;
  maxSteps?: number;
  abortSignal?: AbortSignal;
}

export async function streamAgentResponse(input: AgentStreamInput) {
  const { messages, tools, maxSteps = 3, abortSignal } = input;

  try {
    return await streamText({
      model: openrouter("qwen/qwen3-coder-480b-a35b:free"),
      messages,
      tools,
      maxSteps,
      abortSignal,
      onStepFinish: async ({ toolCalls, toolResults }) => {
        if (toolCalls.length > 0) {
          console.log("[agent] tool calls:", toolCalls.map((t) => t.toolName).join(", "));
        }
      },
    });
  } catch (error: unknown) {
    const status = (error as { status?: number }).status;
    if (status === 429 || (status !== undefined && status >= 500)) {
      console.warn("[agent] OpenRouter failed, falling back to NIM");
      return await streamText({
        model: nim("nvidia/nemotron-3-ultra-550b-a55b"),
        messages,
        tools,
        maxSteps,
        abortSignal,
      });
    }
    throw error;
  }
}

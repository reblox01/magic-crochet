import { getAdminSupabase } from "@/lib/supabase";

export interface AgentMessage {
  id?: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_calls?: unknown;
  tool_results?: unknown;
  tokens_used?: number;
  created_at?: string;
}

export class MemoryManager {
  private admin = getAdminSupabase();

  async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    if (conversationId) return conversationId;

    const { data } = await this.admin
      .from("agent_conversations")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) return data.id;

    const { data: created } = await this.admin
      .from("agent_conversations")
      .insert({ user_id: userId, title: "Nouvelle conversation" })
      .select("id")
      .single();

    return created!.id;
  }

  async saveMessage(conversationId: string, msg: AgentMessage): Promise<void> {
    await this.admin.from("agent_messages").insert({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls ?? null,
      tool_results: msg.tool_results ?? null,
      tokens_used: msg.tokens_used ?? null,
    });

    // Touch conversation updated_at
    await this.admin
      .from("agent_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  async getRecentMessages(conversationId: string, limit = 30): Promise<AgentMessage[]> {
    const { data } = await this.admin
      .from("agent_messages")
      .select("role, content, tool_calls, tool_results, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).reverse();
  }

  async getConversationSummary(conversationId: string): Promise<string | null> {
    const { data } = await this.admin
      .from("agent_conversations")
      .select("summary")
      .eq("id", conversationId)
      .single();

    return data?.summary ?? null;
  }

  async updateSummary(conversationId: string, summary: string): Promise<void> {
    await this.admin
      .from("agent_conversations")
      .update({ summary })
      .eq("id", conversationId);
  }

  async listConversations(userId: string, limit = 20): Promise<{ id: string; title: string | null; updated_at: string }[]> {
    const { data } = await this.admin
      .from("agent_conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    return data ?? [];
  }

  // ---- Delete tokens (safety flow) ----

  async createDeleteToken(userId: string, entityType: string, entityId: string, entityName: string): Promise<string> {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await this.admin.from("agent_delete_tokens").insert({
      token,
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
    });
    return token;
  }

  async validateDeleteToken(token: string): Promise<{ valid: boolean; entityType?: string; entityId?: string; entityName?: string }> {
    const { data } = await this.admin
      .from("agent_delete_tokens")
      .select("entity_type, entity_id, entity_name, used, created_at")
      .eq("token", token)
      .single();

    if (!data || data.used) return { valid: false };

    // Token expires after 5 minutes
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > 5 * 60 * 1000) return { valid: false };

    return {
      valid: true,
      entityType: data.entity_type,
      entityId: data.entity_id,
      entityName: data.entity_name,
    };
  }

  async markDeleteTokenUsed(token: string): Promise<void> {
    await this.admin
      .from("agent_delete_tokens")
      .update({ used: true })
      .eq("token", token);
  }
}

-- AI Admin Agent tables
-- Run after all previous migrations

-- Enable pgvector for semantic memory (skip if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Long-term memories (feature-flagged for v1.1)
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance FLOAT DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delete confirmation tokens
CREATE TABLE IF NOT EXISTS agent_delete_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_delete_tokens_token ON agent_delete_tokens(token) WHERE used = FALSE;

-- RLS policies
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_delete_tokens ENABLE ROW LEVEL SECURITY;

-- Agent tables: admin/owner only (via service role, RLS is bypassed)
-- But for browser client reads (conversations list), allow authenticated admins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_conversations_admin' AND tablename = 'agent_conversations') THEN
    CREATE POLICY agent_conversations_admin ON agent_conversations
      FOR ALL USING (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_messages_admin' AND tablename = 'agent_messages') THEN
    CREATE POLICY agent_messages_admin ON agent_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM agent_conversations c
          WHERE c.id = agent_messages.conversation_id
          AND c.user_id = auth.uid()
          AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- agent_memories: service role only (no RLS policy = blocked for anon/auth)
-- agent_delete_tokens: service role only

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;

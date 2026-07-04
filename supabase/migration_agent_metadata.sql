-- Add metadata column to agent_messages for storing file attachments
ALTER TABLE agent_messages ADD COLUMN IF NOT EXISTS metadata JSONB;

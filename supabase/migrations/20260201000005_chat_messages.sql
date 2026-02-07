-- Chat Messages table for persistent memory
-- Stores all chat conversations so Claude can reference history

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments JSONB, -- Array of {name, type} for attached files
  metadata JSONB, -- Additional context like what data was modified
  session_id UUID, -- Optional grouping for conversation sessions
  user_id UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_role ON public.chat_messages(role);

-- Full-text search index for searching chat history
CREATE INDEX idx_chat_messages_content_search ON public.chat_messages
  USING GIN (to_tsvector('english', content));

-- RLS Policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to search chat history
CREATE OR REPLACE FUNCTION search_chat_history(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.role,
    cm.content,
    cm.created_at,
    ts_rank(to_tsvector('english', cm.content), plainto_tsquery('english', search_query)) as rank
  FROM public.chat_messages cm
  WHERE to_tsvector('english', cm.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, cm.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get relevant context from chat history
-- Searches for messages related to a topic/entity
CREATE OR REPLACE FUNCTION get_relevant_chat_context(
  topic TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.role,
    cm.content,
    cm.created_at
  FROM public.chat_messages cm
  WHERE to_tsvector('english', cm.content) @@ plainto_tsquery('english', topic)
  ORDER BY cm.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

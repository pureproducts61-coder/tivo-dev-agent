CREATE TABLE IF NOT EXISTS public.ai_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'system',
  owner_user_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_memories_scope ON public.ai_memories(scope);
CREATE INDEX IF NOT EXISTS idx_ai_memories_owner_user_id ON public.ai_memories(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_tags ON public.ai_memories USING GIN(tags);

DROP POLICY IF EXISTS "Admins can manage all AI memories" ON public.ai_memories;
DROP POLICY IF EXISTS "Users can view own AI memories" ON public.ai_memories;
DROP POLICY IF EXISTS "Users can create own AI memories" ON public.ai_memories;
DROP POLICY IF EXISTS "Users can update own AI memories" ON public.ai_memories;

CREATE POLICY "Admins can manage all AI memories"
ON public.ai_memories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own AI memories"
ON public.ai_memories
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid() AND scope IN ('user', 'project'));

CREATE POLICY "Users can create own AI memories"
ON public.ai_memories
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND scope IN ('user', 'project'));

CREATE POLICY "Users can update own AI memories"
ON public.ai_memories
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid() AND scope IN ('user', 'project'))
WITH CHECK (owner_user_id = auth.uid() AND scope IN ('user', 'project'));

DROP TRIGGER IF EXISTS update_ai_memories_updated_at ON public.ai_memories;
CREATE TRIGGER update_ai_memories_updated_at
BEFORE UPDATE ON public.ai_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
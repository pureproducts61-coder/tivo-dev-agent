
-- 1) Stop publishing ai_proposals to realtime (channel-level auth not configurable here)
ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_proposals;

-- 2) ai_memories explicit delete policy (users only delete own user/project scope; never system)
DROP POLICY IF EXISTS "Users can delete own AI memories" ON public.ai_memories;
CREATE POLICY "Users can delete own AI memories"
  ON public.ai_memories FOR DELETE TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND scope = ANY (ARRAY['user'::text, 'project'::text])
  );

-- 3) Explicit user UPDATE deny on user_credits (defence-in-depth alongside guard trigger)
DROP POLICY IF EXISTS "Users cannot update credits directly" ON public.user_credits;
CREATE POLICY "Users cannot update credits directly"
  ON public.user_credits FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

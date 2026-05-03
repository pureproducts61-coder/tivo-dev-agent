-- Fix privilege escalation: prevent users from updating their own credits/plan
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- Allow users to safely reset only daily/monthly counters via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.consume_credit(_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.user_credits
    SET used_today = used_today + _amount,
        used_month = used_month + _amount,
        updated_at = now()
    WHERE user_id = auth.uid()
      AND (daily_credits - used_today) >= _amount
    RETURNING (daily_credits - used_today) INTO remaining;
  RETURN FOUND;
END;
$$;

-- Add explicit SELECT policy on ai_proposals so users only see their own
CREATE POLICY "Users can view own proposals"
  ON public.ai_proposals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requested_by);

-- GDPR: allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Harden handle_new_user against unsafe metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  safe_name text;
BEGIN
  safe_name := LEFT(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), 100);
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(safe_name, ''));
  RETURN NEW;
END;
$$;
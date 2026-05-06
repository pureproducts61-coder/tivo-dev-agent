
-- 1) Realtime: ensure RLS is enforced on change events for ai_proposals
ALTER TABLE public.ai_proposals REPLICA IDENTITY FULL;

-- 2) Harden handle_new_user trigger: strip control chars, limit length, sanitize email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_name text;
  safe_name text;
  safe_email text;
BEGIN
  raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  -- strip control chars and HTML/script-like brackets
  raw_name := regexp_replace(raw_name, '[[:cntrl:]<>"`'']', '', 'g');
  safe_name := NULLIF(LEFT(TRIM(raw_name), 100), '');

  safe_email := LEFT(TRIM(COALESCE(NEW.email, '')), 255);
  IF safe_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    safe_email := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, safe_email, safe_name);
  RETURN NEW;
END;
$$;

-- 3) Server-side secret storage to replace localStorage tokens
CREATE TABLE IF NOT EXISTS public.user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own secrets select"
  ON public.user_secrets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users manage own secrets insert"
  ON public.user_secrets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own secrets update"
  ON public.user_secrets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own secrets delete"
  ON public.user_secrets FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_secrets_updated_at
  BEFORE UPDATE ON public.user_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Lock down user_credits: ensure users cannot UPDATE plan/credits directly.
-- (No user UPDATE policy exists; admin policy stays. Add explicit guard via trigger
--  to prevent privilege-elevating columns from being changed by non-admin paths.)
CREATE OR REPLACE FUNCTION public.guard_user_credits_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins anything
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Allow SECURITY DEFINER server functions (no auth.uid in some contexts) to manage usage counters,
  -- but never allow changing plan / limits / payment status from non-admin contexts.
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.daily_credits IS DISTINCT FROM OLD.daily_credits
     OR NEW.monthly_credits IS DISTINCT FROM OLD.monthly_credits
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
    RAISE EXCEPTION 'Not authorized to modify plan or credit limits';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_credits_update_trg ON public.user_credits;
CREATE TRIGGER guard_user_credits_update_trg
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_credits_update();

-- Admin-only function for plan transitions
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  _user_id uuid,
  _plan text,
  _daily_credits integer,
  _monthly_credits integer,
  _payment_status text DEFAULT 'paid',
  _transaction_id text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _plan NOT IN ('free','starter','pro','enterprise') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;
  UPDATE public.user_credits
    SET plan = _plan,
        daily_credits = GREATEST(_daily_credits, 0),
        monthly_credits = GREATEST(_monthly_credits, 0),
        payment_status = _payment_status,
        transaction_id = COALESCE(_transaction_id, transaction_id),
        updated_at = now()
    WHERE user_id = _user_id;
  RETURN FOUND;
END;
$$;

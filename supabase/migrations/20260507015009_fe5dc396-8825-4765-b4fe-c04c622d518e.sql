
-- Admin RPC to block/unblock users without tripping guard trigger
CREATE OR REPLACE FUNCTION public.admin_block_user(_user_id uuid, _block boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.user_credits
    SET plan = CASE WHEN _block THEN 'blocked' ELSE 'free' END,
        daily_credits = CASE WHEN _block THEN 0 ELSE 5 END,
        monthly_credits = CASE WHEN _block THEN 0 ELSE 50 END,
        updated_at = now()
    WHERE user_id = _user_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_block_user(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, boolean) TO authenticated;

-- Admin RPC to update individual credit limits (daily/monthly) safely
CREATE OR REPLACE FUNCTION public.admin_update_credit_limits(_user_id uuid, _daily integer, _monthly integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.user_credits
    SET daily_credits = GREATEST(_daily, 0),
        monthly_credits = GREATEST(_monthly, 0),
        updated_at = now()
    WHERE user_id = _user_id;
  RETURN FOUND;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_update_credit_limits(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_credit_limits(uuid, integer, integer) TO authenticated;

-- Ensure super-admin (pureproducts61@gmail.com) is in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'pureproducts61@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

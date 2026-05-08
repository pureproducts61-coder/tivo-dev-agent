
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_block_user(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_credit_limits(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_credit_limits(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) TO authenticated;

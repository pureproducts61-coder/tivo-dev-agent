
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.guard_user_credits_update() FROM PUBLIC, anon, authenticated;

-- Tighten existing helpers too (only authenticated need consume_credit)
REVOKE EXECUTE ON FUNCTION public.consume_credit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit(integer) TO authenticated;

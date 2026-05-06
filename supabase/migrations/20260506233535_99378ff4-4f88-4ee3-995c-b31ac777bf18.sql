
-- Trigger-only functions: revoke all direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_credits_update() FROM PUBLIC, anon, authenticated;

-- Functions needed at runtime: revoke anon, allow authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_credit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit(integer) TO authenticated;

-- admin_set_user_plan: revoke from anon, keep authenticated (function body enforces admin via has_role)
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, integer, integer, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_credit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit(integer) TO authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) IN ('pureproducts61@gmail.com','sheikhrazwan1110@gmail.com','service.mdrazwan@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_credits DISABLE TRIGGER USER;

UPDATE public.user_credits uc
SET plan = 'enterprise',
    daily_credits = 1000000,
    monthly_credits = 30000000,
    payment_status = 'paid',
    updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = uc.user_id AND ur.role = 'admin';

INSERT INTO public.user_credits (user_id, plan, daily_credits, monthly_credits, payment_status)
SELECT ur.user_id, 'enterprise', 1000000, 30000000, 'paid'
FROM public.user_roles ur
LEFT JOIN public.user_credits uc ON uc.user_id = ur.user_id
WHERE ur.role = 'admin' AND uc.user_id IS NULL;

ALTER TABLE public.user_credits ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.auto_promote_admin_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) IN ('pureproducts61@gmail.com','sheikhrazwan1110@gmail.com','service.mdrazwan@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    BEGIN
      ALTER TABLE public.user_credits DISABLE TRIGGER USER;
      UPDATE public.user_credits
        SET plan='enterprise', daily_credits=1000000, monthly_credits=30000000, payment_status='paid', updated_at=now()
        WHERE user_id = NEW.id;
      ALTER TABLE public.user_credits ENABLE TRIGGER USER;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_admin ON auth.users;
CREATE TRIGGER on_auth_user_auto_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_admin_emails();

-- Update guard to also allow when the row's user has admin role (admins themselves can update via RPCs)
-- and to allow when no auth.uid (server-side migrations / SECURITY DEFINER server scripts) but only if explicit GUC bypass is set.
CREATE OR REPLACE FUNCTION public.guard_user_credits_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.bypass_credit_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;
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

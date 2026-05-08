
CREATE TABLE IF NOT EXISTS public.ai_system_core (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'ai',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, key)
);
ALTER TABLE public.ai_system_core ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_system_core" ON public.ai_system_core
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_system_core_set_updated_at
BEFORE UPDATE ON public.ai_system_core
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_rollback_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.ai_proposals(id) ON DELETE SET NULL,
  target_table text NOT NULL,
  before_state jsonb NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);
ALTER TABLE public.ai_rollback_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rollback" ON public.ai_rollback_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

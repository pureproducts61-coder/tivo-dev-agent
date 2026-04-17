-- AI Proposals table for admin approval workflow
CREATE TABLE public.ai_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'deployment' | 'schema_change' | 'cost_action' | 'config_change' | 'other'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  estimated_cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  requested_by UUID,
  reviewed_by UUID,
  review_note TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage proposals
CREATE POLICY "Admins can manage all proposals"
ON public.ai_proposals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users (AI system acting as user) can create proposals
CREATE POLICY "Authenticated users can create proposals"
ON public.ai_proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requested_by);

-- Trigger for updated_at
CREATE TRIGGER update_ai_proposals_updated_at
BEFORE UPDATE ON public.ai_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_ai_proposals_status ON public.ai_proposals(status, created_at DESC);

-- Enable realtime
ALTER TABLE public.ai_proposals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_proposals;
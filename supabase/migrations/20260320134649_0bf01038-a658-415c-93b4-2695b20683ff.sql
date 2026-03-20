
-- Staff changes table for dual-approval staff management
CREATE TABLE public.staff_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors manage staff changes"
  ON public.staff_changes FOR ALL
  TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

CREATE TRIGGER update_staff_changes_updated_at
  BEFORE UPDATE ON public.staff_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

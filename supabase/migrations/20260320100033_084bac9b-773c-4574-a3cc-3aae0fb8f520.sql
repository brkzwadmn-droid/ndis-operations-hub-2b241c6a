
-- =============================================
-- 1. CLIENTS TABLE
-- =============================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  ndis_number TEXT,
  address TEXT,
  expected_lat DOUBLE PRECISION,
  expected_lng DOUBLE PRECISION,
  location_radius_meters INTEGER DEFAULT 200,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Directors manage clients" ON public.clients FOR ALL TO authenticated USING (is_director()) WITH CHECK (is_director());
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. UPDATE TASKS TABLE
-- =============================================
ALTER TABLE public.tasks
  ADD COLUMN photo_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN added_by_self BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN incomplete_reason TEXT;

-- =============================================
-- 3. UPDATE SHIFTS TABLE - GPS & handover
-- =============================================
ALTER TABLE public.shifts
  ADD COLUMN clock_in_lat DOUBLE PRECISION,
  ADD COLUMN clock_in_lng DOUBLE PRECISION,
  ADD COLUMN clock_out_lat DOUBLE PRECISION,
  ADD COLUMN clock_out_lng DOUBLE PRECISION,
  ADD COLUMN clock_in_location_valid BOOLEAN,
  ADD COLUMN clock_out_location_valid BOOLEAN,
  ADD COLUMN handover_completed BOOLEAN DEFAULT false,
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- =============================================
-- 4. PROGRESS NOTES TABLE
-- =============================================
CREATE TABLE public.progress_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own progress notes" ON public.progress_notes FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users see own progress notes" ON public.progress_notes FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users update own progress notes" ON public.progress_notes FOR UPDATE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Directors see all progress notes" ON public.progress_notes FOR SELECT TO authenticated USING (is_director());
CREATE TRIGGER update_progress_notes_updated_at BEFORE UPDATE ON public.progress_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. INCIDENT REPORTS TABLE
-- =============================================
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own incident reports" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users see own incident reports" ON public.incident_reports FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Directors see all incident reports" ON public.incident_reports FOR SELECT TO authenticated USING (is_director());
CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. ABC CHARTS TABLE
-- =============================================
CREATE TABLE public.abc_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  antecedent TEXT NOT NULL,
  behaviour TEXT NOT NULL,
  consequence TEXT NOT NULL,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abc_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own abc charts" ON public.abc_charts FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users see own abc charts" ON public.abc_charts FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Directors see all abc charts" ON public.abc_charts FOR SELECT TO authenticated USING (is_director());

-- =============================================
-- 7. HANDOVER CHECKLISTS TABLE
-- =============================================
CREATE TABLE public.handover_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  checklist_type TEXT NOT NULL DEFAULT 'incoming',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.handover_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own handover checklists" ON public.handover_checklists FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Directors see all handover checklists" ON public.handover_checklists FOR SELECT TO authenticated USING (is_director());

-- =============================================
-- 8. SHIFT REVIEWS (Call Sessions)
-- =============================================
CREATE TABLE public.shift_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  director1_id UUID NOT NULL REFERENCES public.profiles(id),
  director2_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  summary_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Directors manage shift reviews" ON public.shift_reviews FOR ALL TO authenticated USING (is_director()) WITH CHECK (is_director());
CREATE TRIGGER update_shift_reviews_updated_at BEFORE UPDATE ON public.shift_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. SHIFT REVIEW ITEMS (per-task review)
-- =============================================
CREATE TABLE public.shift_review_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.shift_reviews(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  director1_approved BOOLEAN DEFAULT false,
  director2_approved BOOLEAN DEFAULT false,
  decision TEXT,
  reassigned_to UUID REFERENCES public.profiles(id),
  reassigned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Directors manage review items" ON public.shift_review_items FOR ALL TO authenticated USING (is_director()) WITH CHECK (is_director());
CREATE TRIGGER update_shift_review_items_updated_at BEFORE UPDATE ON public.shift_review_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. AUDIT LOG
-- =============================================
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Directors see audit log" ON public.audit_log FOR SELECT TO authenticated USING (is_director());
CREATE POLICY "Authenticated users create audit entries" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Index for audit log queries
CREATE INDEX idx_audit_log_profile ON public.audit_log(profile_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- =============================================
-- 11. STORAGE BUCKETS for new uploads
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('handover-photos', 'handover-photos', false) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users upload progress photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'progress-photos');
CREATE POLICY "Auth users view progress photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'progress-photos');
CREATE POLICY "Auth users upload incident photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'incident-photos');
CREATE POLICY "Auth users view incident photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'incident-photos');
CREATE POLICY "Auth users upload handover photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'handover-photos');
CREATE POLICY "Auth users view handover photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'handover-photos');

-- =============================================
-- 12. Enable realtime for shift reviews
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_review_items;

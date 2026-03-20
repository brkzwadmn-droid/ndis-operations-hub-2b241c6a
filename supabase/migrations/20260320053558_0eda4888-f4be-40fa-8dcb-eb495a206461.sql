
-- Role enum
CREATE TYPE public.app_role AS ENUM ('director', 'manager', 'team_leader', 'support_worker');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'support_worker',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (for security helper)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Task status enum
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');

-- Shift status enum
CREATE TYPE public.shift_status AS ENUM ('open', 'closed', 'submitted', 'approved', 'rejected');

-- Approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Finance type enum
CREATE TYPE public.finance_type AS ENUM ('income', 'expense');

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status task_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  photo_url TEXT,
  is_end_of_day BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Shifts table
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status shift_status NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Shift approvals table
CREATE TABLE public.shift_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES public.profiles(id),
  status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shift_id, director_id)
);
ALTER TABLE public.shift_approvals ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Finance entries table
CREATE TABLE public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type finance_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

-- Storage bucket for task photos
INSERT INTO storage.buckets (id, name, public) VALUES ('task-photos', 'task-photos', false);

-- HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'director')
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shift_approvals_updated_at BEFORE UPDATE ON public.shift_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'support_worker')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'support_worker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- Profiles: everyone authenticated can see all profiles, only self can update own, directors can update any
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Directors can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_director());
CREATE POLICY "Directors can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_director());

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_director());
CREATE POLICY "Directors can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_director());

-- Tasks: directors see all, others see assigned tasks
CREATE POLICY "Directors see all tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_director());
CREATE POLICY "Users see assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Directors create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_director());
CREATE POLICY "Directors update any task" ON public.tasks FOR UPDATE TO authenticated USING (public.is_director());
CREATE POLICY "Assignees update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Directors delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_director());

-- Shifts: directors see all, owners see own
CREATE POLICY "Directors see all shifts" ON public.shifts FOR SELECT TO authenticated USING (public.is_director());
CREATE POLICY "Users see own shifts" ON public.shifts FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users create own shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users update own shifts" ON public.shifts FOR UPDATE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Directors update any shift" ON public.shifts FOR UPDATE TO authenticated USING (public.is_director());
CREATE POLICY "Directors delete shifts" ON public.shifts FOR DELETE TO authenticated USING (public.is_director());

-- Shift approvals: directors only
CREATE POLICY "Directors manage approvals" ON public.shift_approvals FOR ALL TO authenticated USING (public.is_director());
CREATE POLICY "Shift owners can view approvals" ON public.shift_approvals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shifts WHERE shifts.id = shift_id AND shifts.profile_id = auth.uid())
);

-- Notifications: users see own
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- Finance entries: directors only
CREATE POLICY "Directors manage finance" ON public.finance_entries FOR ALL TO authenticated USING (public.is_director());

-- Storage policies for task-photos
CREATE POLICY "Auth users can upload task photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-photos');
CREATE POLICY "Auth users can view task photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-photos');
CREATE POLICY "Auth users can delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

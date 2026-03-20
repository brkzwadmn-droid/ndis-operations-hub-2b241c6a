
-- Replace overly permissive notification INSERT with a tighter policy
DROP POLICY IF EXISTS "Authenticated users create notifications" ON public.notifications;

-- Allow directors/managers to create notifications for anyone, and others for themselves only
CREATE POLICY "Users create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_director() OR is_manager() OR profile_id = auth.uid()
);

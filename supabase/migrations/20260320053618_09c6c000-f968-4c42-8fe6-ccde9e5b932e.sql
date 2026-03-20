
-- Fix overly permissive notification INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;

-- Only directors and the system can create notifications for any user
-- Regular users shouldn't create notifications for themselves
CREATE POLICY "Directors can create notifications" ON public.notifications 
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_director() OR profile_id = auth.uid());


-- Allow managers to insert their own tasks (self-assigned)
CREATE POLICY "Managers create own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (is_manager() AND assigned_to = auth.uid() AND assigned_by = auth.uid());

-- Allow all authenticated users to insert notifications (needed for shift submissions, approvals, etc.)
CREATE POLICY "Authenticated users create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop the old restrictive directors-only notification insert policy
DROP POLICY IF EXISTS "Directors can create notifications" ON public.notifications;

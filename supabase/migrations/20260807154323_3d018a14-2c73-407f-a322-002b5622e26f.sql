-- attendance_records: allow class teacher / admin to correct or remove records
CREATE POLICY "records update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "records delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

-- user_roles: explicit admin-only write policies (non-admins remain fully blocked)
CREATE POLICY "roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "roles update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "roles delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT UPDATE, DELETE ON public.attendance_records TO authenticated;
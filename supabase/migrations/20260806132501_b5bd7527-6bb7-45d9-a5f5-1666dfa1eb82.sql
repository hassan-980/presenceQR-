
CREATE OR REPLACE FUNCTION private.is_class_teacher(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = _class_id AND c.teacher_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.is_enrolled(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = _class_id AND e.student_id = _user_id)
$$;

REVOKE ALL ON FUNCTION private.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_enrolled(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_class_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_enrolled(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "classes read" ON public.classes;
CREATE POLICY "classes read" ON public.classes FOR SELECT TO authenticated
USING (teacher_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.is_enrolled(id, auth.uid()));

DROP POLICY IF EXISTS "enrollments read" ON public.enrollments;
CREATE POLICY "enrollments read" ON public.enrollments FOR SELECT TO authenticated
USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "enrollments write" ON public.enrollments;
CREATE POLICY "enrollments write" ON public.enrollments FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(),'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "enrollments delete" ON public.enrollments;
CREATE POLICY "enrollments delete" ON public.enrollments FOR DELETE TO authenticated
USING (private.has_role(auth.uid(),'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "sessions insert" ON public.attendance_sessions;
CREATE POLICY "sessions insert" ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid() AND private.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "sessions read" ON public.attendance_sessions;
CREATE POLICY "sessions read" ON public.attendance_sessions FOR SELECT TO authenticated
USING (teacher_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.is_enrolled(class_id, auth.uid()));

DROP POLICY IF EXISTS "records read" ON public.attendance_records;
CREATE POLICY "records read" ON public.attendance_records FOR SELECT TO authenticated
USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.is_class_teacher(class_id, auth.uid()));

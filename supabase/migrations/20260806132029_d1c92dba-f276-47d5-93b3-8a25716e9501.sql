CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- profiles
DROP POLICY "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
USING ((id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));
DROP POLICY "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
USING ((id = auth.uid()) OR private.has_role(auth.uid(),'admin'))
WITH CHECK ((id = auth.uid()) OR private.has_role(auth.uid(),'admin'));

-- user_roles
DROP POLICY "roles read" ON public.user_roles;
CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

-- classes
DROP POLICY "classes read" ON public.classes;
CREATE POLICY "classes read" ON public.classes FOR SELECT TO authenticated
USING ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = classes.id AND e.student_id = auth.uid()));
DROP POLICY "classes insert" ON public.classes;
CREATE POLICY "classes insert" ON public.classes FOR INSERT TO authenticated
WITH CHECK (((teacher_id = auth.uid()) AND private.has_role(auth.uid(),'teacher')) OR private.has_role(auth.uid(),'admin'));
DROP POLICY "classes update" ON public.classes;
CREATE POLICY "classes update" ON public.classes FOR UPDATE TO authenticated
USING ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin'))
WITH CHECK ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin'));
DROP POLICY "classes delete" ON public.classes;
CREATE POLICY "classes delete" ON public.classes FOR DELETE TO authenticated
USING ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin'));

-- enrollments
DROP POLICY "enrollments read" ON public.enrollments;
CREATE POLICY "enrollments read" ON public.enrollments FOR SELECT TO authenticated
USING ((student_id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.teacher_id = auth.uid()));
DROP POLICY "enrollments write" ON public.enrollments;
CREATE POLICY "enrollments write" ON public.enrollments FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.teacher_id = auth.uid()));
DROP POLICY "enrollments delete" ON public.enrollments;
CREATE POLICY "enrollments delete" ON public.enrollments FOR DELETE TO authenticated
USING (private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.teacher_id = auth.uid()));

-- attendance_sessions
DROP POLICY "sessions read" ON public.attendance_sessions;
CREATE POLICY "sessions read" ON public.attendance_sessions FOR SELECT TO authenticated
USING ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = attendance_sessions.class_id AND e.student_id = auth.uid()));
DROP POLICY "sessions update" ON public.attendance_sessions;
CREATE POLICY "sessions update" ON public.attendance_sessions FOR UPDATE TO authenticated
USING ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin'))
WITH CHECK ((teacher_id = auth.uid()) OR private.has_role(auth.uid(),'admin'));

-- attendance_records
DROP POLICY "records read" ON public.attendance_records;
CREATE POLICY "records read" ON public.attendance_records FOR SELECT TO authenticated
USING ((student_id = auth.uid()) OR private.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = attendance_records.class_id AND c.teacher_id = auth.uid()));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
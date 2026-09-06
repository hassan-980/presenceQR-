ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_class_id_fkey,
  ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_sessions DROP CONSTRAINT attendance_sessions_class_id_fkey,
  ADD CONSTRAINT attendance_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_class_id_fkey,
  ADD CONSTRAINT attendance_records_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_session_id_fkey,
  ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;

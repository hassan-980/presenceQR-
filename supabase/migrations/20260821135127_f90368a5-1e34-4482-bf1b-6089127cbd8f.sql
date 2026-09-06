-- Secure RPCs so the app never needs the service-role key

CREATE OR REPLACE FUNCTION public.rpc_join_class(_class_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; uid uuid := auth.uid(); already boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'You must be signed in.'); END IF;
  SELECT id, name, code, teacher_id INTO c FROM public.classes WHERE id = _class_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'This class link is not valid.'); END IF;
  IF c.teacher_id = uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'You are the teacher of this class.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id = c.id AND student_id = uid) INTO already;
  INSERT INTO public.enrollments (class_id, student_id) VALUES (c.id, uid)
  ON CONFLICT (class_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'name', c.name, 'code', c.code, 'already', already);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_mark_attendance(_token text, _lat double precision, _lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; uid uuid := auth.uid(); dist double precision;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'You must be signed in.'); END IF;
  SELECT id, class_id, latitude, longitude, radius_m, expires_at INTO s
  FROM public.attendance_sessions WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Invalid QR code, or you are not enrolled in this class.');
  END IF;
  IF s.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This attendance session has expired.');
  END IF;

  dist := 2 * 6371000 * asin(sqrt(
    power(sin(radians(s.latitude - _lat) / 2), 2) +
    cos(radians(_lat)) * cos(radians(s.latitude)) *
    power(sin(radians(s.longitude - _lng) / 2), 2)
  ));

  IF dist > s.radius_m THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'You are ' || round(dist)::text || 'm away — you must be within ' || s.radius_m::text || 'm of the classroom.');
  END IF;

  INSERT INTO public.enrollments (class_id, student_id) VALUES (s.class_id, uid)
  ON CONFLICT (class_id, student_id) DO NOTHING;

  INSERT INTO public.attendance_records (session_id, class_id, student_id, latitude, longitude, distance_m)
  VALUES (s.id, s.class_id, uid, _lat, _lng, round(dist))
  ON CONFLICT (session_id, student_id) DO NOTHING;

  IF NOT FOUND AND EXISTS (
    SELECT 1 FROM public.attendance_records WHERE session_id = s.id AND student_id = uid AND marked_at < now() - interval '1 second'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Attendance already marked for this session.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'distance', round(dist));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_session(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id, teacher_id INTO s FROM public.attendance_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  IF s.teacher_id <> uid AND NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.attendance_sessions WHERE id = _session_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_set_user_role(_user_id uuid, _role public.app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_join_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_mark_attendance(text, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_delete_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_set_user_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rpc_join_class(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_mark_attendance(text, double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_delete_session(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_set_user_role(uuid, public.app_role) TO authenticated, service_role;
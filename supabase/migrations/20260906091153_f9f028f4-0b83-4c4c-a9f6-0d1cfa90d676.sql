CREATE OR REPLACE FUNCTION public.rpc_delete_session(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE s record; uid uuid := auth.uid(); is_admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id, teacher_id INTO s FROM public.attendance_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'admin') INTO is_admin;
  IF s.teacher_id <> uid AND NOT is_admin THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.attendance_sessions WHERE id = _session_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.rpc_delete_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_delete_session(uuid) TO authenticated, service_role;
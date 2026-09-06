import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const markSchema = z.object({
  token: z.string().trim().min(6).max(128),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
});

type MarkResult = { ok: true; distance: number } | { ok: false; reason: string };
type JoinResult =
  | { ok: true; name: string; code: string; already: boolean }
  | { ok: false; reason: string };

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => markSchema.parse(data))
  .handler(async ({ data, context }): Promise<MarkResult> => {
    const { data: result, error } = await context.supabase.rpc("rpc_mark_attendance", {
      _token: data.token,
      _lat: data.latitude,
      _lng: data.longitude,
    });

    if (error) {
      console.error("[markAttendance]", error);
      throw new Error("Could not save attendance.");
    }
    return result as unknown as MarkResult;
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["student", "teacher", "admin"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rpc_set_user_role", {
      _user_id: data.userId,
      _role: data.role,
    });
    if (error) {
      console.error("[setUserRole]", error);
      throw new Error("Could not update role.");
    }
    return { ok: true };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rpc_delete_session", {
      _session_id: data.sessionId,
    });
    if (error) {
      console.error("[deleteSession]", error);
      throw new Error("Could not delete the session.");
    }
    return { ok: true };
  });

export const joinClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ classId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<JoinResult> => {
    const { data: result, error } = await context.supabase.rpc("rpc_join_class", {
      _class_id: data.classId,
    });
    if (error) {
      console.error("[joinClass]", error);
      return { ok: false, reason: `Could not enroll you in this class: ${error.message}` };
    }
    return result as unknown as JoinResult;
  });

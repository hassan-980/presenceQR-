import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, CheckCircle2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QrScanner } from "@/components/QrScanner";
import { markAttendance } from "@/lib/attendance.functions";
import { getPosition } from "@/hooks/useProfile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StudentDashboard({ userId, name }: { userId: string; name: string }) {
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["student-attendance", userId],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id, classes(id, name, code)")
        .eq("student_id", userId);

      const classIds = (enrollments ?? []).map((e) => e.class_id);
      if (classIds.length === 0) return { classes: [], records: [] };

      const [{ data: sessions }, { data: records }] = await Promise.all([
        supabase.from("attendance_sessions").select("id, class_id, started_at").in("class_id", classIds),
        supabase
          .from("attendance_records")
          .select("id, class_id, session_id, marked_at")
          .eq("student_id", userId)
          .order("marked_at", { ascending: false }),
      ]);

      const classes = (enrollments ?? []).map((e) => {
        const cls = e.classes as unknown as { id: string; name: string; code: string };
        const total = (sessions ?? []).filter((s) => s.class_id === e.class_id).length;
        const present = (records ?? []).filter((r) => r.class_id === e.class_id).length;
        return {
          id: cls.id,
          name: cls.name,
          code: cls.code,
          total,
          present,
          percent: total ? Math.round((present / total) * 100) : 0,
        };
      });

      const classMap = new Map(classes.map((c) => [c.id, c]));
      return {
        classes,
        records: (records ?? []).map((r) => ({
          ...r,
          className: classMap.get(r.class_id)?.name ?? "—",
        })),
      };
    },
  });

  const overall = useMemo(() => {
    const total = (data?.classes ?? []).reduce((s, c) => s + c.total, 0);
    const present = (data?.classes ?? []).reduce((s, c) => s + c.present, 0);
    return { total, present, percent: total ? Math.round((present / total) * 100) : 0 };
  }, [data]);

  async function submitToken(token: string) {
    setScanning(false);
    setBusy(true);
    try {
      const pos = await getPosition();
      const res = await markAttendance({
        data: {
          token,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
      if (res.ok) {
        toast.success(`Attendance marked — ${res.distance}m from the classroom.`);
        queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
      } else {
        toast.error(res.reason);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark attendance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hi, {name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Your attendance across all enrolled classes.</p>
        </div>
        <Button size="lg" onClick={() => setScanning(true)} disabled={busy}>
          <QrCode className="size-4" /> {busy ? "Marking…" : "Scan QR to mark"}
        </Button>
      </div>

      <section className="surface-card p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Overall attendance</p>
            <p className="font-display text-5xl font-bold">{overall.percent}%</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {overall.present} of {overall.total} sessions attended
          </p>
        </div>
        <Progress value={overall.percent} className="mt-4" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.classes ?? []).map((c) => (
          <article key={c.id} className="surface-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.code}</p>
            <h2 className="mt-1 text-lg font-semibold">{c.name}</h2>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-3xl font-semibold">{c.percent}%</span>
              <span className="text-sm text-muted-foreground">
                {c.present}/{c.total}
              </span>
            </div>
            <Progress value={c.percent} className="mt-3" />
          </article>
        ))}
        {data && data.classes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You are not enrolled in any class yet. Ask your teacher to add you.
          </p>
        )}
      </section>

      <section className="surface-card overflow-hidden">
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-base font-semibold">
          <CalendarClock className="size-4 text-primary" /> Recent scans
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Marked at</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.records ?? []).slice(0, 15).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.className}</TableCell>
                <TableCell>{new Date(r.marked_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    <CheckCircle2 className="size-4" /> Present
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {scanning && <QrScanner onResult={submitToken} onClose={() => setScanning(false)} />}
    </div>
  );
}

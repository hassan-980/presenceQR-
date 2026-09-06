import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Radio, Download, CalendarDays, Trash2, MapPin, X, Copy, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPosition } from "@/hooks/useProfile";
import { downloadCsv, downloadPdf, formatDate, type ReportRow } from "@/lib/reports";
import { deleteSession } from "@/lib/attendance.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SESSION_MINUTES = 10;

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function TeacherDashboard({ userId, name }: { userId: string; name: string }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  
  const [radius, setRadius] = useState(100);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const activeClassId = selectedId ?? classes?.[0]?.id ?? null;
  const activeClass = classes?.find((c) => c.id === activeClassId) ?? null;

  const { data: liveSession } = useQuery({
    queryKey: ["live-session", activeClassId],
    enabled: !!activeClassId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, token, expires_at, radius_m")
        .eq("class_id", activeClassId!)
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: report } = useQuery({
    queryKey: ["class-report", activeClassId],
    enabled: !!activeClassId,
    refetchInterval: 8000,
    queryFn: async () => {
      const [{ data: enrollments }, { data: sessions }, { data: records }] = await Promise.all([
        supabase.from("enrollments").select("student_id").eq("class_id", activeClassId!),
        supabase
          .from("attendance_sessions")
          .select("id, started_at")
          .eq("class_id", activeClassId!)
          .order("started_at", { ascending: true }),
        supabase
          .from("attendance_records")
          .select("id, student_id, session_id, marked_at, distance_m")
          .eq("class_id", activeClassId!),
      ]);

      const studentIds = (enrollments ?? []).map((e) => e.student_id);
      const { data: profiles } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name, email, roll_no").in("id", studentIds)
        : { data: [] };

      const totalSessions = (sessions ?? []).length;
      const sessionDates = (sessions ?? []).map((s) => formatDate(s.started_at));
      const rows: ReportRow[] = (profiles ?? []).map((p) => {
        const mine = (records ?? []).filter((r) => r.student_id === p.id);
        const last = mine
          .map((r) => new Date(r.marked_at).getTime())
          .sort((a, b) => b - a)[0];
        return {
          name: p.full_name || p.email,
          roll: p.roll_no ?? "—",
          present: mine.length,
          total: totalSessions,
          percent: totalSessions ? Math.round((mine.length / totalSessions) * 100) : 0,
          lastAttended: last ? formatDate(last) : "—",
        };
      });

      return {
        rows,
        totalSessions,
        sessionDates,
        sessions: sessions ?? [],
        records: records ?? [],
        profiles: profiles ?? [],
      };
    },
  });


  const presentNow = useMemo(() => {
    if (!liveSession || !report) return [];
    return report.records
      .filter((r) => r.session_id === liveSession.id)
      .map((r) => {
        const p = report.profiles.find((x) => x.id === r.student_id);
        return p ? { ...p, recordId: r.id } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [liveSession, report]);

  function removeAttendance(recordId: string, studentName: string) {
    setConfirmState({
      title: "Remove attendance?",
      description: `${studentName}'s attendance for this session will be unmarked.`,
      actionLabel: "Remove attendance",
      onConfirm: async () => {
        const { error } = await supabase.from("attendance_records").delete().eq("id", recordId);
        if (error) {
          toast.error("Could not remove the attendance.");
          return;
        }
        toast.success("Attendance removed");
        queryClient.invalidateQueries({ queryKey: ["class-report", activeClassId] });
      },
    });
  }

  useEffect(() => {
    if (!liveSession) {
      setQrDataUrl(null);
      return;
    }
    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const url = `${window.location.origin}/mark/${liveSession.token}`;
      setQrDataUrl(await QRCode.toDataURL(url, { width: 480, margin: 1 }));
    })();
  }, [liveSession]);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (className.trim().length < 2 || classCode.trim().length < 2) {
      toast.error("Enter a class name and subject code");
      return;
    }
    const { error } = await supabase.from("classes").insert({
      name: className.trim().slice(0, 100),
      code: classCode.trim().slice(0, 30),
      teacher_id: userId,
    });
    if (error) {
      toast.error("Could not create the class.");
      return;
    }
    setClassName("");
    setClassCode("");
    toast.success("Class created");
    queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
  }

  function deleteClass() {
    if (!activeClass) return;
    const target = activeClass;
    setConfirmState({
      title: `Delete "${target.name}"?`,
      description: "All its sessions and attendance records will be permanently removed.",
      actionLabel: "Delete class",
      onConfirm: async () => {
        const { error } = await supabase.from("classes").delete().eq("id", target.id);
        if (error) {
          toast.error("Could not delete the class.");
          return;
        }
        setSelectedId(null);
        toast.success("Class deleted");
        queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      },
    });
  }

  function removeSession(sessionId: string, date: string) {
    setConfirmState({
      title: "Delete this session?",
      description: `The session from ${date} and its attendance records will be removed.`,
      actionLabel: "Delete session",
      onConfirm: async () => {
        try {
          await deleteSession({ data: { sessionId } });
          toast.success("Session deleted");
          queryClient.invalidateQueries({ queryKey: ["class-report", activeClassId] });
          queryClient.invalidateQueries({ queryKey: ["live-session", activeClassId] });
        } catch {
          toast.error("Could not delete the session.");
        }
      },
    });
  }


  async function startSession() {
    if (!activeClassId) return;
    try {
      const pos = await getPosition();
      const expires = new Date(Date.now() + SESSION_MINUTES * 60 * 1000).toISOString();
      const { error } = await supabase.from("attendance_sessions").insert({
        class_id: activeClassId,
        teacher_id: userId,
        token: randomToken(),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radius_m: Math.min(Math.max(radius, 10), 2000),
        expires_at: expires,
      });
      if (error) throw new Error(error.message);
      toast.success(`Session open for ${SESSION_MINUTES} minutes`);
      queryClient.invalidateQueries({ queryKey: ["live-session"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the session.");
    }
  }

  async function endSession() {
    if (!liveSession) return;
    await supabase
      .from("attendance_sessions")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", liveSession.id);
    queryClient.invalidateQueries({ queryKey: ["live-session"] });
  }

  const remaining = liveSession
    ? Math.max(0, Math.floor((new Date(liveSession.expires_at).getTime() - now) / 1000))
    : 0;

  const inviteLink =
    activeClassId && typeof window !== "undefined"
      ? `${window.location.origin}/join/${activeClassId}`
      : "";

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy — select the link and copy manually.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Teacher console</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {name.split(" ")[0]}. Run sessions and export reports.
        </p>
      </div>

      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(classes ?? []).map((c) => (
            <Button
              key={c.id}
              variant={c.id === activeClassId ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedId(c.id)}
            >
              {c.code} · {c.name}
            </Button>
          ))}
          {classes?.length === 0 && (
            <p className="text-sm text-muted-foreground">Create your first class below.</p>
          )}
        </div>

        <form onSubmit={createClass} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="Class name (e.g. Data Structures)"
            value={className}
            maxLength={100}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Input
            placeholder="Subject code (e.g. CS-301)"
            value={classCode}
            maxLength={30}
            onChange={(e) => setClassCode(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Plus className="size-4" /> Add class
          </Button>
        </form>
      </section>

      {activeClass && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Radio className="size-4 text-primary" /> Attendance session
            </h2>

            {liveSession ? (
              <div className="mt-5 text-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`Attendance QR code for ${activeClass.name}`}
                    className="mx-auto w-56 rounded-xl border border-border bg-card p-3"
                  />
                )}
                <p className="mt-4 font-display text-3xl font-semibold">
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                  {String(remaining % 60).padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valid within {liveSession.radius_m}m · {presentNow.length} marked present
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={endSession}>
                  End session now
                </Button>
                <ul className="mt-5 max-h-40 space-y-1 overflow-auto text-left text-sm">
                  {presentNow.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5">
                      <span className="flex-1">{p.full_name || p.email}</span>
                      <span className="text-muted-foreground">{p.roll_no ?? "—"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={() => removeAttendance(p.recordId, p.full_name || p.email)}
                      >
                        <X className="size-3" />
                        <span className="sr-only">Remove attendance</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="radius">Allowed radius (metres)</Label>
                  <Input
                    id="radius"
                    type="number"
                    min={10}
                    max={2000}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  />
                </div>
                <Button className="w-full" onClick={startSession}>
                  <MapPin className="size-4" /> Generate QR from my location
                </Button>
                <p className="text-xs text-muted-foreground">
                  The QR stays valid for {SESSION_MINUTES} minutes and only works inside the radius.
                </p>
              </div>
            )}
          </section>

          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="size-4 text-primary" /> Class overview
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              {report?.rows.length ?? 0} students · {report?.totalSessions ?? 0} sessions held
            </p>
            <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-sm">
              {(report?.sessions ?? []).map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5"
                >
                  <span>
                    Session {i + 1} · {formatDate(s.started_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => removeSession(s.id, formatDate(s.started_at))}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Delete session</span>
                  </Button>
                </li>
              ))}
              {(report?.sessions ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No sessions held yet.</li>
              )}
            </ul>
            <div className="mt-5 space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Link2 className="size-3.5" /> Class invite link
              </Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" size="sm" onClick={copyInviteLink}>
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Students who open this link are enrolled in {activeClass.code} automatically.
              </p>
            </div>

            <Button variant="destructive" size="sm" className="mt-5" onClick={deleteClass}>
              <Trash2 className="size-4" /> Delete this class
            </Button>
          </section>
        </div>
      )}

      {activeClass && (
        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">
              Report — {activeClass.name}{" "}
              <Badge variant="secondary" className="ml-1">
                {activeClass.code}
              </Badge>
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv(activeClass.name, report?.rows ?? [], report?.sessionDates ?? [])
                }
              >
                <Download className="size-4" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadPdf(
                    activeClass.name,
                    activeClass.code,
                    report?.rows ?? [],
                    report?.sessionDates ?? [],
                  )
                }
              >
                <Download className="size-4" /> PDF
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll no</TableHead>
                <TableHead>Attended</TableHead>
                <TableHead>Last attended</TableHead>
                <TableHead className="w-48">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.rows ?? []).map((r) => (
                <TableRow key={`${r.name}-${r.roll}`}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.roll}</TableCell>
                  <TableCell>
                    {r.present}/{r.total}
                  </TableCell>
                  <TableCell>{r.lastAttended}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.percent} className="h-2" />
                      <span className="w-10 text-right text-sm tabular-nums">{r.percent}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <AlertDialog open={!!confirmState} onOpenChange={(open) => !open && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmState?.onConfirm();
                setConfirmState(null);
              }}
            >
              {confirmState?.actionLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

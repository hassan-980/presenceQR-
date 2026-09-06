import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  QrCode,
  MapPin,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  LogOut,
  User,
  GraduationCap,
  ScanLine,
  Users,
  FileDown,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PresenceQR — QR & Geolocation Attendance for Classrooms" },
      {
        name: "description",
        content:
          "Teachers generate a class QR, students scan it on-site, and geolocation blocks proxy attendance. Full reports for teachers, live stats for students.",
      },
      { property: "og:title", content: "PresenceQR — Smart Student Attendance" },
      {
        property: "og:description",
        content:
          "QR + geolocation attendance with teacher reports, CSV/PDF exports, and student attendance tracking.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: QrCode,
    title: "One QR per session",
    body: "Teachers open a 10-minute attendance window; the class scans a single secure code.",
  },
  {
    icon: MapPin,
    title: "Proxy-proof by location",
    body: "Every scan is checked against the teacher's coordinates and an allowed radius.",
  },
  {
    icon: BarChart3,
    title: "Reports that export",
    body: "Per-class and per-student attendance with CSV and printable PDF downloads.",
  },
  {
    icon: ShieldCheck,
    title: "Three clear roles",
    body: "Students, teachers and admins each get a dashboard scoped to what they can see.",
  },
];

const steps = [
  {
    icon: QrCode,
    step: "01",
    title: "Teacher opens a session",
    body: "Pick a class, set the geofence radius, and a time-limited QR appears for the room.",
  },
  {
    icon: ScanLine,
    step: "02",
    title: "Students scan on-site",
    body: "From inside the classroom, a quick scan captures attendance with a live location check.",
  },
  {
    icon: FileDown,
    step: "03",
    title: "Reports, instantly",
    body: "Present counts, absent lists and full exports land in the teacher dashboard in seconds.",
  },
];

const stats = [
  { v: "< 2s", k: "Scan to marked" },
  { v: "100m", k: "Default geofence" },
  { v: "3", k: "Role-based dashboards" },
  { v: "0", k: "Proxy scans accepted" },
];

const roles = [
  {
    icon: Users,
    tag: "For teachers",
    title: "Run the room, not the roll-call",
    points: ["Generate a session QR in one tap", "Watch present counts tick up live", "Export CSV or PDF per class"],
  },
  {
    icon: GraduationCap,
    tag: "For students",
    title: "Scan once, stay informed",
    points: ["Mark attendance in seconds from the seat", "Track overall attendance at a glance", "Never lose a class to a missed sheet"],
  },
  {
    icon: ShieldCheck,
    tag: "For admins",
    title: "Oversight without overhead",
    points: ["Assign teacher and student roles", "See every user in one searchable list", "Keep the campus honest, centrally"],
  },
];

function Landing() {
  const { data: me } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="gradient-ink flex size-9 items-center justify-center rounded-xl shadow-glow">
              <GraduationCap className="size-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">PresenceQR</span>
          </Link>
          {me ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-3">
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-tight">{me.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase tracking-wide">
                    {me.role}
                  </Badge>
                </div>
              </Link>
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 pb-0">
      {/* Hero */}
      <section className="relative grid gap-12 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Sparkles className="size-3.5 text-accent" /> Attendance, verified
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.02] sm:text-6xl">
            Scan to be present.
            <span className="block bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
              Nowhere else counts.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            A complete attendance system for campuses: teachers generate a QR for the class,
            students scan it from inside the room, and location checks stop proxy marking cold.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to={me ? "/dashboard" : "/auth"}>
                {me ? "Go to dashboard" : "Get started free"} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              No proxy. No spreadsheets. Just present.
            </div>
          </div>

          {/* stat chips */}
          <div className="mt-10 grid max-w-md grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.k} className="text-center">
                <p className="font-display text-xl font-bold text-foreground sm:text-2xl">{s.v}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/15 blur-2xl" />
          <div className="surface-card relative overflow-hidden p-8">
            <div className="gradient-ink absolute inset-x-8 -top-4 h-8 rounded-full opacity-30 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Live session</p>
                <p className="font-display text-xl font-semibold">CS-301 · Data Structures</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                <span className="size-1.5 animate-ping rounded-full bg-accent-foreground/80" />
                Open
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { k: "Present", v: "38" },
                { k: "Radius", v: "100m" },
                { k: "Expires", v: "07:12" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-secondary px-3 py-4">
                  <p className="font-display text-2xl font-semibold">{s.v}</p>
                  <p className="text-xs text-muted-foreground">{s.k}</p>
                </div>
              ))}
            </div>

            {/* QR with scan line */}
            <div className="relative mt-6 flex items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40 py-8">
              <QrCode className="size-24 text-primary" strokeWidth={1.1} />
              <div className="pointer-events-none absolute inset-x-6 top-6 bottom-6 overflow-hidden">
                <div className="scan-line absolute inset-x-0 h-0.5 bg-primary/80 shadow-[0_0_12px_2px_var(--color-primary)]" />
              </div>
              <span className="absolute bottom-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                Scan to mark present
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Within 100m of teacher
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" /> Closes in 7:12
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Three taps from roll-call to report</h2>
          <p className="mt-3 text-muted-foreground">
            No new hardware, no spreadsheets. PresenceQR turns every phone in the room into an attendance terminal.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.step} className="surface-card group relative p-7 transition-transform duration-300 hover:-translate-y-1">
              <span className="font-display absolute right-6 top-5 text-5xl font-bold text-primary/10 transition-colors group-hover:text-primary/20">
                {s.step}
              </span>
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 hidden size-6 -translate-y-1/2 text-border md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article key={f.title} className="surface-card group p-6 transition-colors hover:border-primary/40">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <f.icon className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Role-based split */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Built for everyone on campus</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">One system, three dashboards</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <div key={r.tag} className="surface-card flex flex-col p-7">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <r.icon className="size-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{r.tag}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative my-6 overflow-hidden rounded-3xl border border-border">
        <div className="gradient-ink absolute inset-0 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,oklch(0.82_0.15_78/0.35),transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className="max-w-xl text-3xl font-bold text-primary-foreground sm:text-4xl">
            Put roll-call on autopilot this semester
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/80 sm:text-base">
            Free for classrooms. Set up a class in under a minute and take attendance the modern way.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to={me ? "/dashboard" : "/auth"}>
              {me ? "Go to dashboard" : "Get started free"} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <span className="gradient-ink flex size-8 items-center justify-center rounded-lg">
              <GraduationCap className="size-4 text-primary-foreground" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">PresenceQR</span>
          </Link>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            QR + geolocation attendance for classrooms.
            <br className="hidden sm:block" /> Built for honest roll-call, one scan at a time.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <Link to="/auth" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}

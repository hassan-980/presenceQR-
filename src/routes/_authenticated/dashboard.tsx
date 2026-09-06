import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useProfile } from "@/hooks/useProfile";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PresenceQR Attendance" },
      {
        name: "description",
        content: "Your attendance dashboard: scan QR codes, run sessions and review reports.",
      },
      { property: "og:title", content: "Dashboard — PresenceQR" },
      { property: "og:description", content: "Track and manage classroom attendance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useProfile();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : data.role === "teacher" ? (
          <TeacherDashboard userId={data.user.id} name={data.name} />
        ) : data.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <StudentDashboard userId={data.user.id} name={data.name} />
        )}
      </main>
    </div>
  );
}

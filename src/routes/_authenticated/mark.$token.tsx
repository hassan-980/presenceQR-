import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { markAttendance } from "@/lib/attendance.functions";
import { getPosition } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/mark/$token")({
  head: () => ({
    meta: [
      { title: "Mark attendance — PresenceQR" },
      { name: "description", content: "Confirm your presence in class with a location-verified scan." },
      { property: "og:title", content: "Mark attendance — PresenceQR" },
      { property: "og:description", content: "Location-verified classroom attendance." },
    ],
  }),
  component: MarkPage,
});

function MarkPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Checking your location…");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
        if (cancelled) return;
        if (res.ok) {
          setState("ok");
          setMessage(`Attendance marked — you were ${res.distance}m from the classroom.`);
        } else {
          setState("error");
          setMessage(res.reason);
        }
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not mark attendance.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        {state === "working" && <Loader2 className="size-10 animate-spin text-primary" />}
        {state === "ok" && <CheckCircle2 className="size-12 text-primary" />}
        {state === "error" && <XCircle className="size-12 text-destructive" />}
        <h1 className="mt-5 text-2xl font-bold">
          {state === "ok" ? "You're marked present" : state === "error" ? "Not marked" : "Verifying…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </main>
    </div>
  );
}

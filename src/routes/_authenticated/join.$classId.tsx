import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { joinClass } from "@/lib/attendance.functions";

export const Route = createFileRoute("/_authenticated/join/$classId")({
  head: () => ({
    meta: [
      { title: "Join a class — PresenceQR" },
      {
        name: "description",
        content: "Enroll in your teacher's class with a shared invite link on PresenceQR.",
      },
      { property: "og:title", content: "Join a class — PresenceQR" },
      { property: "og:description", content: "Enroll in a class using a shared invite link." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { classId } = Route.useParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Enrolling you in this class…");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await joinClass({ data: { classId } });
        if (cancelled) return;
        if (res.ok) {
          setState("ok");
          setMessage(
            res.already
              ? `You are already enrolled in ${res.code} · ${res.name}.`
              : `You are now enrolled in ${res.code} · ${res.name}.`,
          );
        } else {
          setState("error");
          setMessage(res.reason);
        }
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not enroll you in this class.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        {state === "working" && <Loader2 className="size-10 animate-spin text-primary" />}
        {state === "ok" && <CheckCircle2 className="size-12 text-primary" />}
        {state === "error" && <XCircle className="size-12 text-destructive" />}
        <h1 className="mt-5 text-2xl font-bold">
          {state === "ok" ? "Enrolled" : state === "error" ? "Not enrolled" : "Joining…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </main>
    </div>
  );
}

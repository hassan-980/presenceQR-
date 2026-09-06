import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function extractToken(text: string): string {
  const match = text.match(/\/mark\/([A-Za-z0-9_-]+)/);
  return match ? match[1]! : text.trim();
}

export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (token: string) => void;
  onClose: () => void;
}) {
  const doneRef = useRef(false);

  useEffect(() => {
    let scanner: { clear: () => Promise<void> } | null = null;
    let cancelled = false;

    void (async () => {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      if (cancelled) return;
      const instance = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
        false,
      );
      scanner = instance as unknown as { clear: () => Promise<void> };
      instance.render(
        (text: string) => {
          if (doneRef.current) return;
          doneRef.current = true;
          onResult(extractToken(text));
        },
        () => {},
      );
    })();

    return () => {
      cancelled = true;
      void scanner?.clear().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
      <div className="surface-card w-full max-w-md p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Scan the class QR</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close scanner">
            <X className="size-4" />
          </Button>
        </div>
        <div id="qr-reader" className="overflow-hidden rounded-xl" />
        <p className="mt-3 text-xs text-muted-foreground">
          Allow camera and location access. Your position is checked against the classroom.
        </p>
      </div>
    </div>
  );
}

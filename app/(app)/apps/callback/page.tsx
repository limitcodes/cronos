"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center" />}>
      <CallbackPageContent />
    </Suspense>
  );
}

function CallbackPageContent() {
  const params = useSearchParams();
  const router = useRouter();

  const status = params.get("status");
  const toolkit = params.get("toolkit");
  const success = status === "success";

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push("/apps"), 2000);
      return () => clearTimeout(t);
    }
  }, [success, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        {success ? (
          <>
            <CheckCircle2Icon className="size-12 text-emerald-500" />
            <p className="text-lg font-medium">
              {toolkit
                ? `${toolkit.charAt(0).toUpperCase() + toolkit.slice(1)} connected!`
                : "Connected!"}
            </p>
            <p className="text-sm text-muted-foreground">Redirecting back to apps…</p>
          </>
        ) : (
          <>
            <XCircleIcon className="size-12 text-destructive" />
            <p className="text-lg font-medium">Connection failed</p>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <Button size="sm" onClick={() => router.push("/apps")}>
              Back to Apps
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

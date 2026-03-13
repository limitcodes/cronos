"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon, PlugZapIcon } from "lucide-react";

interface Toolkit {
  slug: string;
  name: string;
  logo: string;
  isNoAuth: boolean;
  connection: {
    isActive: boolean;
    authConfig: unknown;
  };
}

const DESCRIPTIONS: Record<string, string> = {
  gmail: "Read, compose, and send emails directly from your conversations.",
  github: "Manage repos, issues, pull requests, and code reviews.",
  slack: "Send messages, search channels, and interact with your workspace.",
  twitter: "Post tweets, read timelines, and manage your Twitter presence.",
};

export default function AppsPage() {
  const [apps, setApps] = useState<Toolkit[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const fetchApps = async () => {
    const res = await fetch("/api/apps");
    if (res.ok) setApps(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const handleConnect = async (slug: string) => {
    setPending(slug);
    const res = await fetch(`/api/apps/${slug}`, { method: "POST" });
    if (res.ok) {
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } else {
      setPending(null);
    }
  };

  const handleDisconnect = async (slug: string) => {
    setPending(slug);
    await fetch(`/api/apps/${slug}`, { method: "DELETE" });
    await fetchApps();
    setPending(null);
  };

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <PlugZapIcon className="size-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Integrations</span>
          </div>
          <h1 className="text-2xl font-semibold">Connected Apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your apps so the AI agent can act on your behalf.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <AppCardSkeleton key={i} />
              ))
            : apps.map((app) => (
                <AppCard
                  key={app.slug}
                  app={app}
                  description={DESCRIPTIONS[app.slug] ?? ""}
                  isPending={pending === app.slug}
                  onConnect={() => handleConnect(app.slug)}
                  onDisconnect={() => handleDisconnect(app.slug)}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

function AppCard({
  app,
  description,
  isPending,
  onConnect,
  onDisconnect,
}: {
  app: Toolkit;
  description: string;
  isPending: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = app.connection.isActive;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.logo}
            alt={app.name}
            className="size-10 rounded-lg object-contain"
          />
          <div>
            <p className="font-medium leading-tight">{app.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {connected ? (
                <>
                  <CheckCircle2Icon className="size-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500">Connected</span>
                </>
              ) : (
                <>
                  <CircleIcon className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      <div className="mt-auto flex items-center gap-2">
        {connected ? (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={onDisconnect}
          >
            {isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : (
          <Button size="sm" disabled={isPending} onClick={onConnect}>
            <ExternalLinkIcon className="size-3.5" />
            {isPending ? "Redirecting…" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}

function AppCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

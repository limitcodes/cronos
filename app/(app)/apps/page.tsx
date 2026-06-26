"use client";

import { useDeferredValue, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";

interface Toolkit {
  slug: string;
  name: string;
  logo: string;
  isNoAuth: boolean;
  connection?: {
    isActive: boolean;
    authConfig: unknown;
  };
}

type FilterMode = "all" | "connected";

type AppsResponse = {
  items: Toolkit[];
  nextCursor?: string | null;
};

const DESCRIPTIONS: Record<string, string> = {
  gmail: "Read, compose, and send emails directly from your conversations.",
  github: "Manage repos, issues, pull requests, and code reviews.",
  slack: "Send messages, search channels, and interact with your workspace.",
  twitter: "Post tweets, read timelines, and manage your Twitter presence.",
};

function getDescription(app: Toolkit) {
  if (DESCRIPTIONS[app.slug]) return DESCRIPTIONS[app.slug];
  if (app.isNoAuth) {
    return "Available immediately without connecting an account.";
  }
  return "Connect this app to let the assistant act with your account.";
}

async function fetchAppsPage({
  cursor,
  filter,
  search,
}: {
  cursor?: string | null;
  filter: FilterMode;
  search: string;
}) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filter === "connected") params.set("filter", "connected");
  if (search) params.set("search", search);

  const url = params.size ? `/api/apps?${params.toString()}` : "/api/apps";
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to load apps");
  }

  return (await response.json()) as AppsResponse;
}

export default function AppsPage() {
  const [pending, setPending] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const trimmedSearch = deferredSearch.trim();
  const appsQuery = useInfiniteQuery({
    queryKey: ["apps", { filter, search: trimmedSearch }],
    queryFn: ({ pageParam }) =>
      fetchAppsPage({
        cursor: pageParam,
        filter,
        search: trimmedSearch,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const apps = Array.from(
    new Map(
      (appsQuery.data?.pages ?? []).flatMap((page) => page.items).map((app) => [app.slug, app]),
    ).values(),
  );
  const loading = appsQuery.isLoading;
  const hasNextPage = appsQuery.hasNextPage ?? false;
  const loadingMore = appsQuery.isFetchingNextPage;

  const handleConnect = async (slug: string) => {
    setPending(slug);
    const res = await fetch(`/api/apps/${slug}`, { method: "POST" });
    if (res.ok) {
      const { redirectUrl } = await res.json();
      window.location.assign(redirectUrl);
    } else {
      setPending(null);
    }
  };

  const handleDisconnect = async (slug: string) => {
    setPending(slug);
    await fetch(`/api/apps/${slug}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: ["apps"] });
    setPending(null);
  };

  const handleLoadMore = async () => {
    if (!hasNextPage || loadingMore) return;
    await appsQuery.fetchNextPage();
  };

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Apps
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your apps so the AI agent can act on your behalf.
          </p>
        </div>

        <div className="mb-6 relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps"
            className="h-10 pl-9"
          />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "connected" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("connected")}
          >
            Connected
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <AppCardSkeleton key={i} />)
            : apps.map((app) => (
                <AppCard
                  key={app.slug}
                  app={app}
                  description={getDescription(app)}
                  isPending={pending === app.slug}
                  onConnect={() => handleConnect(app.slug)}
                  onDisconnect={() => handleDisconnect(app.slug)}
                />
              ))}
        </div>

        {!loading && apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No apps matched your search.
          </div>
        ) : null}

        {!loading && hasNextPage ? (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" disabled={loadingMore} onClick={handleLoadMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
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
  const connected = app.connection?.isActive ?? false;
  const connectLabel = app.isNoAuth ? "Available" : "Not connected";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={app.logo} alt={app.name} className="size-10 rounded-lg object-contain" />
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
                  <span className="text-xs text-muted-foreground">{connectLabel}</span>
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
        ) : app.isNoAuth ? (
          <Button size="sm" variant="secondary" disabled>
            Ready to use
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

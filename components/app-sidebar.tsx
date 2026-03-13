"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, MessageSquareIcon, MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react";

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
}

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const activeChatId = params?.chatId as string | undefined;

  const [chats, setChats] = useState<Chat[]>([]);
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => { setMounted(true); }, []);

  const loadChats = async () => {
    const res = await fetch("/api/chats");
    if (res.ok) setChats(await res.json());
  };

  useEffect(() => { loadChats(); }, [activeChatId]);

  const handleNewChat = async () => {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      await loadChats();
      router.push("/");
    }
  };

  const handleDelete = async (chatId: string) => {
    await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) router.push("/");
  };

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <span className="font-pixel text-sm tracking-widest text-foreground">My AI App</span>
        <Button size="sm" className="mt-3 w-full gap-2" onClick={handleNewChat}>
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel render={<CollapsibleTrigger className="flex w-full items-center justify-between" />}>
              Your Chats
              <ChevronRightIcon className="size-3.5 transition-transform duration-200 [[data-panel-open]_&]:rotate-90" />
            </SidebarGroupLabel>
            <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No chats yet</p>
              )}
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    render={<Link href={`/chat/${chat.id}`} />}
                    isActive={chat.id === activeChatId}
                    tooltip={chat.title}
                    className="flex items-center gap-2"
                  >
                    <MessageSquareIcon className="size-4 shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(chat.id)}
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-4" suppressHydrationWarning>
        {mounted && (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{session?.user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{session?.user?.email}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto shrink-0 text-xs"
              onClick={() =>
                authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })
              }
            >
              Sign out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

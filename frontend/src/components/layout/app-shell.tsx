"use client";

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SessionProvider } from "@/features/auth/session-provider";
import { AppShellSkeleton } from "./app-shell-skeleton";
import { AppSidebar } from "./app-sidebar";

/** Sidebar + top bar around every logged-in page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider fallback={<AppShellSkeleton />}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur print:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <span className="text-sm text-muted-foreground">Doctor Tracker</span>
          </header>
          <main className="flex-1 space-y-6 p-4 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}

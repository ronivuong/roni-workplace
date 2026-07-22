"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

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
    <div className="flex min-h-dvh bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 px-3 py-4 sm:px-4 md:px-6 lg:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

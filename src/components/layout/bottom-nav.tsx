"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenTool,
  Video,
  Share2,
  MoreHorizontal,
  BarChart3,
  Bot,
  Bell,
  Settings,
  UserCog,
  Users,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/rbac";

const main = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/content-studio", label: "Studio", icon: PenTool },
  { href: "/article-seo", label: "Article", icon: FileSearch },
  { href: "/publish", label: "Publish", icon: Share2 },
];

const more = [
  { href: "/video-studio", label: "Video", icon: Video },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teams", label: "Team", icon: Users },
  { href: "/users", label: "Users", icon: UserCog, permission: "users:read" as const },
  { href: "/agents", label: "Agent", icon: Bot },
  { href: "/notifications", label: "Thông báo", icon: Bell },
  { href: "/settings", label: "Cài đặt", icon: Settings, permission: "settings:ai" as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const role = session?.user?.role;

  const moreVisible = more.filter((i) => !i.permission || can(role, i.permission));
  const moreActive = moreVisible.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      {open && (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 md:hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Thêm
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {moreVisible.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-emerald-600")} />
                  <span className="text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/95 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1">
          {main.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-emerald-600" : "text-slate-500 active:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                    active && "bg-emerald-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors",
              open || moreActive
                ? "text-emerald-600"
                : "text-slate-500 active:bg-slate-50"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                (open || moreActive) && "bg-emerald-50"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span>Thêm</span>
          </button>
        </div>
      </nav>
    </>
  );
}

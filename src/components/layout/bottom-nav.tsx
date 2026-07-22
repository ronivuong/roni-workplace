"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenTool,
  Video,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Share2, BarChart3, Bot, Bell, Settings, UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/rbac";

const main = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/content-studio", label: "Studio", icon: PenTool },
  { href: "/video-studio", label: "Video", icon: Video },
  { href: "/teams", label: "Team", icon: Users },
];

const more = [
  { href: "/publish", label: "Publish", icon: Share2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {open && (
        <div className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:hidden">
          <div className="grid grid-cols-3 gap-2">
            {moreVisible.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg md:hidden pb-safe">
        <div className="flex items-center justify-around px-1 py-2">
          {main.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium min-w-[56px]",
                  active ? "text-emerald-600" : "text-slate-500"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-emerald-600")} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium min-w-[56px]",
              open ? "text-emerald-600" : "text-slate-500"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            Thêm
          </button>
        </div>
      </nav>
    </>
  );
}

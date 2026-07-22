"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PenTool,
  Share2,
  Video,
  BarChart3,
  Users,
  UserCog,
  Bot,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useState } from "react";
import { can } from "@/lib/rbac";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/content-studio", label: "AI Content Studio", icon: PenTool },
  { href: "/publish", label: "Publish Hub", icon: Share2 },
  { href: "/video-studio", label: "Video Studio", icon: Video },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teams", label: "Team", icon: Users },
  { href: "/users", label: "Người dùng", icon: UserCog, permission: "users:read" as const },
  { href: "/agents", label: "AI Agent", icon: Bot },
  { href: "/notifications", label: "Thông báo", icon: Bell },
  { href: "/settings", label: "Cài đặt", icon: Settings, permission: "settings:ai" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.role;

  const visible = navItems.filter((item) => {
    if (!item.permission) return true;
    return can(role, item.permission);
  });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className={cn("flex items-center h-16 px-4 border-b border-slate-100", collapsed && "justify-center")}>
        <Logo showText={!collapsed} size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-emerald-600")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="m-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs text-slate-500 hover:bg-slate-50"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : (
          <>
            <ChevronLeft className="h-4 w-4" />
            Thu gọn
          </>
        )}
      </button>
    </aside>
  );
}

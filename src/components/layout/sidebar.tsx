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
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useState } from "react";
import { can } from "@/lib/rbac";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/content-studio", label: "AI Content Studio", icon: PenTool },
  { href: "/article-seo", label: "Article SEO", icon: FileSearch },
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
        "hidden md:flex flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 ease-out h-dvh sticky top-0 shrink-0 z-20",
        collapsed ? "w-[68px]" : "w-[220px] lg:w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center h-14 md:h-16 px-3 lg:px-4 border-b border-slate-100 shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        <Logo showText={!collapsed} size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain p-2.5 lg:p-3 space-y-0.5">
        {visible.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-2"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-700"
                )}
              />
              {!collapsed && (
                <span className="truncate leading-none">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2.5 lg:p-3 border-t border-slate-100 shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors",
            collapsed && "px-0"
          )}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Thu gọn
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

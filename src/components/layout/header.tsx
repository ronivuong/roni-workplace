"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/rbac";
import { Logo } from "./logo";

export function Header({ title }: { title?: string }) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-3 sm:px-4 md:px-6 lg:px-8 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="md:hidden shrink-0">
          <Logo showText={false} size="sm" />
        </div>
        {title && (
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
            {title}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl p-1.5 sm:pr-2.5 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            >
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                <AvatarFallback>{getInitials(user?.name || "U")}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left max-w-[140px] lg:max-w-[180px]">
                <p className="text-sm font-medium text-slate-900 leading-none truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {ROLE_LABELS[user?.role || ""] || user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>{user?.name}</span>
                <span className="text-xs font-normal text-slate-500 truncate">
                  {user?.email}
                </span>
                <Badge
                  className={`w-fit mt-1 border ${ROLE_COLORS[user?.role || ""] || ""}`}
                  variant="outline"
                >
                  {ROLE_LABELS[user?.role || ""] || user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/users/${user?.id}`} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Hồ sơ của tôi
              </Link>
            </DropdownMenuItem>
            {user?.role === "ADMIN" && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

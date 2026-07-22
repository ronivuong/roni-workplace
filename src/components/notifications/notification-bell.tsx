"use client";

import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime, cn } from "@/lib/utils";
import { NOTIFICATION_LABELS } from "@/lib/constants";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

async function fetchNotifications() {
  const res = await fetch("/api/notifications?limit=15");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ notifications: Notification[]; unreadCount: number }>;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (payload: { ids?: string[]; markAll?: boolean }) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Optional one-shot SSE boost (does not keep long-lived connection on Vercel)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        es?.close();
      };
      es.onerror = () => es?.close();
    } catch {
      // polling fallback already enabled
    }
    return () => es?.close();
  }, [queryClient]);

  const unread = data?.unreadCount ?? 0;
  const list = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="font-semibold text-slate-900">Thông báo</p>
            <p className="text-xs text-slate-500">{unread} chưa đọc</p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-600"
              onClick={() => markRead.mutate({ markAll: true })}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Đọc tất cả
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {list.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Chưa có thông báo</p>
          ) : (
            list.map((n) => (
              <Link
                key={n.id}
                href={n.link || "/notifications"}
                onClick={() => {
                  if (!n.isRead) markRead.mutate({ ids: [n.id] });
                }}
                className={cn(
                  "block border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50",
                  !n.isRead && "bg-emerald-50/40"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  )}
                  <div className={cn("min-w-0 flex-1", n.isRead && "pl-4")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    <span className="mt-1 inline-block text-[10px] font-medium text-emerald-600">
                      {NOTIFICATION_LABELS[n.type] || n.type}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-slate-100 p-2">
          <Link
            href="/notifications"
            className="flex items-center justify-center rounded-lg py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
          >
            Xem tất cả thông báo
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

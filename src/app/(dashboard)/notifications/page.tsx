"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { relativeTime, cn } from "@/lib/utils";
import { NOTIFICATION_LABELS } from "@/lib/constants";
import { useState } from "react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: async () => {
      const params = filter === "unread" ? "?unread=true&limit=100" : "?limit=100";
      const res = await fetch(`/api/notifications${params}`);
      return res.json();
    },
  });

  const markRead = useMutation({
    mutationFn: async (payload: { ids?: string[]; markAll?: boolean }) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearRead = async () => {
    await fetch("/api/notifications", { method: "DELETE" });
    toast.success("Đã xóa thông báo đã đọc");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const list = data?.notifications || [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div>
      <PageHeader
        title="Thông báo"
        description="Lịch sử thông báo realtime — duyệt content, video, publish, milestone..."
        actions={
          <div className="flex gap-2">
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markRead.mutate({ markAll: true })}
              >
                <CheckCheck className="h-4 w-4" />
                Đọc tất cả
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearRead}>
              <Trash2 className="h-4 w-4" />
              Xóa đã đọc
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="unread">
              Chưa đọc
              {unread > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 px-1" variant="default">
                  {unread}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          SSE + polling
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-slate-400">
            <Bell className="h-10 w-10 mb-2" />
            Không có thông báo
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map(
            (n: {
              id: string;
              type: string;
              title: string;
              message: string;
              link: string | null;
              isRead: boolean;
              createdAt: string;
            }) => (
              <div
                key={n.id}
                className={cn(
                  "rounded-2xl border bg-white p-4 transition-colors shadow-sm",
                  n.isRead
                    ? "border-slate-100"
                    : "border-emerald-100 bg-emerald-50/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {NOTIFICATION_LABELS[n.type] || n.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markRead.mutate({ ids: [n.id] })}
                      >
                        Đánh dấu đọc
                      </Button>
                    )}
                    {n.link && (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.isRead) markRead.mutate({ ids: [n.id] });
                          }}
                        >
                          Xem
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

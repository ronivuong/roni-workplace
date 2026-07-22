"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { cn, formatDateTime } from "@/lib/utils";

type CalEvent = {
  id: string;
  contentId: string;
  title: string;
  platform: string;
  status: string;
  at: string;
  publishedUrl: string | null;
  author: string;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function ScheduleCalendar({ className }: { className?: string }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const from = startOfMonth(cursor);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  const { data, isLoading } = useQuery({
    queryKey: ["content-calendar", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const res = await fetch(
        `/api/content/calendar?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ events: CalEvent[] }>;
    },
  });

  const events = data?.events || [];

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!e.at) continue;
      const key = new Date(e.at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const totalDays = daysInMonth(cursor);
  const startWeekday = (from.getDay() + 6) % 7; // Mon=0
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const dayKey = (day: number) => {
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${cursor.getFullYear()}-${m}-${d}`;
  };

  const selectedEvents = selectedDay ? byDay.get(selectedDay) || [] : [];

  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base capitalize">Lịch đăng · {monthLabel}</CardTitle>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Hôm nay
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="aspect-square" />;
                const key = dayKey(day);
                const list = byDay.get(key) || [];
                const isToday =
                  key === new Date().toISOString().slice(0, 10);
                const active = selectedDay === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={cn(
                      "aspect-square rounded-lg border p-1 text-left transition-colors overflow-hidden",
                      active
                        ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                        : "border-slate-100 hover:border-slate-200 bg-white",
                      isToday && !active && "border-emerald-200"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isToday ? "text-emerald-700" : "text-slate-700"
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {list.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            e.status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-400"
                          )}
                          title={e.title}
                        />
                      ))}
                      {list.length > 3 && (
                        <span className="text-[8px] text-slate-400">+{list.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 min-h-[100px]">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                {selectedDay
                  ? `Sự kiện ${selectedDay}`
                  : "Chọn một ngày để xem lịch đăng"}
              </p>
              {!selectedDay ? (
                <p className="text-xs text-slate-400">
                  Chấm xanh = đã đăng · chấm vàng = đã lên lịch
                </p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-xs text-slate-400">Không có lịch ngày này</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-start gap-2 rounded-lg bg-white border border-slate-100 p-2"
                    >
                      <PlatformIcon platform={e.platform} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {e.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDateTime(e.at)} · {e.author}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge
                            variant={e.status === "PUBLISHED" ? "default" : "warning"}
                            className="text-[9px]"
                          >
                            {e.status === "PUBLISHED" ? "Đã đăng" : "Lên lịch"}
                          </Badge>
                          {e.publishedUrl && (
                            <a
                              href={e.publishedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

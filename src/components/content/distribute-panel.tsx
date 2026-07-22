"use client";

import { useState } from "react";
import { CalendarClock, Loader2, Rocket, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { cn } from "@/lib/utils";

export type ConnectedPlatform = {
  key: string;
  name: string;
  isConnected: boolean;
  accountName?: string | null;
};

type Props = {
  contentId: string | null;
  platforms: ConnectedPlatform[];
  onDone?: () => void;
  disabled?: boolean;
  /** Ensure draft is saved; return content id */
  onEnsureSaved?: () => Promise<string | null>;
};

export function DistributePanel({
  contentId,
  platforms,
  onDone,
  disabled,
  onEnsureSaved,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"publish" | "schedule">("publish");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const connected = platforms.filter((p) => p.isConnected);
  const available = connected.length ? connected : platforms;

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    const keys = available.map((p) => p.key);
    setSelected(keys);
  };

  const submit = async () => {
    if (!selected.length) {
      toast.error("Chọn ít nhất một nền tảng");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      toast.error("Chọn thời gian lên lịch");
      return;
    }

    setLoading(true);
    try {
      let id = contentId;
      if (onEnsureSaved) {
        id = await onEnsureSaved();
      }
      if (!id) {
        toast.error("Lưu bản nháp trước khi đăng / lên lịch");
        return;
      }

      const res = await fetch(`/api/content/${id}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selected,
          mode,
          scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Thất bại");
      toast.success(d.message || "Thành công");
      if (mode === "publish" && d.distributions?.length) {
        const first = d.distributions.find(
          (x: { publishedUrl?: string }) => x.publishedUrl
        );
        if (first?.publishedUrl) {
          toast.message("Link bài đăng", {
            description: first.publishedUrl,
            action: {
              label: "Mở",
              onClick: () => window.open(first.publishedUrl, "_blank"),
            },
          });
        }
      }
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  };

  const minSchedule = new Date(Date.now() + 5 * 60_000);
  const minLocal = new Date(minSchedule.getTime() - minSchedule.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Đăng / Lên lịch</p>
          <p className="text-[11px] text-slate-500">
            Chọn một hoặc nhiều nền tảng{connected.length ? " đã kết nối" : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
          Chọn tất cả
        </Button>
      </div>

      {!available.length ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
          Chưa có nền tảng. Vào Publish Hub → Kết nối nền tảng trước.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {available.map((p) => {
            const on = selected.includes(p.key);
            return (
              <button
                key={p.key}
                type="button"
                disabled={disabled}
                onClick={() => toggle(p.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all",
                  on
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <PlatformIcon platform={p.key} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  {p.accountName && (
                    <p className="text-[10px] text-slate-400 truncate">{p.accountName}</p>
                  )}
                </div>
                {on && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "publish" ? "default" : "outline"}
          onClick={() => setMode("publish")}
        >
          <Rocket className="h-3.5 w-3.5" />
          Đăng ngay
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "schedule" ? "default" : "outline"}
          onClick={() => setMode("schedule")}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Lên lịch
        </Button>
      </div>

      {mode === "schedule" && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Thời điểm đăng</Label>
          <Input
            type="datetime-local"
            min={minLocal}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      )}

      <Button
        className="w-full"
        disabled={disabled || loading || !contentId || !selected.length}
        onClick={submit}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === "publish" ? (
          <Rocket className="h-4 w-4" />
        ) : (
          <CalendarClock className="h-4 w-4" />
        )}
        {mode === "publish"
          ? `Publish ${selected.length || ""} nền tảng`
          : `Lên lịch ${selected.length || ""} nền tảng`}
      </Button>
    </div>
  );
}

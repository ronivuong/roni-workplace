"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Clock, Zap, Play, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { isLeaderOrAbove } from "@/lib/rbac";

type Job = {
  id: string;
  name: string;
  description: string | null;
  cron: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  user: { id: string; name: string };
};

export default function AgentsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const canCreate = isLeaderOrAbove(session?.user?.role);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    cron: "0 9 * * *",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ jobs: Job[] }>;
    },
  });

  const jobs = data?.jobs || [];

  const toggle = async (id: string, isActive: boolean) => {
    const res = await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    if (!res.ok) {
      toast.error("Không cập nhật được");
      return;
    }
    toast.success(isActive ? "Đã bật agent" : "Đã tắt agent");
    qc.invalidateQueries({ queryKey: ["agents"] });
  };

  const runNow = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, runNow: true }),
      });
      if (!res.ok) throw new Error("Run failed");
      toast.success("Agent đã chạy — đã gửi nhắc lịch nếu có content SCHEDULED");
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      toast.error("Chạy agent thất bại");
    } finally {
      setRunning(null);
    }
  };

  const create = async () => {
    if (!form.name.trim()) {
      toast.error("Nhập tên job");
      return;
    }
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error || "Lỗi");
      return;
    }
    toast.success("Đã tạo agent job");
    setOpen(false);
    setForm({ name: "", description: "", cron: "0 9 * * *" });
    qc.invalidateQueries({ queryKey: ["agents"] });
  };

  return (
    <div>
      <PageHeader
        title="AI Agent Scheduler"
        description="Agent nhắc lịch đăng bài, báo cáo hiệu suất — bật/tắt và chạy thử ngay."
        actions={
          canCreate ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Tạo agent
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Bot, title: "Schedule Agent", desc: "Cron-based reminders" },
          { icon: Clock, title: "Nhắc lịch đăng", desc: "Content SCHEDULED" },
          { icon: Zap, title: "Chạy ngay", desc: "Trigger thủ công" },
        ].map((s) => (
          <Card key={s.title} className="border-dashed">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jobs đã cấu hình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Chưa có agent job</p>
          ) : (
            jobs.map((j) => (
              <div
                key={j.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{j.name}</p>
                    <Badge variant={j.isActive ? "default" : "secondary"}>
                      {j.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{j.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Cron: <code className="rounded bg-slate-100 px-1">{j.cron || "—"}</code>
                    {" · "}Owner: {j.user.name}
                    {j.lastRunAt && ` · Last: ${formatDateTime(j.lastRunAt)}`}
                    {j.nextRunAt && ` · Next: ${formatDateTime(j.nextRunAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Bật</span>
                    <Switch
                      checked={j.isActive}
                      onCheckedChange={(v) => toggle(j.id, v)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={running === j.id}
                    onClick={() => runNow(j.id)}
                  >
                    {running === j.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Chạy ngay
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo AI Agent job</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Tên</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nhắc lịch đăng bài hàng ngày"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Mô tả</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Cron</Label>
              <Input
                value={form.cron}
                onChange={(e) => setForm({ ...form, cron: e.target.value })}
                placeholder="0 9 * * *"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={create}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

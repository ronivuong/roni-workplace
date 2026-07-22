"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Video, Clapperboard, Film, Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Content = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  status: string;
  platform: string | null;
  updatedAt: string;
  author: { name: string };
};

export default function VideoStudioPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["video-contents"],
    queryFn: async () => {
      const res = await fetch("/api/content");
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      return {
        contents: (d.contents as Content[]).filter((c) =>
          ["video", "script"].includes(c.type)
        ),
      };
    },
  });

  const generateScript = async () => {
    if (!topic.trim()) {
      toast.error("Nhập ý tưởng video");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          type: "script",
          platform: "tiktok",
          tone: "năng động, hook mạnh trong 3 giây đầu",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      toast.success(d.message || "Đã tạo script");
      setOpen(false);
      setTopic("");
      qc.invalidateQueries({ queryKey: ["video-contents"] });
      qc.invalidateQueries({ queryKey: ["contents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setLoading(false);
    }
  };

  const markReady = async (id: string) => {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED", type: "video" }),
    });
    if (!res.ok) {
      toast.error("Không cập nhật được");
      return;
    }
    // notify video ready
    toast.success("Đánh dấu video ready");
    qc.invalidateQueries({ queryKey: ["video-contents"] });
  };

  return (
    <div>
      <PageHeader
        title="Video Studio"
        description="Viral Script & Video Pipeline — tạo script, đánh dấu video sẵn sàng."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo script AI
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Clapperboard, title: "Script viral", desc: "Hook → Body → CTA" },
          { icon: Film, title: "Pipeline", desc: "Script → Ready → Publish" },
          { icon: Video, title: "Export multi-platform", desc: "9:16 · 1:1 · 16:9" },
        ].map((s) => (
          <Card key={s.title} className="border-dashed">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
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
          <CardTitle className="text-base">Script & Video pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !data?.contents?.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Chưa có script/video — bấm «Tạo script AI»
            </p>
          ) : (
            data.contents.map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{v.title}</p>
                  {v.body && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{v.body}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {v.author.name} · {v.type} · {formatDate(v.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {CONTENT_STATUS_LABELS[v.status] || v.status}
                  </Badge>
                  {v.status !== "APPROVED" && v.status !== "PUBLISHED" && (
                    <Button size="sm" variant="outline" onClick={() => markReady(v.id)}>
                      Mark ready
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Tạo script video
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Ý tưởng / sản phẩm</Label>
            <Textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Review son tint 60s — hook trước 3 giây"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={generateScript} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tạo script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Globe, Users, ImageIcon, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

const channels = [
  { name: "WordPress", desc: "Blog & landing", icon: Globe, key: "wordpress" },
  { name: "Facebook", desc: "Page posts & reels", icon: Users, key: "facebook" },
  { name: "Instagram", desc: "Feed, carousel", icon: ImageIcon, key: "instagram" },
  { name: "TikTok", desc: "Video ngắn & caption", icon: Share2, key: "tiktok" },
];

type Content = {
  id: string;
  title: string;
  status: string;
  platform: string | null;
  type: string;
  updatedAt: string;
  author: { name: string };
};

export default function PublishPage() {
  const qc = useQueryClient();
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contents-publish"],
    queryFn: async () => {
      const res = await fetch("/api/content");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ contents: Content[] }>;
    },
  });

  const queue = (data?.contents || []).filter((c) =>
    ["APPROVED", "SCHEDULED", "IN_REVIEW"].includes(c.status)
  );
  const published = (data?.contents || []).filter((c) => c.status === "PUBLISHED");

  const publish = async (id: string, platform?: string) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          ...(platform ? { platform } : {}),
          views: Math.floor(Math.random() * 500) + 50,
          likes: Math.floor(Math.random() * 80) + 5,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Publish thất bại");
      toast.success("Đã đăng bài thành công");
      qc.invalidateQueries({ queryKey: ["contents-publish"] });
      qc.invalidateQueries({ queryKey: ["contents"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Publish Hub"
        description="Xuất bản nội dung đã duyệt lên WordPress và các nền tảng social."
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {channels.map((ch) => (
          <Card key={ch.key} className="hover:border-emerald-200 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ch.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{ch.name}</CardTitle>
                <p className="text-xs text-slate-500">{ch.desc}</p>
              </div>
              <Badge variant="default">Sẵn sàng</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Chọn nội dung bên dưới và đăng lên {ch.name}.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Hàng đợi xuất bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : queue.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Không có bài chờ đăng. Duyệt nội dung ở Content Studio trước.
            </p>
          ) : (
            queue.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.author.name} · {c.platform || "multi"} ·{" "}
                    {CONTENT_STATUS_LABELS[c.status]} · {formatDate(c.updatedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={publishingId === c.id}
                  onClick={() => publish(c.id, c.platform || "wordpress")}
                >
                  {publishingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Publish
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đã đăng gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {published.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Chưa có bài published</p>
          ) : (
            published.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.platform || "—"} · {formatDate(c.updatedAt)}
                  </p>
                </div>
                <Badge>Published</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

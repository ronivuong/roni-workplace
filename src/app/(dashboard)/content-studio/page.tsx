"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Sparkles,
  FileText,
  Loader2,
  Send,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { isLeaderOrAbove } from "@/lib/rbac";

type Content = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  status: string;
  platform: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  team: { id: string; name: string; color: string } | null;
};

export default function ContentStudioPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const leader = isLeaderOrAbove(session?.user?.role);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "article",
    platform: "blog",
  });
  const [aiForm, setAiForm] = useState({
    topic: "",
    type: "article",
    platform: "tiktok",
    tone: "chuyên nghiệp, gần gũi",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contents", filter],
    queryFn: async () => {
      const q = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/content${q}`);
      if (!res.ok) throw new Error("Không tải được nội dung");
      return res.json() as Promise<{ contents: Content[] }>;
    },
  });

  const contents = data?.contents || [];

  const createManual = async () => {
    if (!form.title.trim()) {
      toast.error("Nhập tiêu đề");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      toast.success("Đã tạo bản nháp");
      setOpen(false);
      setForm({ title: "", body: "", type: "article", platform: "blog" });
      qc.invalidateQueries({ queryKey: ["contents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setSaving(false);
    }
  };

  const generateAi = async () => {
    if (!aiForm.topic.trim()) {
      toast.error("Nhập chủ đề");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      toast.success(d.message || "Đã tạo nội dung");
      setAiOpen(false);
      setAiForm({ topic: "", type: "article", platform: "tiktok", tone: "chuyên nghiệp, gần gũi" });
      qc.invalidateQueries({ queryKey: ["contents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error || "Không cập nhật được");
      return;
    }
    toast.success(`Đã chuyển sang «${CONTENT_STATUS_LABELS[status] || status}»`);
    qc.invalidateQueries({ queryKey: ["contents"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa nội dung này?")) return;
    const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Không xóa được");
      return;
    }
    toast.success("Đã xóa");
    qc.invalidateQueries({ queryKey: ["contents"] });
  };

  return (
    <div>
      <PageHeader
        title="AI Content Studio"
        description="Tạo, duyệt và quản lý nội dung — hỗ trợ AI hoặc viết thủ công."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Tạo thủ công
            </Button>
            <Button onClick={() => setAiOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Tạo với AI
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "Tất cả"],
          ["DRAFT", "Nháp"],
          ["IN_REVIEW", "Chờ duyệt"],
          ["APPROVED", "Đã duyệt"],
          ["PUBLISHED", "Đã đăng"],
          ["SCHEDULED", "Lên lịch"],
        ].map(([v, l]) => (
          <Button
            key={v}
            size="sm"
            variant={filter === v ? "default" : "outline"}
            onClick={() => setFilter(v)}
          >
            {l}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-red-600 mb-3">Không tải được danh sách nội dung</p>
            <Button onClick={() => refetch()}>Thử lại</Button>
          </CardContent>
        </Card>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-slate-400">
            <FileText className="h-10 w-10 mb-2" />
            Chưa có nội dung — bấm «Tạo với AI» để bắt đầu
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contents.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{c.title}</p>
                      <Badge variant="secondary">
                        {CONTENT_STATUS_LABELS[c.status] || c.status}
                      </Badge>
                      {c.platform && <Badge variant="outline">{c.platform}</Badge>}
                      <Badge variant="outline">{c.type}</Badge>
                    </div>
                    {c.body && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2 whitespace-pre-wrap">
                        {c.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {c.author.name}
                      {c.team ? ` · ${c.team.name}` : ""} · {formatDate(c.updatedAt)}
                      {c.views > 0 ? ` · ${c.views} views` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {c.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "IN_REVIEW")}>
                        <Send className="h-3.5 w-3.5" />
                        Gửi duyệt
                      </Button>
                    )}
                    {leader && c.status === "IN_REVIEW" && (
                      <>
                        <Button size="sm" onClick={() => setStatus(c.id, "APPROVED")}>
                          <Check className="h-3.5 w-3.5" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setStatus(c.id, "REJECTED")}
                        >
                          <X className="h-3.5 w-3.5" />
                          Từ chối
                        </Button>
                      </>
                    )}
                    {["APPROVED", "SCHEDULED"].includes(c.status) && (
                      <Button size="sm" onClick={() => setStatus(c.id, "PUBLISHED")}>
                        Đăng bài
                      </Button>
                    )}
                    {c.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "SCHEDULED")}>
                        Lên lịch
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manual create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo nội dung thủ công</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Tiêu đề</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tiêu đề bài viết..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Loại</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Bài viết</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Nền tảng</Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) => setForm({ ...form, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Nội dung</Label>
              <Textarea
                rows={6}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Nội dung..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={createManual} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu nháp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI generate */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Tạo nội dung bằng AI
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Chủ đề / brief</Label>
              <Textarea
                rows={3}
                value={aiForm.topic}
                onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                placeholder="VD: 5 tips viết caption viral TikTok cho shop mỹ phẩm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Loại</Label>
                <Select
                  value={aiForm.type}
                  onValueChange={(v) => setAiForm({ ...aiForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Bài viết</SelectItem>
                    <SelectItem value="script">Script video</SelectItem>
                    <SelectItem value="social">Caption social</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Nền tảng</Label>
                <Select
                  value={aiForm.platform}
                  onValueChange={(v) => setAiForm({ ...aiForm, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Giọng văn</Label>
              <Input
                value={aiForm.tone}
                onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
              />
            </div>
            <p className={cn("text-xs text-slate-500")}>
              Có API Key (Settings) → sinh bằng AI. Chưa có key → tạo template tiếng Việt sẵn
              để bạn chỉnh.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>
              Hủy
            </Button>
            <Button onClick={generateAi} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Đang tạo..." : "Tạo ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

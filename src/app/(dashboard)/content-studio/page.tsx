"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  FileText,
  Loader2,
  Send,
  Check,
  X,
  Trash2,
  Eye,
  Wand2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformPreview } from "@/components/content/platform-preview";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import {
  parseContentBody,
  platformLabel,
  type StructuredContent,
} from "@/lib/content-formats";
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

const PLATFORMS = [
  { value: "tiktok", label: "TikTok", hint: "Video dọc + script beats" },
  { value: "instagram", label: "Instagram", hint: "Feed / carousel" },
  { value: "facebook", label: "Facebook", hint: "Bài page" },
  { value: "youtube", label: "YouTube", hint: "Title + mô tả" },
  { value: "wordpress", label: "WordPress", hint: "Bài blog" },
  { value: "blog", label: "Blog", hint: "Long-form" },
  { value: "threads", label: "Threads", hint: "Thread ngắn" },
];

const PROMPT_EXAMPLES = [
  "5 tips viết caption viral cho shop mỹ phẩm trên TikTok",
  "Carousel Instagram: checklist content tuần cho agency",
  "Bài blog SEO: xu hướng AI content 2026 cho SME Việt Nam",
  "Script YouTube 8 phút review tai nghe true wireless",
];

export default function ContentStudioPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const leader = isLeaderOrAbove(session?.user?.role);

  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<Content | null>(null);
  const [livePreview, setLivePreview] = useState<StructuredContent | null>(null);

  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [type, setType] = useState("social");
  const [tone, setTone] = useState("chuyên nghiệp, gần gũi, có emoji vừa phải");

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

  const activeStructured = useMemo(() => {
    if (livePreview) return livePreview;
    if (selected) {
      return parseContentBody(selected.body, {
        title: selected.title,
        platform: selected.platform,
        type: selected.type,
      });
    }
    // empty state preview shell
    return parseContentBody(null, {
      title: "Preview sẽ hiện ở đây",
      platform,
      type,
    });
  }, [livePreview, selected, platform, type]);

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Nhập câu lệnh / brief cho AI");
      return;
    }
    setGenerating(true);
    setSelected(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: prompt,
          platform,
          type:
            platform === "youtube" || platform === "tiktok"
              ? "script"
              : platform === "wordpress" || platform === "blog"
                ? "article"
                : type,
          tone,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      setLivePreview(d.structured);
      if (d.content) setSelected(d.content);
      toast.success(d.message || "Đã tạo nội dung");
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
    toast.success(`Đã chuyển «${CONTENT_STATUS_LABELS[status] || status}»`);
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
    if (selected?.id === id) {
      setSelected(null);
      setLivePreview(null);
    }
    qc.invalidateQueries({ queryKey: ["contents"] });
  };

  const openItem = (c: Content) => {
    setSelected(c);
    setLivePreview(
      parseContentBody(c.body, {
        title: c.title,
        platform: c.platform,
        type: c.type,
      })
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Content Studio"
        description="Gõ brief → AI viết đúng format từng nền tảng → xem preview như đã đăng."
      />

      {/* Studio split layout */}
      <div className="grid gap-4 xl:grid-cols-12">
        {/* LEFT: Composer */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wand2 className="h-4 w-4" />
                Tạo nội dung bằng AI
              </div>
              <p className="text-xs text-emerald-50 mt-0.5">
                Chọn nền tảng trước — output & preview sẽ khớp kênh đó
              </p>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-1.5">
                <Label>Nền tảng xuất bản</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPlatform(p.value);
                        if (!livePreview && !selected) {
                          /* preview shell updates via platform state */
                        }
                      }}
                      className={cn(
                        "rounded-xl border px-2.5 py-2 text-left transition-all",
                        platform === p.value
                          ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <p className="text-xs font-semibold text-slate-900">{p.label}</p>
                      <p className="text-[10px] text-slate-500">{p.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Câu lệnh / brief cho AI</Label>
                <Textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="VD: Viết caption TikTok bán serum vitamin C, hook 3 giây, CTA comment 'MUỐN'..."
                  className="resize-none text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                    >
                      {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Định dạng</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social post</SelectItem>
                      <SelectItem value="script">Script video</SelectItem>
                      <SelectItem value="article">Bài viết</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Giọng văn</Label>
                  <Input value={tone} onChange={(e) => setTone(e.target.value)} />
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={generate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI đang viết cho {platformLabel(platform)}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo & xem preview {platformLabel(platform)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Library */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Thư viện nội dung</p>
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-2 h-7">
                      Tất cả
                    </TabsTrigger>
                    <TabsTrigger value="DRAFT" className="text-xs px-2 h-7">
                      Nháp
                    </TabsTrigger>
                    <TabsTrigger value="IN_REVIEW" className="text-xs px-2 h-7">
                      Duyệt
                    </TabsTrigger>
                    <TabsTrigger value="PUBLISHED" className="text-xs px-2 h-7">
                      Đăng
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : isError ? (
                <div className="text-center py-6">
                  <p className="text-sm text-red-600 mb-2">Không tải được</p>
                  <Button size="sm" onClick={() => refetch()}>
                    Thử lại
                  </Button>
                </div>
              ) : contents.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">Chưa có nội dung</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {contents.map((c) => {
                    const active = selected?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openItem(c)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-emerald-300 bg-emerald-50/80 shadow-sm"
                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">
                            {c.title}
                          </p>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {CONTENT_STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {platformLabel(c.platform || "blog")} · {c.author.name} ·{" "}
                          {formatDate(c.updatedAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {c.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => setStatus(c.id, "IN_REVIEW")}
                            >
                              <Send className="h-3 w-3" />
                              Gửi duyệt
                            </Button>
                          )}
                          {leader && c.status === "IN_REVIEW" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => setStatus(c.id, "APPROVED")}
                              >
                                <Check className="h-3 w-3" />
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[11px]"
                                onClick={() => setStatus(c.id, "REJECTED")}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {["APPROVED", "SCHEDULED"].includes(c.status) && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => setStatus(c.id, "PUBLISHED")}
                            >
                              Đăng
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px]"
                            onClick={() => {
                              openItem(c);
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Full
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-red-500"
                            onClick={() => remove(c.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live platform preview */}
        <div className="xl:col-span-7">
          <Card className="sticky top-20 border-slate-200/80 bg-gradient-to-b from-slate-50 to-white min-h-[640px]">
            <CardContent className="p-4 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Xem như đã xuất bản
                    </p>
                    <p className="text-xs text-slate-500">
                      Mock UI {platformLabel(activeStructured.platform)} — không phải feed thật
                    </p>
                  </div>
                </div>
                {(livePreview || selected) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Phóng to
                  </Button>
                )}
              </div>

              {generating ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm font-medium">AI đang soạn cho {platformLabel(platform)}…</p>
                  <p className="text-xs text-slate-400 mt-1">Hook · caption · hashtag · CTA</p>
                </div>
              ) : !livePreview && !selected ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Preview trực quan sẽ hiện tại đây
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    Chọn nền tảng bên trái, nhập brief, bấm tạo — bạn sẽ thấy bài như trên
                    TikTok / Instagram / Facebook / YouTube / Blog.
                  </p>
                  <div className="mt-6 w-full opacity-60 pointer-events-none scale-95 origin-top">
                    <PlatformPreview
                      content={parseContentBody(null, {
                        title: "Ví dụ preview " + platformLabel(platform),
                        platform,
                        type,
                      })}
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  {/* Structured text panel */}
                  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5">
                    <p>
                      <span className="font-semibold text-slate-500">Tiêu đề: </span>
                      {activeStructured.title}
                    </p>
                    {activeStructured.hook && (
                      <p>
                        <span className="font-semibold text-slate-500">Hook: </span>
                        {activeStructured.hook}
                      </p>
                    )}
                    {activeStructured.cta && (
                      <p>
                        <span className="font-semibold text-slate-500">CTA: </span>
                        {activeStructured.cta}
                      </p>
                    )}
                    {!!activeStructured.hashtags?.length && (
                      <p className="text-sky-600">{activeStructured.hashtags.join(" ")}</p>
                    )}
                  </div>
                  <PlatformPreview content={activeStructured} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fullscreen-ish preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview {platformLabel(activeStructured.platform)} — như đã xuất bản
            </DialogTitle>
          </DialogHeader>
          <PlatformPreview content={activeStructured} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

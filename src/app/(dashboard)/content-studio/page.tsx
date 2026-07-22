"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  PenLine,
  Save,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformPreview } from "@/components/content/platform-preview";
import { ContentEditor } from "@/components/content/content-editor";
import { DistributePanel } from "@/components/content/distribute-panel";
import { ScheduleCalendar } from "@/components/content/schedule-calendar";
import { ArticleSeoWorkspace } from "@/components/content/article-seo-workspace";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import {
  parseContentBody,
  platformLabel,
  pickEmoji,
  pickGradient,
  serializeContent,
  type StructuredContent,
} from "@/lib/content-formats";
import { emptySeoMeta } from "@/lib/seo";
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
  publishedUrl?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  team: { id: string; name: string; color: string } | null;
  publishes?: {
    id: string;
    platform: string;
    status: string;
    publishedUrl: string | null;
    scheduledAt: string | null;
  }[];
};

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "wordpress", label: "WordPress" },
  { value: "blog", label: "Blog" },
  { value: "threads", label: "Threads" },
];

const PROMPT_EXAMPLES = [
  "5 tips viết caption viral cho shop mỹ phẩm trên TikTok",
  "Carousel Instagram: checklist content tuần cho agency",
  "Bài blog SEO: xu hướng AI content 2026 cho SME Việt Nam",
  "Script YouTube 8 phút review tai nghe true wireless",
];

function emptyStructured(
  platform: string,
  authorName?: string | null,
  mode: "social" | "article" = "social"
): StructuredContent {
  if (mode === "article") {
    return {
      version: 1,
      mode: "article",
      platform: platform === "wordpress" || platform === "blog" ? platform : "wordpress",
      type: "article",
      title: "",
      hook: "",
      caption: "",
      body: "",
      hashtags: [],
      cta: "",
      authorName: authorName || "Roni Editorial",
      authorHandle: "@roni.workplace",
      coverEmoji: "✍️",
      coverGradient: pickGradient("article"),
      seo: emptySeoMeta({
        platform: platform === "blog" ? "blog" : "wordpress",
      }),
    };
  }
  return {
    version: 1,
    mode: "social",
    platform,
    type:
      platform === "youtube" || platform === "tiktok"
        ? "script"
        : platform === "wordpress" || platform === "blog"
          ? "article"
          : "social",
    title: "",
    hook: "",
    caption: "",
    body: "",
    hashtags: [],
    cta: "",
    beats: [],
    authorName: authorName || "Roni Creator",
    authorHandle: "@roni.creator",
    coverEmoji: pickEmoji(platform),
    coverGradient: pickGradient(platform + Date.now()),
  };
}

export default function ContentStudioPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const leader = isLeaderOrAbove(session?.user?.role);

  const [mainTab, setMainTab] = useState("studio");
  const [studioMode, setStudioMode] = useState<"social" | "article">("social");
  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [contentId, setContentId] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [platform, setPlatform] = useState("tiktok");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("chuyên nghiệp, gần gũi, có emoji vừa phải");
  const [structured, setStructured] = useState<StructuredContent>(() =>
    emptyStructured("tiktok")
  );
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contents", filter],
    queryFn: async () => {
      const q = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/content${q}`);
      if (!res.ok) throw new Error("Không tải được nội dung");
      return res.json() as Promise<{ contents: Content[] }>;
    },
  });

  const { data: platformData } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const res = await fetch("/api/platforms");
      if (!res.ok) return { platforms: [] };
      return res.json();
    },
  });

  const contents = data?.contents || [];
  const platformOptions = useMemo(() => {
    const list = platformData?.platforms || [];
    if (!list.length) {
      return PLATFORMS.map((p) => ({
        key: p.value,
        name: p.label,
        isConnected: false,
        accountName: null as string | null,
      }));
    }
    return list.map(
      (p: {
        key: string;
        name: string;
        connection: { isConnected: boolean; accountName: string | null };
      }) => ({
        key: p.key,
        name: p.name,
        isConnected: p.connection.isConnected,
        accountName: p.connection.accountName,
      })
    );
  }, [platformData]);

  // Keep preview platform in sync with editor
  useEffect(() => {
    if (structured.platform !== platform) {
      setStructured((s) => ({ ...s, platform }));
    }
  }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStructured = useCallback((next: StructuredContent) => {
    setStructured(next);
    setDirty(true);
  }, []);

  const newBlank = (mode?: "social" | "article") => {
    const m = mode || studioMode;
    setContentId(null);
    setStatus("DRAFT");
    setPrompt("");
    const p = m === "article" ? "wordpress" : platform;
    if (m === "article") setPlatform("wordpress");
    setStudioMode(m);
    setStructured(emptyStructured(p, session?.user?.name, m));
    setDirty(false);
    toast.message(
      m === "article"
        ? "Article SEO — điền brief hoặc viết tay"
        : "Canvas trống — soạn tay hoặc dùng AI"
    );
  };

  const loadContent = (c: Content) => {
    const s = parseContentBody(c.body, {
      title: c.title,
      platform: c.platform,
      type: c.type,
    });
    const isArticle =
      s.mode === "article" ||
      c.type === "article" ||
      !!s.seo ||
      c.platform === "wordpress" ||
      c.platform === "blog";
    setContentId(c.id);
    setStatus(c.status);
    setPlatform(c.platform || s.platform || (isArticle ? "wordpress" : "tiktok"));
    setStudioMode(isArticle ? "article" : "social");
    setStructured({
      ...s,
      mode: isArticle ? "article" : "social",
      type: isArticle ? "article" : s.type,
      seo: s.seo || (isArticle ? emptySeoMeta() : undefined),
      authorName: s.authorName || session?.user?.name || "Roni Creator",
    });
    setDirty(false);
    setMainTab("studio");
  };

  const saveDraft = async (opts?: { silent?: boolean }) => {
    if (!structured.title.trim()) {
      toast.error("Nhập tiêu đề trước khi lưu");
      return null;
    }
    setSaving(true);
    try {
      const plat =
        studioMode === "article"
          ? structured.seo?.platform === "blog"
            ? "blog"
            : structured.platform || "wordpress"
          : platform;
      const payload = {
        title: structured.title,
        type: studioMode === "article" ? "article" : structured.type,
        platform: plat,
        structured: {
          ...structured,
          platform: plat,
          mode: studioMode,
          type: studioMode === "article" ? "article" : structured.type,
        },
        status: status === "PUBLISHED" || status === "SCHEDULED" ? status : "DRAFT",
      };

      let res: Response;
      if (contentId) {
        res = await fetch(`/api/content/${contentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: structured.title,
            body: serializeContent(payload.structured),
            type: payload.type,
            platform: plat,
            status: "DRAFT",
          }),
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lưu thất bại");
      const saved = d.content as Content;
      setContentId(saved.id);
      setStatus(saved.status);
      setDirty(false);
      if (!opts?.silent) toast.success("Đã lưu bản nháp");
      qc.invalidateQueries({ queryKey: ["contents"] });
      return saved.id as string;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const generateAi = async () => {
    if (!prompt.trim()) {
      toast.error("Nhập brief / câu lệnh cho AI");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: prompt,
          platform,
          type: structured.type,
          tone,
          save: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "AI lỗi");
      const s = d.structured as StructuredContent;
      setStructured({
        ...s,
        platform,
        authorName: session?.user?.name || s.authorName || "Roni Creator",
      });
      if (d.content?.id) {
        setContentId(d.content.id);
        setStatus(d.content.status || "DRAFT");
      }
      setDirty(false);
      toast.success(d.message || "AI đã tạo — bạn có thể chỉnh sửa bên dưới");
      qc.invalidateQueries({ queryKey: ["contents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setGenerating(false);
    }
  };

  const setContentStatus = async (id: string, next: string) => {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error || "Không cập nhật được");
      return;
    }
    toast.success(`Đã chuyển «${CONTENT_STATUS_LABELS[next] || next}»`);
    if (contentId === id) setStatus(next);
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
    if (contentId === id) newBlank();
    qc.invalidateQueries({ queryKey: ["contents"] });
  };

  const ensureSavedThen = async (fn: (id: string) => void | Promise<void>) => {
    let id = contentId;
    if (dirty || !id) {
      id = await saveDraft({ silent: true });
    }
    if (id) await fn(id);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Content Studio"
        description="Social + Article SEO: brief → AI → editor → preview → multi-publish."
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
              <Button
                size="sm"
                variant={studioMode === "social" ? "default" : "ghost"}
                className="h-8"
                onClick={() => {
                  if (dirty && !confirm("Đổi mode có thể mất chỉnh sửa chưa lưu. Tiếp tục?"))
                    return;
                  setStudioMode("social");
                  setPlatform("tiktok");
                  setStructured(emptyStructured("tiktok", session?.user?.name, "social"));
                  setContentId(null);
                  setDirty(false);
                }}
              >
                Social
              </Button>
              <Button
                size="sm"
                variant={studioMode === "article" ? "default" : "ghost"}
                className="h-8"
                onClick={() => {
                  if (dirty && !confirm("Đổi mode có thể mất chỉnh sửa chưa lưu. Tiếp tục?"))
                    return;
                  newBlank("article");
                }}
              >
                Article SEO
              </Button>
            </div>
            <Button variant="outline" onClick={() => newBlank(studioMode)}>
              <PenLine className="h-4 w-4" />
              Soạn tay mới
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => saveDraft()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu nháp
            </Button>
          </div>
        }
      />

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="library">Thư viện</TabsTrigger>
          <TabsTrigger value="calendar">Lịch đăng</TabsTrigger>
        </TabsList>

        {/* ========== STUDIO ========== */}
        <TabsContent value="studio" className="mt-4 space-y-4">
          {studioMode === "article" ? (
            <div className="space-y-4">
              <ArticleSeoWorkspace
                structured={structured}
                onChange={(next) => {
                  setStructured(next);
                  setDirty(true);
                  if (next.platform) setPlatform(next.platform);
                }}
                contentId={contentId}
                saving={saving}
                onContentCreated={(id) => {
                  setContentId(id);
                  setStatus("DRAFT");
                  setDirty(false);
                  qc.invalidateQueries({ queryKey: ["contents"] });
                }}
                onSave={async () => {
                  await saveDraft();
                }}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-wrap gap-2">
                  {contentId && status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        ensureSavedThen((id) => setContentStatus(id, "IN_REVIEW"))
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                      Gửi duyệt
                    </Button>
                  )}
                  {leader && contentId && status === "IN_REVIEW" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setContentStatus(contentId, "APPROVED")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setContentStatus(contentId, "REJECTED")}
                      >
                        <X className="h-3.5 w-3.5" />
                        Từ chối
                      </Button>
                    </>
                  )}
                </div>
                <DistributePanel
                  contentId={contentId}
                  platforms={platformOptions}
                  onEnsureSaved={async () => {
                    if (!structured.title.trim()) {
                      toast.error("Nhập tiêu đề H1");
                      return null;
                    }
                    if (dirty || !contentId) return saveDraft({ silent: true });
                    return contentId;
                  }}
                  onDone={() => {
                    qc.invalidateQueries({ queryKey: ["contents"] });
                    qc.invalidateQueries({ queryKey: ["content-calendar"] });
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                  }}
                />
              </div>
            </div>
          ) : (
          <div className="grid gap-4 xl:grid-cols-12">
            {/* Left column: AI + Editor + Distribute */}
            <div className="xl:col-span-5 space-y-4">
              {/* AI prompt */}
              <Card className="border-emerald-100 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Wand2 className="h-4 w-4" />
                    1. AI tạo theo brief
                  </div>
                  <p className="text-[11px] text-emerald-50 mt-0.5">
                    Sau khi AI xong, chỉnh sửa tự do ở bước 2
                  </p>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Nền tảng preview / format</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            setPlatform(p.value);
                            setDirty(true);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all",
                            platform === p.value
                              ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                              : "border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <PlatformIcon platform={p.value} size="sm" />
                          <span className="text-[9px] font-medium text-slate-700">
                            {p.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs">Câu lệnh / brief</Label>
                    <Textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="VD: Caption TikTok bán serum vitamin C, hook 3s, CTA comment MUỐN…"
                      className="resize-none text-sm"
                    />
                    <div className="flex flex-wrap gap-1">
                      {PROMPT_EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => setPrompt(ex)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          {ex.length > 36 ? ex.slice(0, 34) + "…" : ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs">Giọng văn</Label>
                    <Input value={tone} onChange={(e) => setTone(e.target.value)} />
                  </div>

                  <Button
                    className="w-full"
                    onClick={generateAi}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI đang viết {platformLabel(platform)}…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI tạo → đổ vào editor
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Visual editor */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-emerald-600" />
                        2. Chỉnh sửa trực quan
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {contentId ? (
                          <>
                            ID: {contentId.slice(-8)} ·{" "}
                            <Badge variant="secondary" className="text-[10px]">
                              {CONTENT_STATUS_LABELS[status] || status}
                            </Badge>
                            {dirty && (
                              <span className="text-amber-600 ml-1">· chưa lưu</span>
                            )}
                          </>
                        ) : (
                          "Bản mới — chưa lưu"
                        )}
                      </p>
                    </div>
                    <Select
                      value={structured.type}
                      onValueChange={(v) =>
                        updateStructured({ ...structured, type: v })
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="script">Script</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ContentEditor
                    value={structured}
                    onChange={updateStructured}
                    compact
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => saveDraft()}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Lưu
                    </Button>
                    {contentId && status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          ensureSavedThen((id) => setContentStatus(id, "IN_REVIEW"))
                        }
                      >
                        <Send className="h-3.5 w-3.5" />
                        Gửi duyệt
                      </Button>
                    )}
                    {leader && contentId && status === "IN_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setContentStatus(contentId, "APPROVED")}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setContentStatus(contentId, "REJECTED")}
                        >
                          <X className="h-3.5 w-3.5" />
                          Từ chối
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Distribute */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-emerald-600">3.</span> Đăng hoặc lên lịch
                </p>
                <DistributePanel
                  contentId={contentId}
                  platforms={platformOptions}
                  disabled={generating}
                  onEnsureSaved={async () => {
                    if (!structured.title.trim()) {
                      toast.error("Nhập tiêu đề trước");
                      return null;
                    }
                    if (dirty || !contentId) {
                      return saveDraft({ silent: true });
                    }
                    return contentId;
                  }}
                  onDone={() => {
                    qc.invalidateQueries({ queryKey: ["contents"] });
                    qc.invalidateQueries({ queryKey: ["content-calendar"] });
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                    qc.invalidateQueries({ queryKey: ["contents-publish"] });
                    if (contentId) {
                      fetch(`/api/content/${contentId}`)
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.content) setStatus(d.content.status);
                        })
                        .catch(() => {});
                    }
                  }}
                />
              </div>
            </div>

            {/* Right: live preview */}
            <div className="xl:col-span-7">
              <Card className="sticky top-20 min-h-[680px] border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Preview · {platformLabel(platform)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Cập nhật realtime khi bạn chỉnh editor
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Phóng to
                    </Button>
                  </div>

                  {generating ? (
                    <div className="flex flex-col items-center justify-center py-28 text-slate-500">
                      <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-3" />
                      <p className="text-sm font-medium">AI đang soạn…</p>
                    </div>
                  ) : (
                    <PlatformPreview
                      content={{ ...structured, platform }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </TabsContent>

        {/* ========== LIBRARY ========== */}
        <TabsContent value="library" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {["all", "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"].map(
                  (f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={filter === f ? "default" : "outline"}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "Tất cả" : CONTENT_STATUS_LABELS[f] || f}
                    </Button>
                  )
                )}
              </div>

              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : isError ? (
                <div className="text-center py-8">
                  <Button onClick={() => refetch()}>Thử lại</Button>
                </div>
              ) : contents.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                  <FileText className="h-10 w-10 mb-2" />
                  Chưa có nội dung
                </div>
              ) : (
                <div className="space-y-2">
                  {contents.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
                        contentId === c.id
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-100"
                      )}
                    >
                      <button
                        type="button"
                        className="text-left min-w-0 flex-1"
                        onClick={() => loadContent(c)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {c.platform && (
                            <PlatformIcon platform={c.platform} size="sm" />
                          )}
                          <p className="text-sm font-medium">{c.title}</p>
                          <Badge variant="secondary">
                            {CONTENT_STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {c.author.name} · {formatDate(c.updatedAt)}
                          {c.publishes?.length
                            ? ` · ${c.publishes.length} kênh`
                            : ""}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => loadContent(c)}>
                          Mở editor
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => remove(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== CALENDAR ========== */}
        <TabsContent value="calendar" className="mt-4">
          <ScheduleCalendar />
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview {platformLabel(platform)} — như đã xuất bản
            </DialogTitle>
          </DialogHeader>
          <PlatformPreview content={{ ...structured, platform }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

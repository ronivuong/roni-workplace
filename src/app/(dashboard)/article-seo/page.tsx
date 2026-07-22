"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Save,
  PenLine,
  FileText,
  Share2,
  Trash2,
  Check,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleSeoWorkspace } from "@/components/content/article-seo-workspace";
import { ArticleSocialShare } from "@/components/content/article-social-share";
import { ScheduleCalendar } from "@/components/content/schedule-calendar";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import {
  emptySeoMeta,
  type SeoMeta,
} from "@/lib/seo";
import {
  parseContentBody,
  serializeContent,
  pickGradient,
  type StructuredContent,
} from "@/lib/content-formats";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { isLeaderOrAbove } from "@/lib/rbac";

type Content = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  platform: string | null;
  type: string;
  updatedAt: string;
  author: { name: string };
};

function emptyArticle(authorName?: string | null): StructuredContent {
  return {
    version: 1,
    mode: "article",
    platform: "wordpress",
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
    seo: emptySeoMeta({ platform: "wordpress" }),
  };
}

export default function ArticleSeoPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const search = useSearchParams();
  const leader = isLeaderOrAbove(session?.user?.role);

  const [tab, setTab] = useState("studio");
  const [contentId, setContentId] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [structured, setStructured] = useState<StructuredContent>(() =>
    emptyArticle()
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["article-contents", filter],
    queryFn: async () => {
      const res = await fetch("/api/content?type=article");
      if (!res.ok) throw new Error("Failed");
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

  const articles = useMemo(() => {
    const list = data?.contents || [];
    // Prefer type=article or mode article / wordpress
    return list.filter((c) => {
      if (c.type === "article") return true;
      if (c.platform === "wordpress" || c.platform === "blog") return true;
      try {
        const s = parseContentBody(c.body, { title: c.title, type: c.type });
        return s.mode === "article" || !!s.seo;
      } catch {
        return false;
      }
    }).filter((c) => (filter === "all" ? true : c.status === filter));
  }, [data, filter]);

  const platformOptions = useMemo(() => {
    const list = platformData?.platforms || [];
    if (!list.length) {
      return [
        "facebook",
        "instagram",
        "tiktok",
        "threads",
        "youtube",
        "wordpress",
      ].map((key) => ({
        key,
        name: key,
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

  // Deep link ?id=
  useEffect(() => {
    const id = search.get("id");
    if (!id || !data?.contents) return;
    const c = data.contents.find((x) => x.id === id);
    if (c) loadContent(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, data?.contents]);

  useEffect(() => {
    if (session?.user?.name && !contentId && !dirty) {
      setStructured((s) => ({
        ...s,
        authorName: s.authorName || session.user.name || "Roni Editorial",
      }));
    }
  }, [session?.user?.name, contentId, dirty]);

  const newBlank = () => {
    if (dirty && !confirm("Có thay đổi chưa lưu. Tạo bài mới?")) return;
    setContentId(null);
    setStatus("DRAFT");
    setStructured(emptyArticle(session?.user?.name));
    setDirty(false);
    setTab("studio");
    toast.message("Bài SEO mới — điền brief hoặc viết tay");
  };

  const loadContent = (c: Content) => {
    const s = parseContentBody(c.body, {
      title: c.title,
      platform: c.platform,
      type: c.type,
    });
    setContentId(c.id);
    setStatus(c.status);
    setStructured({
      ...s,
      mode: "article",
      type: "article",
      platform: c.platform || s.platform || "wordpress",
      seo: s.seo || emptySeoMeta(),
      authorName: s.authorName || session?.user?.name || "Roni Editorial",
    });
    setDirty(false);
    setTab("studio");
  };

  const saveDraft = async (opts?: { silent?: boolean }) => {
    if (!structured.title.trim()) {
      toast.error("Nhập tiêu đề (H1) trước khi lưu");
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        title: structured.title,
        body: serializeContent({
          ...structured,
          mode: "article",
          type: "article",
        }),
        type: "article",
        platform: structured.platform || "wordpress",
        status: status === "PUBLISHED" ? status : "DRAFT",
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
          body: JSON.stringify(payload),
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lưu thất bại");
      const id = d.content?.id || contentId;
      if (id) setContentId(id);
      if (d.content?.status) setStatus(d.content.status);
      setDirty(false);
      if (!opts?.silent) toast.success("Đã lưu bài SEO");
      qc.invalidateQueries({ queryKey: ["article-contents"] });
      qc.invalidateQueries({ queryKey: ["contents"] });
      return id as string;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
      return null;
    } finally {
      setSaving(false);
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
    setStatus(next);
    toast.success(CONTENT_STATUS_LABELS[next] || next);
    qc.invalidateQueries({ queryKey: ["article-contents"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa bài này?")) return;
    const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Không xóa được");
      return;
    }
    toast.success("Đã xóa");
    if (contentId === id) newBlank();
    qc.invalidateQueries({ queryKey: ["article-contents"] });
  };

  const onChange = useCallback((next: StructuredContent) => {
    setStructured({ ...next, mode: "article", type: "article" });
    setDirty(true);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Article SEO"
        description="Soạn bài SEO chuẩn (Classic Editor) · checklist · SERP · rồi auto-share social tối ưu từng kênh."
        actions={
          <div className="flex w-full sm:w-auto flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={newBlank}>
              <PenLine className="h-4 w-4" />
              Bài mới
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => saveDraft()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu
            </Button>
            <Button size="sm" onClick={() => setTab("social")}>
              <Share2 className="h-4 w-4" />
              Social share
            </Button>
          </div>
        }
      />

      {/* Pipeline strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { n: "1", t: "SEO Brief", d: "Keyword · intent" },
          { n: "2", t: "Viết bài", d: "Classic Editor" },
          { n: "3", t: "Tối ưu score", d: "Checklist SERP" },
          { n: "4", t: "Share social", d: "Multi-platform" },
        ].map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 flex items-center gap-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">{s.t}</p>
              <p className="text-[10px] text-slate-500 truncate">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="studio" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Soạn SEO
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Social share
          </TabsTrigger>
          <TabsTrigger value="library">Thư viện</TabsTrigger>
          <TabsTrigger value="calendar">Lịch</TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {contentId ? (
              <>
                <Badge variant="secondary">
                  {CONTENT_STATUS_LABELS[status] || status}
                </Badge>
                <span>ID …{contentId.slice(-8)}</span>
                {dirty && <span className="text-amber-600">· chưa lưu</span>}
              </>
            ) : (
              <span>Bản mới — chưa lưu</span>
            )}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {contentId && status === "DRAFT" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const id = dirty || !contentId ? await saveDraft({ silent: true }) : contentId;
                    if (id) setContentStatus(id, "IN_REVIEW");
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Gửi duyệt
                </Button>
              )}
              {leader && contentId && status === "IN_REVIEW" && (
                <>
                  <Button size="sm" onClick={() => setContentStatus(contentId, "APPROVED")}>
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
          </div>

          <ArticleSeoWorkspace
            structured={structured}
            onChange={onChange}
            contentId={contentId}
            saving={saving}
            onContentCreated={(id) => {
              setContentId(id);
              setStatus("DRAFT");
              setDirty(false);
              qc.invalidateQueries({ queryKey: ["article-contents"] });
            }}
            onSave={async () => {
              await saveDraft();
            }}
          />

          <Card className="border-dashed border-violet-200 bg-violet-50/30">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Bước tiếp: Auto share social
                </p>
                <p className="text-xs text-slate-500">
                  Tạo caption tối ưu từng nền tảng từ bài SEO vừa viết
                </p>
              </div>
              <Button onClick={() => setTab("social")}>
                <Share2 className="h-4 w-4" />
                Mở Social share
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <ArticleSocialShare
            structured={structured}
            contentId={contentId}
            platforms={platformOptions}
            authorName={session?.user?.name}
            onRequireSave={async () => saveDraft({ silent: true })}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ["article-contents"] });
              qc.invalidateQueries({ queryKey: ["contents"] });
              qc.invalidateQueries({ queryKey: ["contents-publish"] });
              qc.invalidateQueries({ queryKey: ["content-calendar"] });
              qc.invalidateQueries({ queryKey: ["notifications"] });
            }}
          />
        </TabsContent>

        <TabsContent value="library">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto tabs-scroll pb-1">
                {["all", "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"].map(
                  (f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={filter === f ? "default" : "outline"}
                      className="shrink-0"
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "Tất cả" : CONTENT_STATUS_LABELS[f] || f}
                    </Button>
                  )
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : articles.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center">
                  Chưa có bài Article SEO
                </p>
              ) : (
                <div className="space-y-2">
                  {articles.map((c) => (
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
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => loadContent(c)}>
                          Mở
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadContent(c);
                            setTab("social");
                          }}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share
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

        <TabsContent value="calendar">
          <ScheduleCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

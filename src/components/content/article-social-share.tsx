"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Sparkles,
  Rocket,
  CalendarClock,
  Save,
  Check,
  Wand2,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { PlatformPreview } from "@/components/content/platform-preview";
import {
  type SocialVariant,
  SOCIAL_SHARE_PLATFORMS,
  buildSocialVariantsFromArticle,
  variantToStructured,
} from "@/lib/article-social";
import type { StructuredContent } from "@/lib/content-formats";
import { cn } from "@/lib/utils";

type Connected = {
  key: string;
  name: string;
  isConnected: boolean;
  accountName?: string | null;
};

type Props = {
  structured: StructuredContent;
  contentId: string | null;
  platforms: Connected[];
  authorName?: string | null;
  onRequireSave?: () => Promise<string | null>;
  onDone?: () => void;
};

export function ArticleSocialShare({
  structured,
  contentId,
  platforms,
  authorName,
  onRequireSave,
  onDone,
}: Props) {
  const [variants, setVariants] = useState<SocialVariant[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string>("facebook");
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mode, setMode] = useState<"publish" | "schedule" | "draft">("publish");
  const [scheduledAt, setScheduledAt] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const connectedKeys = useMemo(
    () => new Set(platforms.filter((p) => p.isConnected).map((p) => p.key)),
    [platforms]
  );

  const activeVariant = variants.find((v) => v.platform === active) || variants[0];

  const generate = async (refineWithAi: boolean) => {
    if (!structured.title.trim() && !structured.body?.trim()) {
      toast.error("Soạn bài SEO trước (tiêu đề + nội dung)");
      return;
    }
    setGenerating(true);
    try {
      // Instant local fallback then try API (with optional AI)
      const local = buildSocialVariantsFromArticle(structured, {
        siteUrl: siteUrl || null,
      });
      setVariants(local);
      setSelected(local.map((v) => v.platform));
      setActive(local[0]?.platform || "facebook");

      const res = await fetch("/api/content/article/social-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          structured,
          siteUrl: siteUrl || null,
          refineWithAi,
        }),
      });
      const d = await res.json();
      if (res.ok && Array.isArray(d.variants) && d.variants.length) {
        setVariants(d.variants);
        setSelected(d.variants.map((v: SocialVariant) => v.platform));
        toast.success(
          refineWithAi
            ? "Đã tạo & tinh chỉnh AI cho từng nền tảng"
            : "Đã tạo bản share tối ưu từng nền tảng"
        );
      } else {
        toast.success("Đã tạo bản share (template tối ưu)");
      }
    } catch {
      toast.error("Không tạo được social variants");
    } finally {
      setGenerating(false);
    }
  };

  const patchVariant = (platform: string, partial: Partial<SocialVariant>) => {
    setVariants((prev) =>
      prev.map((v) => (v.platform === platform ? { ...v, ...partial } : v))
    );
  };

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const share = async () => {
    if (!selected.length) {
      toast.error("Chọn ít nhất một nền tảng");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      toast.error("Chọn thời gian lên lịch");
      return;
    }

    setSharing(true);
    try {
      let id = contentId;
      if (!id && onRequireSave) {
        id = await onRequireSave();
      }
      if (!id) {
        toast.error("Lưu bài SEO trước khi share");
        return;
      }

      const res = await fetch("/api/content/article/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceContentId: id,
          platforms: selected,
          variants,
          mode,
          scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Share thất bại");
      toast.success(d.message || "Thành công");
      if (d.results?.[0]?.publishedUrl) {
        toast.message("Link bài đầu tiên", {
          description: d.results[0].publishedUrl,
        });
      }
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi share");
    } finally {
      setSharing(false);
    }
  };

  const previewStructured = activeVariant
    ? variantToStructured(activeVariant, authorName)
    : null;

  return (
    <div className="space-y-4">
      <Card className="border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Share2 className="h-4 w-4" />
            Tự động share · tối ưu từng mạng xã hội
          </div>
          <p className="text-[11px] text-violet-100 mt-0.5">
            Biến bài SEO thành caption/script riêng cho Facebook, Instagram, TikTok, Threads,
            YouTube, LinkedIn — rồi đăng / lên lịch hàng loạt.
          </p>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-1.5 sm:max-w-md">
            <Label className="text-xs">Link bài (đưa vào caption)</Label>
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://blog-cua-ban.com/slug-bai-viet"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => generate(false)} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Tạo bản share tối ưu
            </Button>
            <Button
              variant="outline"
              onClick={() => generate(true)}
              disabled={generating}
            >
              <Sparkles className="h-4 w-4" />
              Tạo + AI refine
            </Button>
          </div>
          {!contentId && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Nên lưu bài SEO trước khi share để gắn nguồn & theo dõi lịch sử.
            </p>
          )}
        </CardContent>
      </Card>

      {!variants.length ? (
        <Card>
          <CardContent className="py-14 text-center text-slate-500 text-sm">
            <Share2 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            Chưa có bản social. Bấm <strong>Tạo bản share tối ưu</strong> sau khi soạn xong bài SEO.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          {/* Platform list */}
          <div className="lg:col-span-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-0.5">
              Nền tảng ({selected.length}/{variants.length})
            </p>
            {variants.map((v) => {
              const on = selected.includes(v.platform);
              const connected = connectedKeys.has(v.platform);
              return (
                <div
                  key={v.platform}
                  className={cn(
                    "rounded-xl border p-3 transition-all",
                    active === v.platform
                      ? "border-violet-300 bg-violet-50/50 ring-2 ring-violet-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded border shrink-0",
                        on
                          ? "border-violet-500 bg-violet-500 text-white"
                          : "border-slate-300 bg-white"
                      )}
                      onClick={() => toggle(v.platform)}
                      aria-label={`Chọn ${v.label}`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActive(v.platform)}
                    >
                      <div className="flex items-center gap-2">
                        <PlatformIcon
                          platform={
                            v.platform === "linkedin" ? "blog" : v.platform
                          }
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {v.label}
                        </span>
                        {connected ? (
                          <Badge variant="default" className="text-[10px] h-5">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            Chưa kết nối
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {v.limits}
                      </p>
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Hành động</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { k: "publish" as const, l: "Đăng ngay", icon: Rocket },
                    { k: "schedule" as const, l: "Lên lịch", icon: CalendarClock },
                    { k: "draft" as const, l: "Lưu nháp", icon: Save },
                  ] as const
                ).map(({ k, l, icon: Icon }) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={mode === k ? "default" : "outline"}
                    className="flex-1 min-w-[90px]"
                    onClick={() => setMode(k)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {l}
                  </Button>
                ))}
              </div>
              {mode === "schedule" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
              <Button
                className="w-full"
                disabled={sharing || !selected.length}
                onClick={share}
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {mode === "publish"
                  ? `Share ${selected.length} kênh`
                  : mode === "schedule"
                    ? `Lên lịch ${selected.length} kênh`
                    : `Lưu nháp ${selected.length} kênh`}
              </Button>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Mỗi kênh tạo 1 content riêng (caption tối ưu) và ghi nhận Publish Hub / Analytics.
              </p>
            </div>
          </div>

          {/* Editor + preview */}
          <div className="lg:col-span-8 space-y-4">
            {activeVariant && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PlatformIcon
                        platform={
                          activeVariant.platform === "linkedin"
                            ? "blog"
                            : activeVariant.platform
                        }
                        size="sm"
                      />
                      Chỉnh bản {activeVariant.label}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {activeVariant.limits}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Tiêu đề / hook title</Label>
                      <Input
                        value={activeVariant.title}
                        onChange={(e) =>
                          patchVariant(activeVariant.platform, {
                            title: e.target.value,
                          })
                        }
                        className="h-9 text-sm font-medium"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Hook</Label>
                      <Input
                        value={activeVariant.hook}
                        onChange={(e) =>
                          patchVariant(activeVariant.platform, {
                            hook: e.target.value,
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Caption / post</Label>
                      <Textarea
                        rows={6}
                        value={activeVariant.caption || activeVariant.body}
                        onChange={(e) =>
                          patchVariant(activeVariant.platform, {
                            caption: e.target.value,
                            body: e.target.value,
                          })
                        }
                        className="text-sm resize-y min-h-[120px]"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">
                        Hashtags ({activeVariant.hashtags?.length || 0})
                      </Label>
                      <Input
                        value={(activeVariant.hashtags || []).join(" ")}
                        onChange={(e) =>
                          patchVariant(activeVariant.platform, {
                            hashtags: e.target.value
                              .split(/[\s,]+/)
                              .map((t) => t.trim())
                              .filter(Boolean),
                          })
                        }
                        className="h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">CTA</Label>
                      <Input
                        value={activeVariant.cta}
                        onChange={(e) =>
                          patchVariant(activeVariant.platform, {
                            cta: e.target.value,
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    {!!activeVariant.tips?.length && (
                      <ul className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 space-y-1">
                        {activeVariant.tips.map((t) => (
                          <li key={t} className="text-[11px] text-slate-600">
                            → {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {previewStructured && (
                  <Card className="bg-gradient-to-b from-slate-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Preview · {activeVariant.label}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Như đã đăng trên feed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[520px] overflow-y-auto">
                      <PlatformPreview content={previewStructured} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend of supported platforms */}
      <div className="flex flex-wrap gap-2 pt-1">
        {SOCIAL_SHARE_PLATFORMS.map((p) => (
          <span
            key={p.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-600"
          >
            <PlatformIcon
              platform={p.key === "linkedin" ? "blog" : p.key}
              size="sm"
            />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

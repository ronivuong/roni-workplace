"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  ListTree,
  FileText,
  Search,
  Save,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformPreview } from "@/components/content/platform-preview";
import {
  emptySeoMeta,
  scoreArticleSeo,
  slugifyVi,
  INTENT_LABELS,
  WORD_TARGETS,
  type SeoIntent,
  type SeoMeta,
} from "@/lib/seo";
import type { StructuredContent } from "@/lib/content-formats";
import { cn } from "@/lib/utils";

type Props = {
  structured: StructuredContent;
  onChange: (next: StructuredContent) => void;
  onSave?: () => Promise<void> | void;
  saving?: boolean;
  contentId?: string | null;
  onContentCreated?: (id: string) => void;
};

const INTENTS = Object.entries(INTENT_LABELS) as [SeoIntent, string][];

export function ArticleSeoWorkspace({
  structured,
  onChange,
  onSave,
  saving,
  contentId,
  onContentCreated,
}: Props) {
  const seo: SeoMeta = structured.seo || emptySeoMeta();
  const [generating, setGenerating] = useState<string | null>(null);
  const [secondaryInput, setSecondaryInput] = useState(
    (seo.secondaryKeywords || []).join(", ")
  );

  const score = useMemo(
    () =>
      scoreArticleSeo({
        title: structured.title,
        body: structured.body,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        slug: seo.slug,
        primaryKeyword: seo.primaryKeyword,
        secondaryKeywords: seo.secondaryKeywords,
        wordCountTarget: seo.wordCountTarget,
      }),
    [structured.title, structured.body, seo]
  );

  const patchSeo = (partial: Partial<SeoMeta>) => {
    const nextSeo = { ...seo, ...partial };
    onChange({
      ...structured,
      mode: "article",
      type: "article",
      platform:
        nextSeo.platform === "linkedin" ? "blog" : nextSeo.platform || "wordpress",
      seo: nextSeo,
      cta: nextSeo.cta || structured.cta,
    });
  };

  const patchBody = (body: string) => {
    onChange({ ...structured, body, mode: "article", type: "article" });
  };

  const insertMarkdown = (snippet: string) => {
    const body = structured.body || "";
    const sep = body && !body.endsWith("\n") ? "\n\n" : body ? "\n" : "";
    patchBody(body + sep + snippet);
  };

  const runGenerate = async (mode: "outline" | "draft" | "meta" | "full") => {
    if (!seo.primaryKeyword.trim() && !structured.title.trim()) {
      toast.error("Nhập từ khóa chính hoặc chủ đề");
      return;
    }
    setGenerating(mode);
    try {
      const res = await fetch("/api/content/article/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          topic: seo.primaryKeyword || structured.title,
          primaryKeyword: seo.primaryKeyword || structured.title,
          secondaryKeywords: secondaryInput
            .split(/[,;]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          intent: seo.intent,
          audience: seo.audience,
          tone: seo.tone,
          wordCountTarget: seo.wordCountTarget,
          mustInclude: seo.mustInclude,
          brandRules: seo.brandRules,
          competitorUrl: seo.competitorUrl,
          cta: seo.cta,
          platform: seo.platform,
          save: mode === "full" || mode === "draft" || mode === "outline",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi AI");
      if (d.structured) {
        onChange({
          ...d.structured,
          mode: "article",
        });
        setSecondaryInput(
          (d.structured.seo?.secondaryKeywords || []).join(", ")
        );
      }
      if (d.content?.id) onContentCreated?.(d.content.id);
      toast.success(d.message || "Đã tạo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setGenerating(null);
    }
  };

  const gradeColor =
    score.grade === "A"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : score.grade === "B"
        ? "text-sky-600 bg-sky-50 border-sky-200"
        : score.grade === "C"
          ? "text-amber-600 bg-amber-50 border-amber-200"
          : "text-red-600 bg-red-50 border-red-200";

  const serpTitle = seo.metaTitle || structured.title || "Meta title sẽ hiện ở đây";
  const serpUrl = `https://example.com/${seo.slug || slugifyVi(structured.title || "bai-viet")}`;
  const serpDesc =
    seo.metaDescription ||
    "Meta description 140–160 ký tự sẽ hiển thị dưới kết quả tìm kiếm Google…";

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {/* LEFT: SEO Brief */}
      <div className="xl:col-span-3 space-y-3">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Search className="h-4 w-4 text-emerald-600" />
              SEO Brief
            </CardTitle>
            <CardDescription className="text-[11px]">
              Form nhập liệu để AI viết chuẩn SEO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid gap-1">
              <Label className="text-[11px]">Từ khóa chính *</Label>
              <Input
                value={seo.primaryKeyword}
                onChange={(e) => patchSeo({ primaryKeyword: e.target.value })}
                placeholder="ví dụ: content marketing 2026"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Từ khóa phụ (phẩy)</Label>
              <Input
                value={secondaryInput}
                onChange={(e) => {
                  setSecondaryInput(e.target.value);
                  patchSeo({
                    secondaryKeywords: e.target.value
                      .split(/[,;]+/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
                placeholder="seo content, viết blog"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Intent</Label>
              <Select
                value={seo.intent}
                onValueChange={(v) => patchSeo({ intent: v as SeoIntent })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENTS.map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Nền tảng đích</Label>
              <Select
                value={seo.platform}
                onValueChange={(v) =>
                  patchSeo({
                    platform: v as SeoMeta["platform"],
                  })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                  <SelectItem value="blog">Blog / Website</SelectItem>
                  <SelectItem value="linkedin">LinkedIn long-form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Độ dài mục tiêu</Label>
              <Select
                value={String(seo.wordCountTarget)}
                onValueChange={(v) =>
                  patchSeo({ wordCountTarget: Number(v) })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORD_TARGETS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      ~{w} từ
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Audience</Label>
              <Input
                value={seo.audience}
                onChange={(e) => patchSeo({ audience: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Tone</Label>
              <Input
                value={seo.tone}
                onChange={(e) => patchSeo({ tone: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Điểm phải có</Label>
              <Textarea
                rows={2}
                value={seo.mustInclude}
                onChange={(e) => patchSeo({ mustInclude: e.target.value })}
                className="text-sm resize-none"
                placeholder="Số liệu, case study, checklist…"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Brand rules / cấm</Label>
              <Textarea
                rows={2}
                value={seo.brandRules}
                onChange={(e) => patchSeo({ brandRules: e.target.value })}
                className="text-sm resize-none"
                placeholder="Không overclaim, xưng «bạn»…"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">URL đối thủ (optional)</Label>
              <Input
                value={seo.competitorUrl || ""}
                onChange={(e) => patchSeo({ competitorUrl: e.target.value })}
                className="h-9 text-sm"
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">CTA</Label>
              <Input
                value={seo.cta}
                onChange={(e) => patchSeo({ cta: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid gap-1.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={!!generating}
                onClick={() => runGenerate("outline")}
              >
                {generating === "outline" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListTree className="h-3.5 w-3.5" />
                )}
                Tạo outline
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!!generating}
                onClick={() => runGenerate("meta")}
              >
                {generating === "meta" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Chỉ meta SEO
              </Button>
              <Button
                size="sm"
                disabled={!!generating}
                onClick={() => runGenerate("full")}
              >
                {generating === "full" || generating === "draft" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Viết full draft SEO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CENTER: Editor */}
      <div className="xl:col-span-5 space-y-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <PenLine className="h-4 w-4 text-emerald-600" />
                Soạn thảo bài viết
              </CardTitle>
              <CardDescription className="text-[11px]">
                Markdown · {score.wordCount} từ · ~{score.readingMinutes} phút đọc
                {contentId ? ` · ID …${contentId.slice(-6)}` : ""}
              </CardDescription>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-center",
                gradeColor
              )}
            >
              <span className="text-lg font-bold leading-none">{score.score}</span>
              <span className="text-[9px] font-semibold">{score.grade}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1">
              <Label className="text-[11px]">H1 / Tiêu đề</Label>
              <Input
                value={structured.title}
                onChange={(e) =>
                  onChange({
                    ...structured,
                    title: e.target.value,
                    mode: "article",
                    type: "article",
                  })
                }
                className="font-semibold"
                placeholder="Tiêu đề bài viết (H1)"
              />
            </div>

            {!!seo.titleOptions?.length && (
              <div className="flex flex-wrap gap-1">
                {seo.titleOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...structured,
                        title: t,
                        mode: "article",
                        seo: {
                          ...seo,
                          slug: slugifyVi(t),
                          metaTitle: t.slice(0, 60),
                        },
                      })
                    }
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    {t.length > 48 ? t.slice(0, 46) + "…" : t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
              {[
                { l: "H2", s: "\n## Tiêu đề mục\n\n" },
                { l: "H3", s: "\n### Tiêu đề con\n\n" },
                { l: "List", s: "\n- Ý 1\n- Ý 2\n- Ý 3\n" },
                { l: "Quote", s: "\n> Trích dẫn / highlight\n\n" },
                { l: "FAQ", s: "\n## FAQ\n\n### Câu hỏi?\n\nTrả lời ngắn.\n\n" },
                {
                  l: "CTA",
                  s: `\n## Bước tiếp theo\n\n**${seo.cta || "CTA của bạn"}**\n\n`,
                },
              ].map((b) => (
                <Button
                  key={b.l}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => insertMarkdown(b.s)}
                >
                  {b.l}
                </Button>
              ))}
            </div>

            <Textarea
              value={structured.body}
              onChange={(e) => patchBody(e.target.value)}
              rows={18}
              className="font-mono text-sm resize-y min-h-[320px]"
              placeholder="# Tiêu đề&#10;&#10;Đoạn mở bài…&#10;&#10;## Mục 1&#10;…"
            />

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-1 sm:col-span-1">
                <Label className="text-[11px]">Slug</Label>
                <Input
                  value={seo.slug}
                  onChange={(e) =>
                    patchSeo({ slug: slugifyVi(e.target.value) || e.target.value })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label className="text-[11px]">
                  Meta title ({(seo.metaTitle || "").length} ký tự)
                </Label>
                <Input
                  value={seo.metaTitle}
                  onChange={(e) => patchSeo({ metaTitle: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">
                Meta description ({(seo.metaDescription || "").length} ký tự)
              </Label>
              <Textarea
                rows={2}
                value={seo.metaDescription}
                onChange={(e) => patchSeo({ metaDescription: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {onSave && (
              <Button onClick={() => onSave()} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu bài viết
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: SERP + SEO score + Outline + Preview */}
      <div className="xl:col-span-4 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Google SERP preview</CardTitle>
            <CardDescription className="text-[11px]">
              Mô phỏng kết quả tìm kiếm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-emerald-800 truncate">{serpUrl}</p>
              <p className="text-base text-[#1a0dab] hover:underline cursor-default leading-snug mt-0.5 line-clamp-2">
                {serpTitle}
              </p>
              <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                {serpDesc}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SEO checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {score.checks.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs",
                  c.ok
                    ? "border-emerald-100 bg-emerald-50/50 text-slate-700"
                    : "border-amber-100 bg-amber-50/40 text-slate-700"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full",
                    c.ok ? "bg-emerald-500" : "bg-amber-400"
                  )}
                />
                <div className="min-w-0">
                  <p className="font-medium">{c.label}</p>
                  {c.hint && (
                    <p className="text-[10px] text-slate-500">{c.hint}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {!!seo.outline?.length && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ListTree className="h-4 w-4" />
                Outline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {seo.outline.map((o, i) => (
                <div key={i} className="text-xs">
                  <p className="font-semibold text-slate-800">
                    {i + 1}. {o.heading}
                  </p>
                  {o.bullets?.length ? (
                    <ul className="mt-0.5 list-disc pl-4 text-slate-500">
                      {o.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Preview xuất bản
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            <PlatformPreview
              content={{
                ...structured,
                platform:
                  seo.platform === "linkedin" ? "blog" : seo.platform || "wordpress",
                type: "article",
                mode: "article",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

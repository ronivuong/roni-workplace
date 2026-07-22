"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { StructuredContent } from "@/lib/content-formats";
import { cn } from "@/lib/utils";

type Props = {
  value: StructuredContent;
  onChange: (next: StructuredContent) => void;
  className?: string;
  compact?: boolean;
};

export function ContentEditor({ value, onChange, className, compact }: Props) {
  const set = <K extends keyof StructuredContent>(key: K, v: StructuredContent[K]) => {
    onChange({ ...value, [key]: v });
  };

  const hashtagsStr = (value.hashtags || []).join(" ");

  const updateBeat = (
    index: number,
    field: "label" | "text" | "seconds",
    text: string
  ) => {
    const beats = [...(value.beats || [])];
    beats[index] = { ...beats[index], [field]: text };
    set("beats", beats);
  };

  const addBeat = () => {
    set("beats", [
      ...(value.beats || []),
      { label: "Beat mới", text: "", seconds: "" },
    ]);
  };

  const removeBeat = (index: number) => {
    set(
      "beats",
      (value.beats || []).filter((_, i) => i !== index)
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-1.5">
        <Label className="text-xs">Tiêu đề</Label>
        <Input
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Tiêu đề bài / video"
          className="font-medium"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Hook (mở đầu)</Label>
        <Textarea
          rows={compact ? 2 : 2}
          value={value.hook || ""}
          onChange={(e) => set("hook", e.target.value)}
          placeholder="Câu mở thu hút 3 giây đầu…"
          className="resize-none text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Caption / mô tả ngắn</Label>
        <Textarea
          rows={compact ? 3 : 4}
          value={value.caption || ""}
          onChange={(e) => set("caption", e.target.value)}
          placeholder="Caption đăng social…"
          className="resize-none text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Nội dung chính</Label>
        <Textarea
          rows={compact ? 5 : 8}
          value={value.body || ""}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Thân bài, script, checklist…"
          className="resize-none text-sm font-mono"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Hashtags</Label>
          <Input
            value={hashtagsStr}
            onChange={(e) =>
              set(
                "hashtags",
                e.target.value
                  .split(/[\s,]+/)
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (t.startsWith("#") ? t : `#${t}`))
              )
            }
            placeholder="#fyp #viral #content"
            className="text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">CTA</Label>
          <Input
            value={value.cta || ""}
            onChange={(e) => set("cta", e.target.value)}
            placeholder="Comment 'GUIDE' / Follow / Đăng ký…"
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Emoji cover</Label>
          <Input
            value={value.coverEmoji || ""}
            onChange={(e) => set("coverEmoji", e.target.value)}
            placeholder="🎬"
            maxLength={4}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Handle</Label>
          <Input
            value={value.authorHandle || ""}
            onChange={(e) => set("authorHandle", e.target.value)}
            placeholder="@roni.creator"
          />
        </div>
      </div>

      {/* Script beats for video platforms */}
      {["tiktok", "youtube", "instagram"].includes(
        (value.platform || "").toLowerCase()
      ) && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Script beats / timeline</Label>
            <Button type="button" size="sm" variant="outline" onClick={addBeat}>
              <Plus className="h-3.5 w-3.5" />
              Thêm beat
            </Button>
          </div>
          {(value.beats || []).length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Chưa có beat — thêm để preview script rõ hơn.
            </p>
          ) : (
            (value.beats || []).map((b, i) => (
              <div
                key={i}
                className="grid gap-1.5 rounded-lg bg-slate-50 p-2 sm:grid-cols-[88px_1fr_auto]"
              >
                <Input
                  value={b.seconds || ""}
                  onChange={(e) => updateBeat(i, "seconds", e.target.value)}
                  placeholder="0-3s"
                  className="h-8 text-xs"
                />
                <div className="space-y-1">
                  <Input
                    value={b.label}
                    onChange={(e) => updateBeat(i, "label", e.target.value)}
                    placeholder="Hook"
                    className="h-8 text-xs font-medium"
                  />
                  <Input
                    value={b.text}
                    onChange={(e) => updateBeat(i, "text", e.target.value)}
                    placeholder="Nội dung beat…"
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeBeat(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

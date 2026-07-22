"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Clapperboard,
  Film,
  Plus,
  Loader2,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Play,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { DistributePanel } from "@/components/content/distribute-panel";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import {
  VIDEO_PRESETS,
  getPreset,
  aspectFromSize,
  validateVideoAgainstPreset,
  formatDuration,
  formatBytes,
  type VideoPreset,
} from "@/lib/video-presets";
import { formatDate, cn } from "@/lib/utils";

// Progress is optional — fallback if component missing
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

type Content = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  status: string;
  platform: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaDuration?: number | null;
  mediaSize?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  aspectRatio?: string | null;
  publishedUrl?: string | null;
  updatedAt: string;
  author: { name: string };
  publishes?: { platform: string; status: string; publishedUrl: string | null }[];
};

type LocalMeta = {
  duration: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string;
  size: number;
  mime: string;
  name: string;
};

async function readVideoMeta(file: File): Promise<LocalMeta> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const meta = await new Promise<{
      duration: number;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.onerror = () => reject(new Error("Không đọc được metadata video"));
      video.src = objectUrl;
    });
    return {
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: aspectFromSize(meta.width, meta.height),
      size: file.size,
      mime: file.type || "video/mp4",
      name: file.name,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function VideoStudioPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState("library");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);

  const [presetId, setPresetId] = useState("tiktok");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localMeta, setLocalMeta] = useState<LocalMeta | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#fyp #viral");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const preset = getPreset(presetId);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["video-contents"],
    queryFn: async () => {
      const res = await fetch("/api/content?type=video");
      // API may ignore type filter for type= — fallback client filter
      const resAll = res.ok ? res : await fetch("/api/content");
      const d = await resAll.json();
      const list = (d.contents as Content[]).filter((c) =>
        ["video", "script"].includes(c.type)
      );
      return { contents: list };
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

  const platformOptions = (platformData?.platforms || []).map(
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

  const videos = data?.contents || [];
  const validation = localMeta
    ? validateVideoAgainstPreset(preset, {
        duration: localMeta.duration,
        sizeBytes: localMeta.size,
        mime: localMeta.mime,
        width: localMeta.width,
        height: localMeta.height,
      })
    : null;

  const resetUpload = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setLocalMeta(null);
    setUploadedUrl(null);
    setProgress(0);
    setTitle("");
    setCaption("");
    setActiveId(null);
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        toast.error("Chỉ nhận file video");
        return;
      }
      resetUpload();
      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);
      setUploading(true);
      setProgress(5);

      try {
        const meta = await readVideoMeta(file);
        setLocalMeta(meta);
        setTitle(file.name.replace(/\.[^.]+$/, ""));
        setProgress(15);

        const check = validateVideoAgainstPreset(getPreset(presetId), {
          duration: meta.duration,
          sizeBytes: meta.size,
          mime: meta.mime,
          width: meta.width,
          height: meta.height,
        });
        check.warnings.forEach((w) => toast.message("Cảnh báo preset", { description: w }));
        if (!check.ok) {
          check.errors.forEach((e) => toast.error(e));
        }

        let url: string | null = null;

        // Prefer Blob client upload for large files
        if (file.size > 4 * 1024 * 1024) {
          try {
            setProgress(25);
            const blob = await upload(`videos/${Date.now()}-${file.name}`, file, {
              access: "public",
              handleUploadUrl: "/api/upload/video",
              multipart: file.size > 20 * 1024 * 1024,
              onUploadProgress: (p) => {
                setProgress(25 + Math.round((p.percentage || 0) * 0.65));
              },
            });
            url = blob.url;
          } catch (err) {
            console.warn("Blob client upload failed, try multipart", err);
          }
        }

        if (!url) {
          setProgress(40);
          const form = new FormData();
          form.append("file", file);
          form.append("duration", String(meta.duration ?? ""));
          form.append("width", String(meta.width ?? ""));
          form.append("height", String(meta.height ?? ""));
          form.append("aspectRatio", meta.aspectRatio);
          const res = await fetch("/api/upload/video", {
            method: "POST",
            body: form,
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "Upload thất bại");
          url = d.url;
        }

        setUploadedUrl(url);
        setProgress(100);
        toast.success("Upload video thành công");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload lỗi");
        resetUpload();
      } finally {
        setUploading(false);
      }
    },
    [presetId]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const createVideoContent = async () => {
    if (!uploadedUrl || !localMeta) {
      toast.error("Upload video trước");
      return;
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề");
      return;
    }
    setCreating(true);
    try {
      const tags = hashtags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const res = await fetch("/api/content/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: uploadedUrl,
          title,
          caption: `${caption}\n\n${tags.join(" ")}`.trim(),
          hashtags: tags,
          platform: preset.platform,
          presetId: preset.id,
          mediaMime: localMeta.mime,
          mediaSize: localMeta.size,
          mediaDuration: localMeta.duration,
          mediaWidth: localMeta.width,
          mediaHeight: localMeta.height,
          aspectRatio: localMeta.aspectRatio || preset.aspect,
          fileName: localMeta.name,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Tạo content thất bại");
      setActiveId(d.content.id);
      toast.success("Đã lưu vào Video Library — chọn kênh để đăng/lên lịch");
      qc.invalidateQueries({ queryKey: ["video-contents"] });
      qc.invalidateQueries({ queryKey: ["contents"] });
      setTab("library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setCreating(false);
    }
  };

  const generateScript = async () => {
    if (!topic.trim()) {
      toast.error("Nhập ý tưởng video");
      return;
    }
    setScriptLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          type: "script",
          platform: preset.platform || "tiktok",
          tone: "năng động, hook mạnh trong 3 giây đầu",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      toast.success(d.message || "Đã tạo script");
      setScriptOpen(false);
      setTopic("");
      qc.invalidateQueries({ queryKey: ["video-contents"] });
      setTab("library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setScriptLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa video/script này?")) return;
    const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Không xóa được");
      return;
    }
    toast.success("Đã xóa");
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["video-contents"] });
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
    toast.success("Sẵn sàng đăng");
    qc.invalidateQueries({ queryKey: ["video-contents"] });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Video Studio"
        description="Upload video local · preset chuẩn từng nền tảng · script AI · đăng / lên lịch đa kênh."
        actions={
          <div className="flex w-full sm:w-auto flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setScriptOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Script AI
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTab("upload");
                inputRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setTab("upload");
            handleFile(f);
          }
          e.target.value = "";
        }}
      />

      {/* Pipeline steps */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {[
          { n: "1", t: "Upload", d: "Máy tính / điện thoại" },
          { n: "2", t: "Preset", d: "Tỷ lệ & limit kênh" },
          { n: "3", t: "Metadata", d: "Title · caption · tag" },
          { n: "4", t: "Đăng / lịch", d: "Multi-platform" },
        ].map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
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
          <TabsTrigger value="library">Thư viện</TabsTrigger>
          <TabsTrigger value="upload">Upload & tối ưu</TabsTrigger>
          <TabsTrigger value="presets">Preset nền tảng</TabsTrigger>
        </TabsList>

        {/* —— UPLOAD —— */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7 space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "rounded-2xl border-2 border-dashed p-5 sm:p-8 text-center transition-colors",
                  dragging
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 bg-white hover:border-violet-300"
                )}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  Kéo thả video vào đây
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  MP4 · MOV · WebM · hỗ trợ chọn từ điện thoại (capture)
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                  >
                    Chọn file
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                  >
                    Từ điện thoại / máy ảnh
                  </Button>
                </div>
                {uploading && (
                  <div className="mx-auto mt-4 max-w-sm space-y-1.5">
                    <ProgressBar value={progress} />
                    <p className="text-[11px] text-slate-500">
                      Đang upload… {progress}%
                    </p>
                  </div>
                )}
              </div>

              {/* Preview player */}
              {(localPreview || uploadedUrl) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Preview video
                    </CardTitle>
                    <CardDescription>
                      {localMeta?.name} · {formatBytes(localMeta?.size)} ·{" "}
                      {formatDuration(localMeta?.duration)} ·{" "}
                      {localMeta?.width}×{localMeta?.height} ({localMeta?.aspectRatio})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        "mx-auto overflow-hidden rounded-xl bg-black",
                        preset.aspect === "9:16"
                          ? "max-w-[280px] aspect-[9/16]"
                          : preset.aspect === "1:1"
                            ? "max-w-md aspect-square"
                            : preset.aspect === "4:5"
                              ? "max-w-sm aspect-[4/5]"
                              : "w-full aspect-video"
                      )}
                    >
                      <video
                        src={localPreview || uploadedUrl || undefined}
                        controls
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata form */}
              {uploadedUrl && localMeta && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Metadata & caption</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label>Tiêu đề</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Caption / mô tả</Label>
                      <Textarea
                        rows={4}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Hook + value + CTA…"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Hashtags</Label>
                      <Input
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="#fyp #viral"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={createVideoContent} disabled={creating}>
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Lưu vào thư viện
                      </Button>
                      <Button variant="outline" onClick={resetUpload}>
                        Upload file khác
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: presets + validation + distribute */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[calc(var(--header-h)+0.75rem)] lg:self-start">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Preset nền tảng</CardTitle>
                  <CardDescription>
                    Chuẩn xuất bản giống TikTok Studio / Meta / YouTube
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto overscroll-contain">
                  {VIDEO_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresetId(p.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-all",
                        presetId === p.id
                          ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <PlatformIcon platform={p.platform} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900">
                          {p.label}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {p.aspect} · {p.resolution} · max {p.maxDurationSec}s ·{" "}
                          {p.maxFileMb}MB
                        </p>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {validation && (
                <Card
                  className={
                    validation.ok
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  }
                >
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {validation.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      Kiểm tra vs {preset.label}
                    </p>
                    {validation.errors.map((e) => (
                      <p key={e} className="text-xs text-red-600">
                        • {e}
                      </p>
                    ))}
                    {validation.warnings.map((w) => (
                      <p key={w} className="text-xs text-amber-700">
                        • {w}
                      </p>
                    ))}
                    {validation.ok && !validation.warnings.length && (
                      <p className="text-xs text-emerald-700">
                        File phù hợp gợi ý kỹ thuật của kênh.
                      </p>
                    )}
                    <ul className="mt-2 space-y-1 border-t border-black/5 pt-2">
                      {preset.tips.map((t) => (
                        <li key={t} className="text-[11px] text-slate-600">
                          → {t}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {activeId && (
                <div>
                  <p className="text-sm font-semibold mb-2">Đăng / lên lịch video</p>
                  <DistributePanel
                    contentId={activeId}
                    platforms={
                      platformOptions.length
                        ? platformOptions
                        : VIDEO_PRESETS.filter(
                            (p, i, arr) =>
                              arr.findIndex((x) => x.platform === p.platform) === i
                          ).map((p) => ({
                            key: p.platform,
                            name: p.label,
                            isConnected: false,
                            accountName: null,
                          }))
                    }
                    onDone={() => {
                      qc.invalidateQueries({ queryKey: ["video-contents"] });
                      qc.invalidateQueries({ queryKey: ["content-calendar"] });
                      qc.invalidateQueries({ queryKey: ["contents-publish"] });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* —— LIBRARY —— */}
        <TabsContent value="library" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-2">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : videos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-16 text-slate-400">
                    <Film className="h-10 w-10 mb-2" />
                    <p className="text-sm">Chưa có video/script</p>
                    <Button className="mt-3" onClick={() => setTab("upload")}>
                      <Upload className="h-4 w-4" />
                      Upload video đầu tiên
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                videos.map((v) => (
                  <Card
                    key={v.id}
                    className={cn(
                      "overflow-hidden transition-colors",
                      activeId === v.id && "border-violet-300 ring-2 ring-violet-200"
                    )}
                  >
                    <CardContent className="p-0 sm:flex">
                      <div className="relative sm:w-44 shrink-0 bg-slate-900 aspect-video sm:aspect-auto sm:min-h-[120px]">
                        {v.mediaUrl ? (
                          <video
                            src={v.mediaUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div className="flex h-full min-h-[120px] items-center justify-center text-white/50">
                            <Clapperboard className="h-8 w-8" />
                          </div>
                        )}
                        {v.mediaDuration != null && (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
                            {formatDuration(v.mediaDuration)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-3 gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {v.platform && (
                              <PlatformIcon platform={v.platform} size="sm" />
                            )}
                            <p className="text-sm font-semibold text-slate-900">
                              {v.title}
                            </p>
                            <Badge variant="secondary">
                              {CONTENT_STATUS_LABELS[v.status] || v.status}
                            </Badge>
                            <Badge variant="outline">{v.type}</Badge>
                            {v.aspectRatio && (
                              <Badge variant="outline">{v.aspectRatio}</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {v.author.name} · {formatDate(v.updatedAt)}
                            {v.mediaSize ? ` · ${formatBytes(v.mediaSize)}` : ""}
                          </p>
                          {v.publishes && v.publishes.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {v.publishes.map((p) => (
                                <Badge
                                  key={p.platform + p.status}
                                  variant="outline"
                                  className="gap-1 text-[10px]"
                                >
                                  <PlatformIcon
                                    platform={p.platform}
                                    size="sm"
                                    className="!h-4 !w-4 !rounded"
                                  />
                                  {p.status}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveId(v.id)}
                          >
                            Chọn để đăng
                          </Button>
                          {v.mediaUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={v.mediaUrl} target="_blank" rel="noreferrer">
                                Xem file
                              </a>
                            </Button>
                          )}
                          {v.status !== "APPROVED" && v.status !== "PUBLISHED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markReady(v.id)}
                            >
                              Mark ready
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => remove(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div className="lg:col-span-5">
              {activeId ? (
                <DistributePanel
                  contentId={activeId}
                  platforms={platformOptions}
                  onDone={() => {
                    qc.invalidateQueries({ queryKey: ["video-contents"] });
                    qc.invalidateQueries({ queryKey: ["content-calendar"] });
                  }}
                />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-slate-500">
                    Chọn một video trong thư viện để đăng / lên lịch đa nền tảng.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* —— PRESETS GUIDE —— */}
        <TabsContent value="presets" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VIDEO_PRESETS.map((p: VideoPreset) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={p.platform} size="md" />
                    <div>
                      <CardTitle className="text-base">{p.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {p.aspect} · {p.resolution}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600">
                  <p>
                    <strong>Thời lượng gợi ý:</strong> {p.recommendedDuration}
                  </p>
                  <p>
                    <strong>Max:</strong> {p.maxDurationSec}s · {p.maxFileMb}MB
                  </p>
                  <p>
                    <strong>Format:</strong> MP4 / MOV (H.264)
                  </p>
                  <ul className="space-y-1 border-t border-slate-100 pt-2">
                    {p.tips.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className="w-full mt-1"
                    variant="outline"
                    onClick={() => {
                      setPresetId(p.id);
                      setTab("upload");
                    }}
                  >
                    Dùng preset này
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Script AI dialog */}
      <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Tạo script video AI
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
            <p className="text-[11px] text-slate-500">
              Script sẽ theo preset hiện tại: <strong>{preset.label}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScriptOpen(false)}>
              Hủy
            </Button>
            <Button onClick={generateScript} disabled={scriptLoading}>
              {scriptLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Tạo script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

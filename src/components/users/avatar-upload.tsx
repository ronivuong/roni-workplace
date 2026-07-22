"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";

export function AvatarUpload({
  userId,
  name,
  image,
  onUploaded,
  size = "lg",
}: {
  userId: string;
  name: string;
  image?: string | null;
  onUploaded?: (url: string) => void;
  size?: "md" | "lg";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(image || null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Chỉ chấp nhận file ảnh");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ảnh tối đa 2MB");
        return;
      }

      // Local preview + simple crop-to-square via canvas
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await new Promise((r) => {
        img.onload = r;
      });

      const canvas = document.createElement("canvas");
      const sizePx = 400;
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, sizePx, sizePx);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      URL.revokeObjectURL(objectUrl);
      if (!blob) {
        toast.error("Không thể xử lý ảnh");
        return;
      }

      const croppedPreview = URL.createObjectURL(blob);
      setPreview(croppedPreview);

      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        form.append("userId", userId);
        const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload thất bại");
        setPreview(data.url);
        onUploaded?.(data.url);
        toast.success("Cập nhật avatar thành công");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload thất bại");
      } finally {
        setUploading(false);
      }
    },
    [userId, onUploaded]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const dim = size === "lg" ? "h-28 w-28" : "h-16 w-16";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "relative group rounded-full",
          dragging && "ring-2 ring-emerald-400 ring-offset-2"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Avatar className={cn(dim, "border-4 border-white shadow-md")}>
          <AvatarImage src={preview || undefined} />
          <AvatarFallback className="text-xl">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Đang tải..." : "Tải ảnh lên"}
      </Button>
      <p className="text-center text-[11px] text-slate-400 max-w-[200px]">
        Kéo thả hoặc chọn ảnh. Tự crop vuông, tối đa 2MB.
      </p>
    </div>
  );
}

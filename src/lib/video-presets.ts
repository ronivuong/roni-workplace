/**
 * Platform video specs inspired by modern social video tools
 * (Later, Buffer, Hopp, Meta Business Suite, TikTok Studio, YouTube Studio).
 */

export type VideoPreset = {
  id: string;
  platform: string;
  label: string;
  aspect: "9:16" | "16:9" | "1:1" | "4:5";
  maxDurationSec: number;
  recommendedDuration: string;
  maxFileMb: number;
  formats: string[];
  resolution: string;
  tips: string[];
  color: string;
};

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: "tiktok",
    platform: "tiktok",
    label: "TikTok / Reels dọc",
    aspect: "9:16",
    maxDurationSec: 180,
    recommendedDuration: "15–60s (hook 3s)",
    maxFileMb: 287,
    formats: ["video/mp4", "video/quicktime", "video/webm"],
    resolution: "1080×1920",
    tips: [
      "Hook trong 1–3 giây đầu, text on-screen lớn",
      "Caption + 3–5 hashtag, CTA comment/follow",
      "Tránh watermark nền tảng khác",
    ],
    color: "#000000",
  },
  {
    id: "instagram_reels",
    platform: "instagram",
    label: "Instagram Reels",
    aspect: "9:16",
    maxDurationSec: 90,
    recommendedDuration: "15–30s",
    maxFileMb: 100,
    formats: ["video/mp4", "video/quicktime"],
    resolution: "1080×1920",
    tips: [
      "Cover frame rõ, 9:16 full-bleed",
      "Ưu tiên saves & shares hơn like",
      "Caption dài OK, hashtag 5–10",
    ],
    color: "#E4405F",
  },
  {
    id: "instagram_feed",
    platform: "instagram",
    label: "Instagram Feed",
    aspect: "4:5",
    maxDurationSec: 60,
    recommendedDuration: "15–30s",
    maxFileMb: 100,
    formats: ["video/mp4", "video/quicktime"],
    resolution: "1080×1350",
    tips: ["Tỷ lệ 4:5 chiếm feed mobile tốt nhất", "Thumbnail = frame 0–1s"],
    color: "#E4405F",
  },
  {
    id: "youtube_shorts",
    platform: "youtube",
    label: "YouTube Shorts",
    aspect: "9:16",
    maxDurationSec: 60,
    recommendedDuration: "30–60s",
    maxFileMb: 256,
    formats: ["video/mp4", "video/quicktime", "video/webm"],
    resolution: "1080×1920",
    tips: [
      "Title SEO ngắn, không #Shorts spam",
      "End screen / subscribe verbal CTA",
    ],
    color: "#FF0000",
  },
  {
    id: "youtube_long",
    platform: "youtube",
    label: "YouTube dài",
    aspect: "16:9",
    maxDurationSec: 3600,
    recommendedDuration: "8–15 phút",
    maxFileMb: 512,
    formats: ["video/mp4", "video/quicktime"],
    resolution: "1920×1080",
    tips: [
      "Thumbnail 1280×720, title 50–70 ký tự",
      "Chapters timestamps trong description",
    ],
    color: "#FF0000",
  },
  {
    id: "facebook_reels",
    platform: "facebook",
    label: "Facebook Reels / video",
    aspect: "9:16",
    maxDurationSec: 90,
    recommendedDuration: "15–45s",
    maxFileMb: 200,
    formats: ["video/mp4", "video/quicktime"],
    resolution: "1080×1920",
    tips: ["Native upload (không share link ngoài)", "Caption hỏi đáp tăng comment"],
    color: "#1877F2",
  },
  {
    id: "square",
    platform: "social",
    label: "Vuông 1:1 (multi)",
    aspect: "1:1",
    maxDurationSec: 60,
    recommendedDuration: "15–30s",
    maxFileMb: 100,
    formats: ["video/mp4", "video/webm", "video/quicktime"],
    resolution: "1080×1080",
    tips: ["An toàn cho feed đa nền tảng", "Crop center khi export"],
    color: "#10B981",
  },
];

export function getPreset(id: string) {
  return VIDEO_PRESETS.find((p) => p.id === id) || VIDEO_PRESETS[0];
}

export function aspectFromSize(w?: number | null, h?: number | null): string {
  if (!w || !h) return "9:16";
  const r = w / h;
  if (Math.abs(r - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(r - 16 / 9) < 0.08) return "16:9";
  if (Math.abs(r - 1) < 0.08) return "1:1";
  if (Math.abs(r - 4 / 5) < 0.08) return "4:5";
  return r < 1 ? "9:16" : "16:9";
}

export function validateVideoAgainstPreset(
  preset: VideoPreset,
  meta: {
    duration?: number | null;
    sizeBytes?: number | null;
    mime?: string | null;
    width?: number | null;
    height?: number | null;
  }
) {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (meta.mime && !preset.formats.includes(meta.mime) && !meta.mime.startsWith("video/")) {
    errors.push(`Định dạng ${meta.mime} không được ${preset.label} hỗ trợ tốt.`);
  }
  if (meta.sizeBytes && meta.sizeBytes > preset.maxFileMb * 1024 * 1024) {
    errors.push(
      `File ${(meta.sizeBytes / 1024 / 1024).toFixed(1)}MB vượt gợi ý ${preset.maxFileMb}MB cho ${preset.label}.`
    );
  }
  if (meta.duration && meta.duration > preset.maxDurationSec) {
    warnings.push(
      `Độ dài ${Math.round(meta.duration)}s dài hơn limit gợi ý ${preset.maxDurationSec}s — có thể bị cắt khi đăng.`
    );
  }
  if (meta.width && meta.height) {
    const ar = aspectFromSize(meta.width, meta.height);
    if (ar !== preset.aspect) {
      warnings.push(
        `Tỷ lệ hiện tại ~${ar}, preset ${preset.label} khuyến nghị ${preset.aspect}.`
      );
    }
  }
  if (meta.duration && meta.duration < 3) {
    warnings.push("Video quá ngắn (<3s) — khó giữ thuật toán phân phối.");
  }

  return { warnings, errors, ok: errors.length === 0 };
}

export function formatDuration(sec?: number | null) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `0:${String(r).padStart(2, "0")}`;
}

export function formatBytes(n?: number | null) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

"use client";

import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Music2,
  ThumbsUp,
  Play,
  Bell,
  Home,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type StructuredContent,
  platformLabel,
  parseContentBody,
} from "@/lib/content-formats";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type PreviewProps = {
  content: StructuredContent;
  className?: string;
};

function PhoneShell({
  children,
  className,
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[320px] rounded-[2rem] border-[10px] border-slate-900 shadow-2xl overflow-hidden",
        dark ? "bg-black" : "bg-white",
        className
      )}
    >
      {/* notch */}
      <div className="relative flex justify-center bg-slate-900 pt-2 pb-1">
        <div className="h-5 w-24 rounded-full bg-slate-950" />
      </div>
      {children}
    </div>
  );
}

function Hashtags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <p className="text-[11px] leading-relaxed text-sky-500">
      {tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
    </p>
  );
}

/** TikTok vertical feed mock */
function TikTokPreview({ content }: PreviewProps) {
  return (
    <PhoneShell dark>
      <div className="relative aspect-[9/16] max-h-[520px] bg-gradient-to-b from-slate-800 to-black text-white">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-90",
            content.coverGradient || "from-emerald-400 via-teal-500 to-cyan-600"
          )}
        />
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-center pt-2 text-xs font-semibold tracking-wide">
            Following | <span className="ml-2 border-b-2 border-white pb-0.5">For You</span>
          </div>

          <div className="flex items-end gap-3 pb-14">
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-bold">{content.authorHandle || "@roni.creator"}</p>
              <p className="text-xs leading-snug line-clamp-4">
                {content.hook || content.caption || content.title}
              </p>
              {content.body && (
                <p className="text-[11px] text-white/85 line-clamp-3 whitespace-pre-line">
                  {content.body}
                </p>
              )}
              <Hashtags tags={content.hashtags} />
              <div className="flex items-center gap-1 text-[10px] text-white/80">
                <Music2 className="h-3 w-3" />
                <span className="truncate">Original sound — {content.authorName || "Roni"}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 pb-2">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className="bg-emerald-500 text-white text-xs">R</AvatarFallback>
              </Avatar>
              {[
                { icon: Heart, n: "24.2K" },
                { icon: MessageCircle, n: "812" },
                { icon: Bookmark, n: "3.1K" },
                { icon: Share2, n: "1.4K" },
              ].map(({ icon: Icon, n }) => (
                <div key={n} className="flex flex-col items-center gap-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px]">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* big emoji center */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-7xl opacity-40 drop-shadow-lg">{content.coverEmoji || "🎬"}</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-around border-t border-white/10 bg-black/80 py-2 text-[10px] text-white/80">
          <Home className="h-5 w-5" />
          <Search className="h-5 w-5" />
          <div className="flex h-6 w-10 items-center justify-center rounded-md bg-white text-black text-lg font-bold">
            +
          </div>
          <MessageCircle className="h-5 w-5" />
          <User className="h-5 w-5" />
        </div>
      </div>
      {content.beats && content.beats.length > 0 && (
        <div className="bg-slate-950 px-3 py-2 space-y-1 border-t border-white/10">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
            Script beats
          </p>
          {content.beats.map((b, i) => (
            <div key={i} className="text-[10px] text-white/80">
              <span className="text-emerald-300 font-medium">{b.seconds || b.label}: </span>
              {b.text}
            </div>
          ))}
        </div>
      )}
    </PhoneShell>
  );
}

/** Instagram post mock */
function InstagramPreview({ content }: PreviewProps) {
  return (
    <PhoneShell>
      <div className="bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-yellow-400 via-rose-500 to-violet-600 text-white text-xs">
              R
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {content.authorHandle?.replace("@", "") || "roni.creator"}
            </p>
            <p className="text-[10px] text-slate-400">Sponsored · {platformLabel(content.platform)}</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-slate-500" />
        </div>

        <div
          className={cn(
            "aspect-square flex flex-col items-center justify-center bg-gradient-to-br p-6 text-white text-center",
            content.coverGradient || "from-violet-500 via-purple-500 to-fuchsia-500"
          )}
        >
          <span className="text-5xl mb-3">{content.coverEmoji || "✨"}</span>
          <p className="text-lg font-bold leading-snug drop-shadow">{content.title}</p>
          {content.hook && (
            <p className="mt-2 text-xs text-white/90 line-clamp-3">{content.hook}</p>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex gap-3">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Share2 className="h-5 w-5" />
          </div>
          <Bookmark className="h-5 w-5" />
        </div>
        <div className="px-3 pb-3 space-y-1">
          <p className="text-xs font-semibold">12.480 lượt thích</p>
          <p className="text-xs">
            <span className="font-semibold mr-1">
              {content.authorHandle?.replace("@", "") || "roni.creator"}
            </span>
            <span className="whitespace-pre-line text-slate-700">
              {(content.caption || content.body || "").slice(0, 220)}
              {(content.caption || content.body || "").length > 220 ? "…" : ""}
            </span>
          </p>
          <Hashtags tags={content.hashtags} />
          {content.cta && (
            <p className="text-[11px] font-medium text-emerald-600">{content.cta}</p>
          )}
          <p className="text-[10px] text-slate-400 uppercase">Xem tất cả 86 bình luận</p>
        </div>
      </div>
    </PhoneShell>
  );
}

/** Facebook feed post */
function FacebookPreview({ content }: PreviewProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-blue-600 text-white text-xs">R</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {content.authorName || "Roni Workplace"}
          </p>
          <p className="text-[10px] text-slate-400">Vừa xong · 🌎</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>
      <div className="px-3 pb-2">
        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
          {content.body || content.caption || content.title}
        </p>
        <div className="mt-2">
          <Hashtags tags={content.hashtags} />
        </div>
      </div>
      <div
        className={cn(
          "mx-0 h-40 bg-gradient-to-br flex items-center justify-center text-5xl",
          content.coverGradient || "from-sky-400 via-blue-500 to-indigo-600"
        )}
      >
        {content.coverEmoji || "📘"}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
        <span>👍❤️ 128</span>
        <span>24 bình luận · 11 chia sẻ</span>
      </div>
      <div className="flex border-t border-slate-100 text-xs font-medium text-slate-600">
        {[
          { icon: ThumbsUp, l: "Thích" },
          { icon: MessageCircle, l: "Bình luận" },
          { icon: Share2, l: "Chia sẻ" },
        ].map(({ icon: Icon, l }) => (
          <button
            key={l}
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 hover:bg-slate-50"
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** YouTube video page mock */
function YouTubePreview({ content }: PreviewProps) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div
        className={cn(
          "relative aspect-video bg-gradient-to-br flex items-center justify-center",
          content.coverGradient || "from-red-500 via-rose-500 to-orange-400"
        )}
      >
        <span className="text-6xl opacity-80">{content.coverEmoji || "▶️"}</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="h-7 w-7 fill-white" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">
          8:24
        </span>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-900 leading-snug">{content.title}</p>
        <p className="text-[11px] text-slate-500">12.450 lượt xem · 2 giờ trước</p>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-red-600 text-white text-xs">R</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{content.authorName || "Roni Channel"}</p>
            <p className="text-[10px] text-slate-400">48.2 N người đăng ký</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white"
          >
            <Bell className="h-3 w-3" />
            Đăng ký
          </button>
        </div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-700 whitespace-pre-line line-clamp-6">
          {content.hook && <p className="font-medium mb-1">{content.hook}</p>}
          {content.body}
        </div>
        {content.beats && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Chapters</p>
            {content.beats.map((b, i) => (
              <p key={i} className="text-[11px] text-blue-600">
                {b.seconds || "0:00"} {b.label} — {b.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** WordPress / Blog article */
function BlogPreview({ content }: PreviewProps) {
  const raw = content.body || "";
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const paragraphs = isHtml
    ? []
    : raw
        .replace(/^#+\s?/gm, "")
        .split(/\n\n+/)
        .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div
        className={cn(
          "h-36 bg-gradient-to-br flex items-end p-4",
          content.coverGradient || "from-emerald-400 via-teal-500 to-cyan-600"
        )}
      >
        <div>
          <Badge className="mb-2 bg-white/20 text-white border-0 backdrop-blur">
            {platformLabel(content.platform)}
          </Badge>
          <h1 className="text-xl font-bold text-white leading-tight drop-shadow">
            {content.title}
          </h1>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
              {(content.authorName || "R")[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-slate-700">{content.authorName || "Roni Editorial"}</span>
          <span>·</span>
          <span>5 phút đọc</span>
          <span>·</span>
          <span>Hôm nay</span>
        </div>
        {content.hook && (
          <p className="text-sm italic text-slate-600 border-l-2 border-emerald-400 pl-3">
            {content.hook}
          </p>
        )}
        {isHtml ? (
          <div
            className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 line-clamp-[24]"
            dangerouslySetInnerHTML={{
              __html: raw
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/on\w+="[^"]*"/gi, ""),
            }}
          />
        ) : (
          <div className="prose prose-sm prose-slate max-w-none space-y-2">
            {paragraphs.slice(0, 8).map((p, i) => (
              <p
                key={i}
                className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
              >
                {p.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        )}
        {content.cta && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-sm font-medium text-emerald-800">{content.cta}</p>
            <button
              type="button"
              className="mt-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white"
            >
              Đăng ký ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Threads mock */
function ThreadsPreview({ content }: PreviewProps) {
  return (
    <PhoneShell>
      <div className="bg-white px-3 py-4 min-h-[360px]">
        <div className="flex gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-slate-900 text-white text-xs">R</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold">
                {content.authorHandle?.replace("@", "") || "roni.creator"}
              </p>
              <span className="text-[10px] text-slate-400">· 2 giờ</span>
            </div>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {content.caption || content.body || content.title}
            </p>
            <Hashtags tags={content.hashtags} />
            <div className="mt-3 flex gap-4 text-slate-500">
              <Heart className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Share2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-[10px] text-slate-400">128 lượt thích · 14 trả lời</p>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function PlatformPreview({
  content,
  className,
}: {
  content: StructuredContent | string | null;
  className?: string;
}) {
  const data: StructuredContent =
    typeof content === "string" || content === null
      ? parseContentBody(content)
      : content;

  const platform = (data.platform || "blog").toLowerCase();

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-xs">
          Preview · {platformLabel(platform)}
        </Badge>
        <span className="text-[10px] text-slate-400">Như đã xuất bản</span>
      </div>
      {platform === "tiktok" && <TikTokPreview content={data} />}
      {platform === "instagram" && <InstagramPreview content={data} />}
      {platform === "facebook" && <FacebookPreview content={data} />}
      {platform === "youtube" && <YouTubePreview content={data} />}
      {(platform === "wordpress" || platform === "blog") && <BlogPreview content={data} />}
      {platform === "threads" && <ThreadsPreview content={data} />}
      {!["tiktok", "instagram", "facebook", "youtube", "wordpress", "blog", "threads"].includes(
        platform
      ) && <BlogPreview content={data} />}
    </div>
  );
}

export function PlatformPreviewFromRaw({
  title,
  body,
  platform,
  type,
  className,
}: {
  title?: string;
  body?: string | null;
  platform?: string | null;
  type?: string;
  className?: string;
}) {
  const structured = parseContentBody(body, { title, platform, type });
  return <PlatformPreview content={structured} className={className} />;
}

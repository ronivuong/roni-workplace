export type PlatformPreview =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "wordpress"
  | "blog"
  | "threads"
  | "social";

export type StructuredContent = {
  version: 1;
  platform: string;
  type: string;
  title: string;
  hook?: string;
  caption?: string;
  body: string;
  hashtags?: string[];
  cta?: string;
  /** Script beats for video platforms */
  beats?: { label: string; text: string; seconds?: string }[];
  /** Visual mock extras */
  authorName?: string;
  authorHandle?: string;
  coverEmoji?: string;
  coverGradient?: string;
};

export function isStructuredContent(value: unknown): value is StructuredContent {
  return (
    !!value &&
    typeof value === "object" &&
    (value as StructuredContent).version === 1 &&
    typeof (value as StructuredContent).body === "string"
  );
}

export function parseContentBody(
  raw: string | null | undefined,
  fallback?: { title?: string; platform?: string | null; type?: string }
): StructuredContent {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isStructuredContent(parsed)) return parsed;
    } catch {
      // plain text
    }
  }
  return {
    version: 1,
    platform: fallback?.platform || "blog",
    type: fallback?.type || "article",
    title: fallback?.title || "Nội dung",
    body: raw || "",
    hashtags: [],
  };
}

export function serializeContent(data: StructuredContent): string {
  return JSON.stringify(data);
}

const GRADIENTS = [
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-violet-500 via-purple-500 to-fuchsia-500",
  "from-orange-400 via-rose-500 to-pink-600",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-amber-300 via-orange-400 to-red-500",
];

const EMOJIS = ["✨", "🚀", "💡", "🔥", "🎯", "📱", "🎬", "✍️", "🌟", "💬"];

export function pickGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % GRADIENTS.length;
  return GRADIENTS[h];
}

export function pickEmoji(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % EMOJIS.length;
  return EMOJIS[h];
}

/** Platform-aware template when AI key is missing */
export function buildPlatformTemplate(input: {
  topic: string;
  platform: string;
  type: string;
  tone: string;
  authorName?: string;
}): StructuredContent {
  const { topic, platform, type, tone, authorName } = input;
  const handle = "@roni.creator";
  const base: StructuredContent = {
    version: 1,
    platform,
    type,
    title: topic,
    authorName: authorName || "Roni Creator",
    authorHandle: handle,
    coverEmoji: pickEmoji(topic),
    coverGradient: pickGradient(topic + platform),
    body: "",
    hashtags: [],
  };

  const slugTags = topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .map((w) => `#${w.replace(/[^a-z0-9]/g, "")}`);

  switch (platform) {
    case "tiktok":
      return {
        ...base,
        title: topic.length > 60 ? topic.slice(0, 57) + "…" : topic,
        hook: `Dừng scroll 3 giây! ${topic} — bạn đã thử chưa?`,
        caption: `POV: bạn muốn ${topic.toLowerCase()} nhưng chưa biết bắt đầu từ đâu 👀\n\nMình gói gọn 3 tips xài được ngay hôm nay:`,
        body: [
          "1️⃣ Hook mạnh — nói thẳng pain point trong 1 câu.",
          "2️⃣ Demo nhanh — show before/after hoặc checklist.",
          "3️⃣ CTA rõ — “Comment ‘MUỐN’ để nhận template”.",
        ].join("\n"),
        beats: [
          { label: "0–3s Hook", text: `Mở bằng câu sốc: “Sai lầm lớn nhất khi ${topic.toLowerCase()}…”`, seconds: "0-3s" },
          { label: "3–15s Value", text: "Đưa 2 tips ngắn, chữ lớn trên màn hình.", seconds: "3-15s" },
          { label: "15–30s Proof", text: "Show kết quả / số liệu / demo tay.", seconds: "15-30s" },
          { label: "30–45s CTA", text: "Nhắc follow + comment keyword.", seconds: "30-45s" },
        ],
        hashtags: ["#fyp", "#viral", "#contentcreator", ...slugTags].slice(0, 6),
        cta: "Follow để nhận tip mỗi ngày · Comment ‘GUIDE’ nhé!",
      };

    case "instagram":
      return {
        ...base,
        title: topic,
        hook: `✨ ${topic}`,
        caption: `✨ ${topic}\n\nNếu bạn đang tìm cách làm ${topic.toLowerCase()} theo hướng ${tone}, lưu post này lại nha.\n\n📌 Điểm chính:\n• Bắt đầu với 1 goal rõ trong 7 ngày\n• Đo bằng 1 chỉ số (views / saves / inbox)\n• Lặp lại format thắng cuộc\n\n👇 Save & share cho team bạn!`,
        body: `Slide 1 — Cover: “${topic}”\nSlide 2 — Vấn đề phổ biến\nSlide 3 — 3 bước làm\nSlide 4 — Checklist\nSlide 5 — CTA: Follow @roni.creator`,
        hashtags: ["#instagramtips", "#contentstrategy", "#socialmedia", ...slugTags].slice(0, 8),
        cta: "Double-tap nếu hữu ích · Share về story nhé 💚",
      };

    case "facebook":
      return {
        ...base,
        title: topic,
        hook: `Cùng bàn về: ${topic}`,
        caption: topic,
        body: `Chào cả nhà 👋\n\nHôm nay mình muốn chia sẻ về **${topic}** — chủ đề nhiều bạn inbox hỏi.\n\n🔍 Thực tế:\nNhiều team làm content rất chăm nhưng thiếu framework, nên dễ “mệt mà không ra kết quả”.\n\n✅ Gợi ý nhanh (giọng ${tone}):\n1. Xác định 1 persona chính\n2. Lịch 3 format/tuần (hook – value – proof)\n3. Review số liệu mỗi thứ 2\n\nBạn đang kẹt ở bước nào? Comment bên dưới, mình reply nhé!`,
        hashtags: ["#Facebook", "#ContentMarketing", ...slugTags].slice(0, 5),
        cta: "Tag đồng nghiệp cần đọc bài này ⬇️",
      };

    case "youtube":
      return {
        ...base,
        title: `${topic} | Hướng dẫn chi tiết 2026`,
        hook: `Trong video này bạn sẽ hiểu rõ ${topic.toLowerCase()} chỉ sau vài phút.`,
        body: `🎯 Tiêu đề: ${topic} | Hướng dẫn chi tiết 2026\n\n📝 Mô tả:\n${topic} — hướng dẫn từ A-Z cho creator Việt.\n\nTimestamps:\n0:00 Intro\n0:45 Vì sao quan trọng\n2:10 Cách làm từng bước\n5:30 Lỗi thường gặp\n7:00 Tổng kết + CTA\n\n👍 Like & Subscribe nếu video hữu ích!`,
        beats: [
          { label: "Intro", text: "Hook 5s + preview kết quả", seconds: "0:00" },
          { label: "Problem", text: "Nói pain point audience", seconds: "0:45" },
          { label: "Solution", text: "3 bước thực chiến", seconds: "2:10" },
          { label: "CTA", text: "Like, sub, comment câu hỏi", seconds: "7:00" },
        ],
        hashtags: ["#YouTube", "#Tutorial", ...slugTags].slice(0, 5),
        cta: "Subscribe để không bỏ lỡ series tiếp theo!",
      };

    case "wordpress":
    case "blog":
      return {
        ...base,
        title: topic,
        hook: `Tóm tắt: Bài viết giúp bạn nắm ${topic.toLowerCase()} và áp dụng ngay trong tuần này.`,
        body: `# ${topic}\n\n## Giới thiệu\n${topic} đang trở thành chủ đề nóng với các team content. Bài viết này trình bày góc nhìn thực chiến, giọng văn ${tone}.\n\n## Vì sao quan trọng?\n- Tiết kiệm thời gian sản xuất\n- Tăng tỷ lệ giữ chân người đọc\n- Dễ đo lường & tối ưu\n\n## Hướng dẫn từng bước\n### Bước 1: Xác định mục tiêu\nĐặt 1 KPI rõ (traffic, lead, engagement).\n\n### Bước 2: Xây outline\nHook → Value → Proof → CTA.\n\n### Bước 3: Xuất bản & đo\nĐăng đúng kênh, theo dõi 72 giờ đầu.\n\n## Kết luận\nBắt đầu nhỏ, lặp nhanh, cải tiến liên tục.\n\n---\n*Roni Workplace · AI Content Studio*`,
        hashtags: slugTags,
        cta: "Đăng ký nhận bản tin content mỗi tuần.",
      };

    case "threads":
      return {
        ...base,
        title: topic,
        caption: `${topic}.\n\n3 điều mình rút ra:\n1) Hook quyết định 80% reach\n2) Value phải “xài được hôm nay”\n3) CTA đơn giản > CTA phức tạp\n\nBạn đồng ý điểm nào nhất?`,
        body: `${topic} — thread ngắn cho creator bận rộn.`,
        hashtags: slugTags.slice(0, 3),
        cta: "Follow để đọc thread hay hơn.",
      };

    default:
      return {
        ...base,
        title: topic,
        body: `Nội dung về ${topic}\n\nGiọng: ${tone}\nNền tảng: ${platform}`,
        hashtags: slugTags,
        cta: "Chia sẻ nếu thấy hữu ích!",
      };
  }
}

export function platformLabel(platform: string) {
  const map: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    wordpress: "WordPress",
    blog: "Blog",
    threads: "Threads",
    social: "Social",
  };
  return map[platform] || platform;
}

import { bodyPlainText, htmlToPlainText, looksLikeHtml } from "@/lib/article-body";
import type { StructuredContent } from "@/lib/content-formats";
import type { SeoMeta } from "@/lib/seo";

export type SocialVariant = {
  platform: string;
  label: string;
  title: string;
  hook: string;
  caption: string;
  body: string;
  hashtags: string[];
  cta: string;
  /** Platform optimization notes for the user */
  tips: string[];
  /** Soft character / format guidance */
  limits: string;
};

export const SOCIAL_SHARE_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

function plainFromArticle(structured: StructuredContent): string {
  const raw = structured.body || "";
  if (looksLikeHtml(raw)) return htmlToPlainText(raw);
  return bodyPlainText(raw) || raw;
}

function firstParagraph(text: string, max = 280) {
  const p = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)[0] || text;
  if (p.length <= max) return p;
  return p.slice(0, max - 1).trimEnd() + "…";
}

function extractBullets(text: string, n = 3): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/^#+\s*/, "")
        .replace(/^[-*•\d.)\s]+/, "")
        .trim()
    )
    .filter((l) => l.length > 20 && l.length < 160);
  const unique: string[] = [];
  for (const l of lines) {
    if (!unique.some((u) => u.slice(0, 40) === l.slice(0, 40))) unique.push(l);
    if (unique.length >= n) break;
  }
  if (unique.length < n) {
    const sentences = text
      .replace(/\s+/g, " ")
      .split(/[.!?。]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);
    for (const s of sentences) {
      if (!unique.includes(s)) unique.push(s);
      if (unique.length >= n) break;
    }
  }
  return unique.slice(0, n);
}

function keywordTags(seo?: SeoMeta, title?: string): string[] {
  const tags: string[] = [];
  const push = (w: string) => {
    const t =
      "#" +
      w
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 28);
    if (t.length > 2 && !tags.includes(t)) tags.push(t);
  };
  if (seo?.primaryKeyword) push(seo.primaryKeyword);
  for (const s of seo?.secondaryKeywords || []) push(s);
  if (title) {
    title
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 2)
      .forEach(push);
  }
  return tags.slice(0, 5);
}

function articleUrlHint(seo?: SeoMeta) {
  if (seo?.slug) return `https://yoursite.com/${seo.slug}`;
  return "https://yoursite.com/bai-viet";
}

/**
 * Rule-based platform-optimized social posts derived from an SEO article.
 * (Works offline; AI endpoint can refine later.)
 */
export function buildSocialVariantsFromArticle(
  structured: StructuredContent,
  opts?: { siteUrl?: string | null }
): SocialVariant[] {
  const seo = structured.seo;
  const title = structured.title || seo?.metaTitle || "Bài viết mới";
  const plain = plainFromArticle(structured);
  const lead = firstParagraph(plain, 220);
  const bullets = extractBullets(plain, 3);
  const kw = seo?.primaryKeyword || title;
  const tags = keywordTags(seo, title);
  const ctaBase = seo?.cta || structured.cta || "Đọc full bài & áp dụng ngay";
  const link = opts?.siteUrl || articleUrlHint(seo);
  const bulletBlock = bullets.map((b, i) => `${i + 1}. ${b}`).join("\n");

  const variants: SocialVariant[] = [
    {
      platform: "facebook",
      label: "Facebook",
      title,
      hook: lead.slice(0, 120),
      caption: title,
      body: [
        `Chào cả nhà 👋`,
        ``,
        `Mình vừa đăng bài: **${title}**`,
        ``,
        lead,
        ``,
        bullets.length
          ? `Điểm chính:\n${bullets.map((b) => `• ${b}`).join("\n")}`
          : "",
        ``,
        `👉 Đọc full: ${link}`,
        ``,
        ctaBase,
      ]
        .filter(Boolean)
        .join("\n"),
      hashtags: ["#ContentMarketing", "#SEO", ...tags].slice(0, 5),
      cta: "Comment quan điểm của bạn bên dưới ⬇️",
      tips: [
        "Mở bằng câu chuyện / câu hỏi để tăng comment",
        "Link nằm sau đoạn value (không dump link đầu bài)",
        "Dùng 3–5 hashtag, không spam",
      ],
      limits: "Post dài OK · ưu tiên 1–2 đoạn + bullet",
    },
    {
      platform: "instagram",
      label: "Instagram",
      title,
      hook: `✨ ${title}`,
      caption: [
        `✨ ${title}`,
        ``,
        lead.slice(0, 180),
        ``,
        bullets.length
          ? `📌 Save nếu bạn cần:\n${bullets.map((b) => `• ${b}`).join("\n")}`
          : "",
        ``,
        `Link in bio · ${ctaBase}`,
        ``,
        [...tags, "#instagramtips", "#seo", "#contentcreator"].slice(0, 12).join(" "),
      ]
        .filter(Boolean)
        .join("\n"),
      body: `Carousel gợi ý:\n1. Cover: ${title}\n2. Pain point\n3–5. Tips\n6. CTA + link in bio`,
      hashtags: [...tags, "#instagramtips", "#seo", "#contentstrategy", "#reels"].slice(
        0,
        15
      ),
      cta: "Save & share về story 💚",
      tips: [
        "Caption ≤ 2.200 ký tự · hashtag cuối caption",
        "Cover text ngắn, font lớn",
        "CTA: Save / Share story / Comment keyword",
      ],
      limits: "Caption max ~2.200 · 3–15 hashtag",
    },
    {
      platform: "tiktok",
      label: "TikTok",
      title: title.length > 55 ? title.slice(0, 52) + "…" : title,
      hook: `Dừng scroll! ${kw} — 3 tip xài được ngay`,
      caption: [
        `POV: bạn làm content về ${kw} nhưng chưa có framework 👀`,
        ``,
        bulletBlock || lead.slice(0, 160),
        ``,
        `Full guide ➡️ ${link}`,
        ``,
        ["#fyp", "#seo", "#contentcreator", ...tags].slice(0, 6).join(" "),
      ].join("\n"),
      body: [
        "Script gợi ý 30–45s:",
        "0–3s: Hook pain point",
        "3–20s: 3 tips (chữ lớn)",
        "20–35s: Proof / demo",
        "35–45s: CTA comment keyword + follow",
      ].join("\n"),
      hashtags: ["#fyp", "#viral", "#seo", ...tags].slice(0, 6),
      cta: `Comment “GUIDE” để nhận checklist · Follow nhé!`,
      tips: [
        "Hook 3s đầu quan trọng nhất",
        "Caption ngắn + 3–5 hashtag",
        "Chữ trên video lặp ý caption",
      ],
      limits: "Caption ngắn · video dọc 9:16 · 15–60s",
    },
    {
      platform: "threads",
      label: "Threads",
      title,
      hook: lead.slice(0, 100),
      caption: [
        `${title}`,
        ``,
        lead.slice(0, 200),
        ``,
        bullets[0] ? `→ ${bullets[0]}` : "",
        ``,
        `Full: ${link}`,
      ]
        .filter(Boolean)
        .join("\n"),
      body: lead.slice(0, 400),
      hashtags: tags.slice(0, 3),
      cta: "Reply nếu bạn muốn part 2 👇",
      tips: [
        "Giọng hội thoại, 1–2 đoạn",
        "Hạn chế hashtag (0–3)",
        "Kết bằng câu hỏi để tăng reply",
      ],
      limits: "Ngắn gọn · conversational",
    },
    {
      platform: "youtube",
      label: "YouTube",
      title: `${title} | Hướng dẫn ${kw}`.slice(0, 90),
      hook: `Trong video này: ${kw} — checklist thực chiến`,
      caption: title,
      body: [
        `${title}`,
        ``,
        lead,
        ``,
        "Timestamps gợi ý:",
        "0:00 Intro",
        "0:30 Vấn đề",
        "2:00 3 bước chính",
        "5:00 Checklist",
        "7:00 Kết & CTA",
        ``,
        `Bài viết đầy đủ: ${link}`,
        ``,
        [...tags, "#youtube", "#seo"].join(" "),
      ].join("\n"),
      hashtags: [...tags, "#youtube", "#tutorial"].slice(0, 8),
      cta: "Like + Subscribe nếu hữu ích · Comment câu hỏi",
      tips: [
        "Title ≤ 100 ký tự, keyword gần đầu",
        "Description: 2 dòng đầu + timestamps + link",
        "Thumbnail text 3–5 từ",
      ],
      limits: "Title ≤ 100 · Description dài OK",
    },
    {
      platform: "linkedin",
      label: "LinkedIn",
      title,
      hook: title,
      caption: title,
      body: [
        `${title}`,
        ``,
        lead,
        ``,
        bullets.length
          ? `Key takeaways:\n${bullets.map((b) => `→ ${b}`).join("\n")}`
          : "",
        ``,
        `Đọc bài đầy đủ (SEO framework): ${link}`,
        ``,
        `#${(kw || "SEO").replace(/\s+/g, "")} #ContentStrategy #Marketing`,
      ]
        .filter(Boolean)
        .join("\n"),
      hashtags: [
        `#${(kw || "SEO").replace(/\s+/g, "").slice(0, 24)}`,
        "#ContentStrategy",
        "#Marketing",
        ...tags,
      ].slice(0, 5),
      cta: "Share nếu team bạn đang scale content ♻️",
      tips: [
        "Dòng 1 = hook (trước “see more”)",
        "Tone chuyên nghiệp, ít emoji",
        "3–5 hashtag chuyên ngành",
      ],
      limits: "Post dài OK · professional tone",
    },
  ];

  return variants;
}

export function variantToStructured(
  v: SocialVariant,
  authorName?: string | null
): StructuredContent {
  return {
    version: 1,
    mode: "social",
    platform: v.platform === "linkedin" ? "blog" : v.platform,
    type: v.platform === "youtube" || v.platform === "tiktok" ? "script" : "social",
    title: v.title,
    hook: v.hook,
    caption: v.caption,
    body: v.body,
    hashtags: v.hashtags,
    cta: v.cta,
    authorName: authorName || "Roni Creator",
    authorHandle: "@roni.creator",
  };
}

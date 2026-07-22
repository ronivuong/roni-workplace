export type SeoIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export type SeoOutlineItem = {
  heading: string;
  bullets?: string[];
};

export type SeoFaq = { q: string; a: string };

export type SeoMeta = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: SeoIntent;
  audience: string;
  tone: string;
  wordCountTarget: number;
  mustInclude: string;
  brandRules: string;
  competitorUrl?: string;
  cta: string;
  platform: "wordpress" | "blog" | "linkedin";
  slug: string;
  metaTitle: string;
  metaDescription: string;
  titleOptions?: string[];
  outline: SeoOutlineItem[];
  faq: SeoFaq[];
  keyTakeaways?: string[];
};

export type SeoCheck = {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  hint?: string;
};

export type SeoScoreResult = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
  wordCount: number;
  readingMinutes: number;
};

export function slugifyVi(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function countWords(text: string) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter(Boolean).length;
}

export function readingMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function includesKeyword(hay: string, kw: string) {
  if (!kw.trim()) return false;
  return hay.toLowerCase().includes(kw.toLowerCase().trim());
}

/** Rules-based SEO score (no external API) */
export function scoreArticleSeo(input: {
  title: string;
  body: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  wordCountTarget?: number;
}): SeoScoreResult {
  const title = input.title || "";
  const body = input.body || "";
  const metaTitle = input.metaTitle || title;
  const metaDesc = input.metaDescription || "";
  const slug = input.slug || slugifyVi(title);
  const kw = (input.primaryKeyword || "").trim();
  const secondary = input.secondaryKeywords || [];
  const target = input.wordCountTarget || 1200;
  const wordCount = countWords(body);
  const first100 = body.slice(0, 400);

  const h2Count = (body.match(/^##\s+/gm) || []).length;
  const h3Count = (body.match(/^###\s+/gm) || []).length;

  const checks: SeoCheck[] = [
    {
      id: "kw-title",
      label: "Từ khóa chính trong tiêu đề (H1)",
      ok: !kw || includesKeyword(title, kw),
      weight: 15,
      hint: "Đưa primary keyword vào H1 tự nhiên",
    },
    {
      id: "kw-intro",
      label: "Từ khóa trong 100–150 từ đầu",
      ok: !kw || includesKeyword(first100, kw),
      weight: 12,
      hint: "Nhắc keyword sớm trong đoạn mở",
    },
    {
      id: "kw-h2",
      label: "Từ khóa / biến thể trong ít nhất 1 H2",
      ok:
        !kw ||
        (body.match(/^##\s+.+$/gm) || []).some((h) => includesKeyword(h, kw)) ||
        secondary.some((s) =>
          (body.match(/^##\s+.+$/gm) || []).some((h) => includesKeyword(h, s))
        ),
      weight: 10,
      hint: "Dùng keyword hoặc secondary trong heading",
    },
    {
      id: "meta-title-len",
      label: "Meta title 50–60 ký tự",
      ok: metaTitle.length >= 40 && metaTitle.length <= 65,
      weight: 10,
      hint: `Hiện ${metaTitle.length} ký tự`,
    },
    {
      id: "meta-desc-len",
      label: "Meta description 140–165 ký tự",
      ok: metaDesc.length >= 120 && metaDesc.length <= 170,
      weight: 10,
      hint: `Hiện ${metaDesc.length} ký tự`,
    },
    {
      id: "meta-kw",
      label: "Keyword trong meta title hoặc description",
      ok: !kw || includesKeyword(metaTitle, kw) || includesKeyword(metaDesc, kw),
      weight: 8,
    },
    {
      id: "slug",
      label: "Slug ngắn, có keyword",
      ok:
        slug.length > 0 &&
        slug.length <= 80 &&
        (!kw || includesKeyword(slug, slugifyVi(kw))),
      weight: 8,
      hint: slug || "Chưa có slug",
    },
    {
      id: "length",
      label: `Độ dài bài (~${target} từ ±30%)`,
      ok: wordCount >= target * 0.55 && wordCount <= target * 1.5,
      weight: 12,
      hint: `Hiện ${wordCount} từ`,
    },
    {
      id: "structure-h2",
      label: "Có ít nhất 3 heading H2",
      ok: h2Count >= 3,
      weight: 8,
      hint: `Hiện ${h2Count} H2`,
    },
    {
      id: "faq",
      label: "Có section FAQ hoặc H2 hỏi đáp",
      ok:
        /faq|câu hỏi|hỏi đáp/i.test(body) ||
        (body.match(/^##\s+.+\?/gm) || []).length >= 1,
      weight: 4,
    },
    {
      id: "cta",
      label: "Có CTA rõ (đăng ký / liên hệ / tải…)",
      ok: /cta|đăng ký|liên hệ|tải|mua|nhận|comment|theo dõi|subscribe/i.test(
        body
      ),
      weight: 3,
    },
  ];

  // Secondary keywords bonus (soft)
  if (secondary.length) {
    const hit = secondary.filter((s) => includesKeyword(body, s)).length;
    checks.push({
      id: "secondary",
      label: `Từ khóa phụ xuất hiện (${hit}/${secondary.length})`,
      ok: hit >= Math.min(2, secondary.length),
      weight: 5,
      hint: "Rải secondary keywords tự nhiên",
    });
  }

  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const grade: SeoScoreResult["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return {
    score,
    grade,
    checks,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
  };
}

export function emptySeoMeta(partial?: Partial<SeoMeta>): SeoMeta {
  return {
    primaryKeyword: "",
    secondaryKeywords: [],
    intent: "informational",
    audience: "Marketer & chủ shop SME Việt Nam",
    tone: "chuyên nghiệp, dễ hiểu, thực chiến",
    wordCountTarget: 1500,
    mustInclude: "",
    brandRules: "",
    competitorUrl: "",
    cta: "Liên hệ tư vấn / Đăng ký nhận bản tin",
    platform: "wordpress",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    titleOptions: [],
    outline: [],
    faq: [],
    keyTakeaways: [],
    ...partial,
  };
}

export function buildArticleTemplate(seo: SeoMeta, topic: string): {
  title: string;
  body: string;
  seo: SeoMeta;
} {
  const kw = seo.primaryKeyword || topic;
  const title =
    seo.titleOptions?.[0] ||
    `${kw}: Hướng dẫn chi tiết cho ${seo.audience.split(/[&,]/)[0]?.trim() || "doanh nghiệp"}`;
  const slug = seo.slug || slugifyVi(title);
  const outline: SeoOutlineItem[] =
    seo.outline.length > 0
      ? seo.outline
      : [
          { heading: `Giới thiệu về ${kw}`, bullets: ["Bối cảnh", "Vấn đề thường gặp"] },
          { heading: `Vì sao ${kw} quan trọng`, bullets: ["Lợi ích", "Rủi ro nếu bỏ qua"] },
          {
            heading: `Cách triển khai ${kw} từng bước`,
            bullets: ["Bước 1", "Bước 2", "Bước 3"],
          },
          { heading: "Lỗi thường gặp & cách tránh", bullets: ["Lỗi 1", "Lỗi 2"] },
          { heading: "Checklist thực thi", bullets: ["Mục A", "Mục B"] },
          { heading: "Câu hỏi thường gặp (FAQ)", bullets: [] },
          { heading: "Kết luận & bước tiếp theo", bullets: [seo.cta] },
        ];

  const sections = outline
    .map((o) => {
      const bullets =
        o.bullets && o.bullets.length
          ? o.bullets.map((b) => `- ${b}`).join("\n")
          : `- Phân tích ngắn gọn, thực tế về «${o.heading}».\n- Ví dụ áp dụng cho ${seo.audience}.`;
      return `## ${o.heading}\n\n${bullets}\n`;
    })
    .join("\n");

  const faqBlock =
    seo.faq.length > 0
      ? seo.faq.map((f) => `### ${f.q}\n\n${f.a}\n`).join("\n")
      : `### ${kw} là gì?\n\n${kw} là chủ đề then chốt giúp bạn tối ưu hiệu quả nội dung và tăng trưởng bền vững.\n\n### Bắt đầu từ đâu?\n\nHãy xác định mục tiêu, persona và lịch xuất bản cố định trong 30 ngày đầu.\n`;

  const body = `# ${title}

${kw} đang là ưu tiên với ${seo.audience}. Bài viết này giúp bạn nắm **cách làm thực chiến**, giọng ${seo.tone}, phù hợp intent *${seo.intent}*.

${seo.mustInclude ? `> **Điểm cần có:** ${seo.mustInclude}\n` : ""}
## Tóm tắt nhanh (Key takeaways)

${(seo.keyTakeaways && seo.keyTakeaways.length
  ? seo.keyTakeaways
  : [
      `Hiểu rõ ${kw} trong bối cảnh Việt Nam`,
      "Có checklist triển khai ngay trong tuần",
      "Tránh các lỗi phổ biến khi scale content",
    ]
)
  .map((t) => `- ${t}`)
  .join("\n")}

${sections}

## FAQ — Câu hỏi thường gặp

${faqBlock}

## Kết luận

${kw} không phải “làm một lần”. Hãy lặp lại vòng: nghiên cứu → viết → đo → tối ưu.

**CTA:** ${seo.cta}

---
*Roni Workplace · AI Content Studio · SEO draft*
`;

  const metaTitle =
    seo.metaTitle ||
    (title.length <= 60 ? title : `${kw} — Hướng dẫn chi tiết`).slice(0, 60);
  const metaDescription =
    seo.metaDescription ||
    `Tìm hiểu ${kw}: hướng dẫn thực chiến cho ${seo.audience}. Checklist, lỗi cần tránh và CTA rõ ràng. Đọc ngay!`.slice(
      0,
      160
    );

  return {
    title,
    body,
    seo: {
      ...seo,
      slug,
      metaTitle,
      metaDescription,
      outline,
      titleOptions: seo.titleOptions?.length
        ? seo.titleOptions
        : [title, `${kw}: Bí quyết tăng trưởng 2026`, `Cách làm ${kw} hiệu quả từ A-Z`],
    },
  };
}

export const INTENT_LABELS: Record<SeoIntent, string> = {
  informational: "Thông tin (học / hiểu)",
  commercial: "Thương mại (so sánh / cân nhắc)",
  transactional: "Giao dịch (mua / đăng ký)",
  navigational: "Điều hướng (thương hiệu)",
};

export const WORD_TARGETS = [800, 1200, 1500, 2000, 2500];

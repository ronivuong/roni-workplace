import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildArticleTemplate,
  emptySeoMeta,
  slugifyVi,
  type SeoIntent,
  type SeoMeta,
} from "@/lib/seo";
import {
  serializeContent,
  pickEmoji,
  pickGradient,
  type StructuredContent,
} from "@/lib/content-formats";

type Mode = "outline" | "draft" | "meta" | "full";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const mode = (body.mode || "full") as Mode;
    const topic = String(body.topic || body.primaryKeyword || "").trim();
    if (!topic && !body.primaryKeyword) {
      return NextResponse.json(
        { error: "Nhập chủ đề hoặc từ khóa chính" },
        { status: 400 }
      );
    }

    const seoIn = emptySeoMeta({
      primaryKeyword: String(body.primaryKeyword || topic).trim(),
      secondaryKeywords: Array.isArray(body.secondaryKeywords)
        ? body.secondaryKeywords.map(String).filter(Boolean)
        : String(body.secondaryKeywords || "")
            .split(/[,;]+/)
            .map((s) => s.trim())
            .filter(Boolean),
      intent: (body.intent || "informational") as SeoIntent,
      audience: body.audience || "Marketer & chủ shop SME Việt Nam",
      tone: body.tone || "chuyên nghiệp, dễ hiểu, thực chiến",
      wordCountTarget: Number(body.wordCountTarget) || 1500,
      mustInclude: body.mustInclude || "",
      brandRules: body.brandRules || "",
      competitorUrl: body.competitorUrl || "",
      cta: body.cta || "Liên hệ tư vấn / Đăng ký nhận bản tin",
      platform: body.platform === "linkedin" ? "linkedin" : body.platform === "blog" ? "blog" : "wordpress",
    });

    const config = await prisma.aiConfig.findUnique({
      where: { type: "CONTENT_WRITING" },
    });
    const apiKey = config?.apiKey || process.env.XAI_API_KEY;
    const baseUrl = (config?.baseUrl || "https://api.x.ai/v1").replace(/\/$/, "");
    const model = config?.model || "grok-4.5";

    let seo: SeoMeta = { ...seoIn };
    let title = "";
    let articleBody = "";
    let usedAi = false;

    const system = `Bạn là content strategist + SEO editor tiếng Việt. Chỉ trả JSON hợp lệ, không markdown fence.`;

    const askAi = async (userPrompt: string) => {
      if (!apiKey) return null;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.65,
          max_tokens: mode === "outline" || mode === "meta" ? 1200 : 3500,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    };

    try {
      if (mode === "outline" || mode === "full" || mode === "draft") {
        const outlinePrompt = `Tạo outline SEO tiếng Việt.
Chủ đề: ${topic}
Primary keyword: ${seo.primaryKeyword}
Secondary: ${seo.secondaryKeywords.join(", ")}
Intent: ${seo.intent}
Audience: ${seo.audience}
Platform: ${seo.platform}
Word target: ${seo.wordCountTarget}
Must include: ${seo.mustInclude || "n/a"}
Brand rules: ${seo.brandRules || "n/a"}

JSON:
{
  "titleOptions": ["...","...","..."],
  "outline": [{"heading":"H2...","bullets":["..."]}],
  "keyTakeaways": ["..."],
  "faq": [{"q":"...","a":"..."}]
}`;
        const parsed = await askAi(outlinePrompt);
        if (parsed) {
          usedAi = true;
          seo = {
            ...seo,
            titleOptions: parsed.titleOptions || [],
            outline: parsed.outline || [],
            keyTakeaways: parsed.keyTakeaways || [],
            faq: parsed.faq || [],
          };
        }
      }

      if (mode === "meta" || mode === "full" || mode === "draft") {
        const chosenTitle =
          seo.titleOptions?.[0] ||
          `${seo.primaryKeyword}: Hướng dẫn chi tiết`;
        const metaPrompt = `Viết meta SEO tiếng Việt.
Title gợi ý: ${chosenTitle}
Keyword: ${seo.primaryKeyword}
Intent: ${seo.intent}

JSON:
{
  "metaTitle": "50-60 chars",
  "metaDescription": "140-160 chars",
  "slug": "slug-khong-dau"
}`;
        const parsed = await askAi(metaPrompt);
        if (parsed) {
          usedAi = true;
          seo = {
            ...seo,
            metaTitle: parsed.metaTitle || seo.metaTitle,
            metaDescription: parsed.metaDescription || seo.metaDescription,
            slug: parsed.slug || slugifyVi(chosenTitle),
          };
        }
      }

      if (mode === "draft" || mode === "full") {
        const draftPrompt = `Viết full bài blog markdown tiếng Việt (~${seo.wordCountTarget} từ).
Keyword: ${seo.primaryKeyword}
Secondary: ${seo.secondaryKeywords.join(", ")}
Audience: ${seo.audience}
Tone: ${seo.tone}
Intent: ${seo.intent}
CTA: ${seo.cta}
Outline: ${JSON.stringify(seo.outline)}
FAQ: ${JSON.stringify(seo.faq)}
Must include: ${seo.mustInclude}
Brand rules: ${seo.brandRules}

JSON:
{
  "title": "...",
  "body": "# H1\\n\\n## H2\\n... markdown đầy đủ",
  "metaTitle": "...",
  "metaDescription": "...",
  "slug": "..."
}`;
        const parsed = await askAi(draftPrompt);
        if (parsed?.body) {
          usedAi = true;
          title = parsed.title || seo.titleOptions?.[0] || topic;
          articleBody = parsed.body;
          seo = {
            ...seo,
            metaTitle: parsed.metaTitle || seo.metaTitle,
            metaDescription: parsed.metaDescription || seo.metaDescription,
            slug: parsed.slug || slugifyVi(title),
          };
        }
      }
    } catch (err) {
      console.error("article AI failed", err);
    }

    // Template fallback always available
    if (!articleBody || mode === "outline" || mode === "meta") {
      const tpl = buildArticleTemplate(seo, topic || seo.primaryKeyword);
      if (!title) title = tpl.title;
      if (!articleBody && (mode === "draft" || mode === "full")) {
        articleBody = tpl.body;
      }
      seo = { ...seo, ...tpl.seo };
      if (mode === "outline" && !seo.outline.length) {
        seo = tpl.seo;
        title = tpl.title;
      }
      if (mode === "meta" && !seo.metaTitle) {
        seo = tpl.seo;
        title = tpl.title;
      }
    }

    if (!title) {
      title = seo.titleOptions?.[0] || `${seo.primaryKeyword}: Hướng dẫn chi tiết`;
    }
    if (!seo.slug) seo.slug = slugifyVi(title);
    if (!seo.metaTitle) seo.metaTitle = title.slice(0, 60);
    if (!seo.metaDescription) {
      seo.metaDescription =
        `Tìm hiểu ${seo.primaryKeyword} — hướng dẫn thực chiến cho ${seo.audience}.`.slice(
          0,
          160
        );
    }

    // Outline-only: body is outline markdown
    if (mode === "outline" && !articleBody) {
      articleBody = [
        `# ${title}`,
        "",
        ...seo.outline.map(
          (o) =>
            `## ${o.heading}\n${(o.bullets || []).map((b) => `- ${b}`).join("\n")}`
        ),
        "",
        "## FAQ",
        ...seo.faq.map((f) => `### ${f.q}\n${f.a}`),
      ].join("\n\n");
    }

    if (mode === "meta" && !articleBody) {
      articleBody = existingBodyPlaceholder(title, seo);
    }

    const platform =
      seo.platform === "linkedin" ? "blog" : seo.platform || "wordpress";

    const structured: StructuredContent = {
      version: 1,
      mode: "article",
      platform,
      type: "article",
      title,
      hook: seo.keyTakeaways?.[0] || "",
      caption: seo.metaDescription,
      body: articleBody,
      cta: seo.cta,
      hashtags: seo.secondaryKeywords.map((k) =>
        k.startsWith("#") ? k : `#${slugifyVi(k)}`
      ),
      authorName: session.user.name || "Roni Editorial",
      authorHandle: "@roni.workplace",
      coverEmoji: pickEmoji(seo.primaryKeyword || title),
      coverGradient: pickGradient(seo.primaryKeyword + platform),
      seo,
    };

    let content = null;
    if (body.save !== false && (mode === "draft" || mode === "full" || mode === "outline")) {
      content = await prisma.content.create({
        data: {
          title,
          body: serializeContent(structured),
          type: "article",
          platform,
          status: "DRAFT",
          authorId: session.user.id,
        },
      });
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: usedAi ? "AI_ARTICLE" : "TEMPLATE_ARTICLE",
          entity: "Content",
          entityId: content.id,
          metadata: JSON.stringify({ mode, keyword: seo.primaryKeyword }),
        },
      });
    }

    return NextResponse.json({
      structured,
      seo,
      title,
      body: articleBody,
      usedAi,
      content,
      mode,
      message: usedAi
        ? `AI đã tạo ${mode} SEO`
        : `Đã tạo ${mode} từ template SEO (thêm XAI_API_KEY / Cài đặt AI để dùng model thật)`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được bài SEO" }, { status: 500 });
  }
}

function existingBodyPlaceholder(title: string, seo: SeoMeta) {
  return `# ${title}\n\n> Meta title: ${seo.metaTitle}\n> Meta description: ${seo.metaDescription}\n> Slug: /${seo.slug}\n\n_(Chọn «Viết full draft» để sinh nội dung đầy đủ.)_\n`;
}

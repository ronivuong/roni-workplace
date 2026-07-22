import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSocialVariantsFromArticle,
  type SocialVariant,
} from "@/lib/article-social";
import { parseContentBody, type StructuredContent } from "@/lib/content-formats";

/**
 * POST — generate platform-optimized social posts from an SEO article.
 * body: { contentId?: string, structured?: StructuredContent, refineWithAi?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let structured: StructuredContent | null = null;

    if (body.contentId) {
      const content = await prisma.content.findUnique({
        where: { id: String(body.contentId) },
      });
      if (!content) {
        return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
      }
      structured = parseContentBody(content.body, {
        title: content.title,
        platform: content.platform,
        type: content.type,
      });
      if (!structured.title) structured.title = content.title;
    } else if (body.structured && typeof body.structured === "object") {
      structured = body.structured as StructuredContent;
    }

    if (!structured?.title?.trim() && !structured?.body?.trim()) {
      return NextResponse.json(
        { error: "Cần tiêu đề hoặc nội dung bài viết" },
        { status: 400 }
      );
    }

    let variants = buildSocialVariantsFromArticle(structured, {
      siteUrl: body.siteUrl || null,
    });

    // Optional light AI refine (best-effort, never fails hard)
    if (body.refineWithAi) {
      try {
        const setting = await prisma.aiConfig.findFirst({
          where: { isEnabled: true, apiKey: { not: null } },
          orderBy: { updatedAt: "desc" },
        });
        if (setting?.apiKey) {
          const refined = await refineVariantsWithAi({
            apiKey: setting.apiKey,
            baseUrl: setting.baseUrl || "https://api.x.ai/v1",
            model: setting.model || "grok-2-latest",
            title: structured.title,
            keyword: structured.seo?.primaryKeyword || "",
            variants,
          });
          if (refined?.length) variants = refined;
        }
      } catch (e) {
        console.warn("AI refine social variants skipped", e);
      }
    }

    return NextResponse.json({
      variants,
      sourceTitle: structured.title,
      count: variants.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function refineVariantsWithAi(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  title: string;
  keyword: string;
  variants: SocialVariant[];
}): Promise<SocialVariant[] | null> {
  const compact = input.variants.map((v) => ({
    platform: v.platform,
    caption: v.caption?.slice(0, 400),
    body: v.body?.slice(0, 600),
    hashtags: v.hashtags,
    cta: v.cta,
  }));

  const res = await fetch(`${input.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Bạn là social media strategist VN. Viết lại caption/body tối ưu từng nền tảng, giữ JSON structure. Trả về JSON array only.",
        },
        {
          role: "user",
          content: `Bài SEO: "${input.title}" keyword: "${input.keyword}".\nRefine các post sau (giữ platform, tips, limits, label, title nếu hợp lý):\n${JSON.stringify(compact)}\n\nTrả về: [{"platform","title","hook","caption","body","hashtags","cta"}]`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as Partial<SocialVariant>[];
  if (!Array.isArray(parsed)) return null;

  return input.variants.map((orig) => {
    const hit = parsed.find((p) => p.platform === orig.platform);
    if (!hit) return orig;
    return {
      ...orig,
      title: hit.title || orig.title,
      hook: hit.hook || orig.hook,
      caption: hit.caption || orig.caption,
      body: hit.body || orig.body,
      hashtags: Array.isArray(hit.hashtags) ? hit.hashtags.map(String) : orig.hashtags,
      cta: hit.cta || orig.cta,
    };
  });
}


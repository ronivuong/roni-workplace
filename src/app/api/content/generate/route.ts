import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPlatformTemplate,
  serializeContent,
  type StructuredContent,
  pickEmoji,
  pickGradient,
} from "@/lib/content-formats";

function platformPrompt(platform: string, topic: string, type: string, tone: string) {
  const common = `Chủ đề: ${topic}
Loại: ${type}
Giọng: ${tone}
Nền tảng: ${platform}
Viết tiếng Việt tự nhiên, đúng văn hoá creator VN.`;

  const schemas: Record<string, string> = {
    tiktok: `Trả JSON:
{"title":"max 60 ký tự","hook":"câu mở 3s","caption":"caption feed","body":"3 tips ngắn xuống dòng","beats":[{"label":"...","text":"...","seconds":"0-3s"}],"hashtags":["#fyp",...],"cta":"..."}`,
    instagram: `Trả JSON:
{"title":"...","hook":"dòng cover","caption":"caption có emoji + xuống dòng","body":"mô tả carousel slide","hashtags":[...],"cta":"..."}`,
    facebook: `Trả JSON:
{"title":"...","hook":"...","body":"bài post Facebook đầy đủ, có đoạn mở-thân-CTA","hashtags":[...],"cta":"..."}`,
    youtube: `Trả JSON:
{"title":"tiêu đề SEO YouTube","hook":"dòng đầu description","body":"mô tả + timestamps","beats":[{"label":"Intro","text":"...","seconds":"0:00"}],"hashtags":[...],"cta":"..."}`,
    wordpress: `Trả JSON:
{"title":"H1 bài blog","hook":"lead paragraph","body":"markdown bài viết đầy đủ ## headings","hashtags":[],"cta":"..."}`,
    blog: `Trả JSON:
{"title":"H1","hook":"tóm tắt","body":"markdown đầy đủ","hashtags":[],"cta":"..."}`,
    threads: `Trả JSON:
{"title":"...","caption":"thread ngắn 1-2 đoạn","body":"tóm tắt","hashtags":[...],"cta":"..."}`,
  };

  return `${common}\n${schemas[platform] || schemas.blog}\nChỉ trả JSON thuần, không markdown fence.`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const type = body.type || "social";
    const platform = (body.platform || "tiktok").toLowerCase();
    const tone = body.tone || "chuyên nghiệp, gần gũi";

    if (!topic) {
      return NextResponse.json({ error: "Vui lòng nhập chủ đề / câu lệnh" }, { status: 400 });
    }

    const config = await prisma.aiConfig.findUnique({
      where: { type: "CONTENT_WRITING" },
    });
    const apiKey = config?.apiKey || process.env.XAI_API_KEY;
    const baseUrl = (config?.baseUrl || "https://api.x.ai/v1").replace(/\/$/, "");
    const model = config?.model || "grok-4.5";

    let structured: StructuredContent = buildPlatformTemplate({
      topic,
      platform,
      type,
      tone,
      authorName: session.user.name || "Roni Creator",
    });
    let usedAi = false;

    if (apiKey) {
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Bạn là senior content creator Việt Nam. Chỉ trả JSON hợp lệ theo schema user yêu cầu.",
              },
              {
                role: "user",
                content: platformPrompt(platform, topic, type, tone),
              },
            ],
            temperature: 0.75,
            max_tokens: 1600,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            structured = {
              version: 1,
              platform,
              type,
              title: parsed.title || topic,
              hook: parsed.hook,
              caption: parsed.caption,
              body: parsed.body || parsed.caption || "",
              hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
              cta: parsed.cta,
              beats: Array.isArray(parsed.beats) ? parsed.beats : structured.beats,
              authorName: session.user.name || "Roni Creator",
              authorHandle: "@roni.creator",
              coverEmoji: pickEmoji(topic),
              coverGradient: pickGradient(topic + platform),
            };
            usedAi = true;
          }
        }
      } catch (err) {
        console.error("AI generate failed, using template", err);
      }
    }

    const serialized = serializeContent(structured);
    let content = null;

    if (body.save !== false) {
      content = await prisma.content.create({
        data: {
          title: structured.title,
          body: serialized,
          type: structured.type || type,
          platform,
          status: "DRAFT",
          authorId: session.user.id,
          teamId: body.teamId || null,
        },
        include: {
          author: { select: { id: true, name: true } },
          team: { select: { id: true, name: true, color: true } },
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: usedAi ? "AI_GENERATE" : "TEMPLATE_GENERATE",
          entity: "Content",
          entityId: content.id,
          metadata: JSON.stringify({ platform, topic }),
        },
      });
    }

    return NextResponse.json({
      structured,
      title: structured.title,
      body: serialized,
      usedAi,
      content,
      message: usedAi
        ? `Đã sinh nội dung ${platform.toUpperCase()} bằng AI — xem preview bên phải`
        : `Đã tạo bản nháp ${platform.toUpperCase()} (template). Thêm API Key ở Cài đặt để dùng AI thật.`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được nội dung" }, { status: 500 });
  }
}

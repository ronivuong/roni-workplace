import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Generate content draft with AI (xAI) when key available,
 * otherwise produce a structured Vietnamese template so the feature always works.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const type = body.type || "article";
    const platform = body.platform || "blog";
    const tone = body.tone || "chuyên nghiệp, gần gũi";

    if (!topic) {
      return NextResponse.json({ error: "Vui lòng nhập chủ đề" }, { status: 400 });
    }

    const config = await prisma.aiConfig.findUnique({
      where: { type: "CONTENT_WRITING" },
    });
    const apiKey = config?.apiKey || process.env.XAI_API_KEY;
    const baseUrl = (config?.baseUrl || "https://api.x.ai/v1").replace(/\/$/, "");
    const model = config?.model || "grok-4.5";

    let title = topic;
    let contentBody = "";
    let usedAi = false;

    if (apiKey) {
      try {
        const prompt = `Bạn là content creator Việt Nam chuyên nghiệp.
Viết nội dung ${type} cho nền tảng ${platform}, giọng ${tone}.
Chủ đề: ${topic}

Trả về JSON thuần (không markdown):
{"title":"...","body":"..."}
Body dùng tiếng Việt, có cấu trúc rõ (mở đầu, thân, CTA).`;

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Chỉ trả JSON hợp lệ, không giải thích." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1200,
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            title = parsed.title || title;
            contentBody = parsed.body || "";
            usedAi = true;
          }
        }
      } catch (err) {
        console.error("AI generate failed, fallback template", err);
      }
    }

    if (!contentBody) {
      // Always-working template fallback
      title = `${topic}`;
      contentBody = [
        `## ${topic}`,
        "",
        `**Dành cho:** ${platform} · Định dạng: ${type}`,
        `**Giọng văn:** ${tone}`,
        "",
        "### Hook (mở đầu)",
        `Bạn có bao giờ thắc mắc về «${topic}»? Trong bài này, chúng ta sẽ đi thẳng vào những điểm then chốt.`,
        "",
        "### Nội dung chính",
        `1. **Bối cảnh** — Vì sao «${topic}» đang được quan tâm.`,
        `2. **Giải pháp / Góc nhìn** — 3 ý chính giúp bạn áp dụng ngay.`,
        `3. **Ví dụ thực tế** — Case ngắn dễ hình dung.`,
        "",
        "### CTA",
        "Bạn đang làm điều gì liên quan đến chủ đề này? Comment chia sẻ nhé!",
        "",
        "---",
        `*Bản nháp tự động · ${new Date().toLocaleString("vi-VN")} · ${usedAi ? "AI" : "Template"}*`,
      ].join("\n");
    }

    // Optionally persist as draft
    let content = null;
    if (body.save !== false) {
      content = await prisma.content.create({
        data: {
          title,
          body: contentBody,
          type,
          platform,
          status: "DRAFT",
          authorId: session.user.id,
          teamId: body.teamId || null,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: usedAi ? "AI_GENERATE" : "TEMPLATE_GENERATE",
          entity: "Content",
          entityId: content.id,
        },
      });
    }

    return NextResponse.json({
      title,
      body: contentBody,
      usedAi,
      content,
      message: usedAi
        ? "Đã sinh nội dung bằng AI"
        : "Đã tạo bản nháp từ template (chưa cấu hình API Key AI — vào Cài đặt để thêm key).",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được nội dung" }, { status: 500 });
  }
}

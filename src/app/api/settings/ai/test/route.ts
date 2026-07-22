import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type } = (await req.json()) as { type: string };
    if (!type) {
      return NextResponse.json({ error: "Thiếu type" }, { status: 400 });
    }

    const config = await prisma.aiConfig.findUnique({
      where: { type },
    });

    if (!config) {
      return NextResponse.json({ error: "Chưa cấu hình provider này" }, { status: 404 });
    }

    const apiKey = config.apiKey || process.env.XAI_API_KEY;
    const baseUrl = config.baseUrl || "https://api.x.ai/v1";

    if (!apiKey) {
      await prisma.aiConfig.update({
        where: { id: config.id },
        data: { lastTestedAt: new Date(), lastTestOk: false },
      });
      return NextResponse.json({
        ok: false,
        message: "Chưa có API Key. Thêm key trong cấu hình hoặc biến môi trường XAI_API_KEY.",
      });
    }

    try {
      // Lightweight connectivity test against OpenAI-compatible models endpoint
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      const ok = res.ok || res.status === 404; // some providers don't expose /models

      // If models fails, try a minimal chat completion for content writing
      let finalOk = ok;
      let detail = `HTTP ${res.status}`;

      if (!ok && (type === "CONTENT_WRITING" || type === "FALLBACK")) {
        const chatRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model || "grok-4.5",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(15000),
        });
        finalOk = chatRes.ok;
        detail = `chat ${chatRes.status}`;
      }

      await prisma.aiConfig.update({
        where: { id: config.id },
        data: { lastTestedAt: new Date(), lastTestOk: finalOk },
      });

      return NextResponse.json({
        ok: finalOk,
        message: finalOk
          ? `Kết nối ${config.provider} thành công (${detail})`
          : `Kết nối thất bại (${detail}). Kiểm tra API Key / base URL.`,
        provider: config.provider,
        model: config.model,
      });
    } catch (err) {
      await prisma.aiConfig.update({
        where: { id: config.id },
        data: { lastTestedAt: new Date(), lastTestOk: false },
      });
      return NextResponse.json({
        ok: false,
        message: err instanceof Error ? err.message : "Lỗi kết nối",
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

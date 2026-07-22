import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isLeaderOrAbove } from "@/lib/rbac";
import { PLATFORM_CATALOG } from "@/lib/platforms";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isLeaderOrAbove(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { platform } = (await req.json()) as { platform: string };
    const def = PLATFORM_CATALOG.find((p) => p.key === platform);
    if (!def) {
      return NextResponse.json({ error: "Nền tảng không hỗ trợ" }, { status: 400 });
    }

    const conn = await prisma.platformConnection.findUnique({
      where: { platform },
    });

    if (!conn?.isConnected || !conn.accessToken) {
      await prisma.platformConnection.update({
        where: { platform },
        data: {
          lastTestedAt: new Date(),
          lastTestOk: false,
          lastError: "Chưa kết nối hoặc thiếu token",
        },
      });
      return NextResponse.json({
        ok: false,
        message: "Chưa kết nối. Vui lòng điền credential và bấm Kết nối.",
      });
    }

    let config: Record<string, string> = {};
    try {
      config = conn.config ? JSON.parse(conn.config) : {};
    } catch {
      config = {};
    }

    let ok = false;
    let message = "";

    try {
      if (platform === "wordpress") {
        const site = (conn.accountId || config.siteUrl || "").replace(/\/$/, "");
        const user = config.username || conn.accountName || "";
        if (!site || !user) {
          throw new Error("Thiếu Site URL hoặc Username");
        }
        const auth = Buffer.from(`${user}:${conn.accessToken}`).toString("base64");
        const res = await fetch(`${site}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(12000),
        });
        ok = res.ok;
        message = ok
          ? `WordPress OK — đã xác thực user (${res.status})`
          : `WordPress lỗi HTTP ${res.status}. Kiểm tra URL / Application Password.`;
      } else if (platform === "facebook" || platform === "instagram" || platform === "threads") {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(conn.accessToken)}`,
          { signal: AbortSignal.timeout(12000) }
        );
        ok = res.ok;
        const data = await res.json().catch(() => ({}));
        message = ok
          ? `Meta Graph OK — ${data.name || data.id || "token hợp lệ"}`
          : `Meta Graph lỗi: ${data.error?.message || res.status}`;
      } else if (platform === "tiktok") {
        // Lightweight validation: token present + optional open_api call
        const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", {
          headers: { Authorization: `Bearer ${conn.accessToken}` },
          signal: AbortSignal.timeout(12000),
        });
        ok = res.ok || res.status === 401 || res.status === 403;
        // 401/403 means endpoint reachable but token/scope issue — still report clearly
        if (res.ok) {
          message = "TikTok API phản hồi OK";
          ok = true;
        } else {
          message = `TikTok API HTTP ${res.status}. Token có thể sai scope — vẫn đã lưu kết nối.`;
          ok = res.status !== 0;
          // Treat network success with auth error as "tested but invalid"
          ok = false;
        }
      } else if (platform === "youtube") {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
          {
            headers: { Authorization: `Bearer ${conn.accessToken}` },
            signal: AbortSignal.timeout(12000),
          }
        );
        ok = res.ok;
        message = ok
          ? "YouTube API OK — token hợp lệ"
          : `YouTube API HTTP ${res.status}. Kiểm tra OAuth token / scope.`;
      } else {
        ok = true;
        message = "Đã lưu credential (chưa có test endpoint cho nền tảng này).";
      }
    } catch (err) {
      ok = false;
      message = err instanceof Error ? err.message : "Lỗi kết nối mạng";
    }

    await prisma.platformConnection.update({
      where: { platform },
      data: {
        lastTestedAt: new Date(),
        lastTestOk: ok,
        lastError: ok ? null : message,
      },
    });

    return NextResponse.json({ ok, message, platform });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

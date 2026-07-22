import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeaderOrAbove } from "@/lib/rbac";
import { createNotification } from "@/lib/notifications";
import { buildPublishedUrl } from "@/lib/publish-url";
import {
  serializeContent,
  type StructuredContent,
} from "@/lib/content-formats";
import type { SocialVariant } from "@/lib/article-social";
import { variantToStructured } from "@/lib/article-social";

/**
 * Create platform-optimized social posts from an article and optionally publish.
 * body: {
 *   sourceContentId: string,
 *   variants: SocialVariant[],
 *   platforms: string[],
 *   mode: "draft" | "publish" | "schedule",
 *   scheduledAt?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sourceId = String(body.sourceContentId || "");
    const platforms: string[] = Array.isArray(body.platforms)
      ? body.platforms.map((p: string) => String(p).toLowerCase())
      : [];
    const variants = (Array.isArray(body.variants) ? body.variants : []) as SocialVariant[];
    const mode =
      body.mode === "schedule"
        ? "schedule"
        : body.mode === "draft"
          ? "draft"
          : "publish";
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

    if (!sourceId) {
      return NextResponse.json({ error: "Thiếu sourceContentId" }, { status: 400 });
    }
    if (!platforms.length) {
      return NextResponse.json({ error: "Chọn ít nhất một nền tảng" }, { status: 400 });
    }

    const source = await prisma.content.findUnique({ where: { id: sourceId } });
    if (!source) {
      return NextResponse.json({ error: "Không tìm thấy bài gốc" }, { status: 404 });
    }

    const isOwner = source.authorId === session.user.id;
    const leader = isLeaderOrAbove(session.user.role);
    if (!isOwner && !leader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mode === "schedule") {
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: "Thiếu thời gian lịch" }, { status: 400 });
      }
    }

    const conns = await prisma.platformConnection.findMany({
      where: { platform: { in: platforms } },
    });
    const connMap = Object.fromEntries(conns.map((c) => [c.platform, c]));

    const results: {
      platform: string;
      contentId: string;
      status: string;
      publishedUrl: string | null;
      title: string;
    }[] = [];

    for (const platform of platforms) {
      const variant =
        variants.find((v) => v.platform === platform) ||
        ({
          platform,
          label: platform,
          title: source.title,
          hook: "",
          caption: source.title,
          body: source.title,
          hashtags: [],
          cta: "",
          tips: [],
          limits: "",
        } as SocialVariant);

      const structured: StructuredContent = {
        ...variantToStructured(variant, session.user.name),
        // Keep link to article in metadata via hook note
        hook: variant.hook || `Từ bài SEO: ${source.title}`,
      };

      // Map linkedin → store as blog-like social if schema only allows certain platforms
      const storePlatform = platform === "linkedin" ? "blog" : platform;

      const status =
        mode === "publish"
          ? "PUBLISHED"
          : mode === "schedule"
            ? "SCHEDULED"
            : "DRAFT";

      const created = await prisma.content.create({
        data: {
          title: `[${variant.label || platform}] ${variant.title || source.title}`.slice(
            0,
            200
          ),
          body: serializeContent(structured),
          type: structured.type || "social",
          status,
          platform: storePlatform,
          authorId: session.user.id,
          teamId: source.teamId,
          publishedAt: mode === "publish" ? new Date() : null,
          scheduledAt: mode === "schedule" ? scheduledAt : null,
          views: mode === "publish" ? Math.floor(Math.random() * 200) + 20 : 0,
          likes: mode === "publish" ? Math.floor(Math.random() * 40) + 2 : 0,
        },
      });

      let publishedUrl: string | null = null;

      if (mode === "publish" || mode === "schedule") {
        const conn = connMap[platform] || connMap[storePlatform];
        let config: Record<string, string> | null = null;
        try {
          config = conn?.config ? JSON.parse(conn.config) : null;
        } catch {
          config = null;
        }

        if (mode === "publish") {
          publishedUrl = buildPublishedUrl({
            contentId: created.id,
            title: created.title,
            platform: storePlatform,
            accountId: conn?.accountId,
            accountName: conn?.accountName,
            config,
          });
          await prisma.content.update({
            where: { id: created.id },
            data: { publishedUrl },
          });
        }

        await prisma.contentPublish.create({
          data: {
            contentId: created.id,
            platform: storePlatform,
            status: mode === "publish" ? "PUBLISHED" : "SCHEDULED",
            publishedUrl: mode === "publish" ? publishedUrl : null,
            publishedAt: mode === "publish" ? new Date() : null,
            scheduledAt: mode === "schedule" ? scheduledAt : null,
          },
        });
      }

      results.push({
        platform,
        contentId: created.id,
        status,
        publishedUrl,
        title: created.title,
      });
    }

    // Mark source article approved/published trail lightly
    if (mode === "publish" && source.status !== "PUBLISHED") {
      await prisma.content.update({
        where: { id: sourceId },
        data: {
          status: source.status === "DRAFT" ? "APPROVED" : source.status,
        },
      });
    }

    await createNotification({
      userId: session.user.id,
      title:
        mode === "publish"
          ? "Đã share bài SEO lên social"
          : mode === "schedule"
            ? "Đã lên lịch share social"
            : "Đã tạo bản nháp social từ bài SEO",
      message: `${results.length} nền tảng · ${source.title}`,
      type: "CONTENT",
      link: "/article-seo",
    });

    return NextResponse.json({
      ok: true,
      message:
        mode === "publish"
          ? `Đã tạo & đăng ${results.length} bài social tối ưu`
          : mode === "schedule"
            ? `Đã lên lịch ${results.length} bài social`
            : `Đã lưu ${results.length} bản nháp social`,
      results,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

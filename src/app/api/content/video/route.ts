import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  parseContentBody,
  serializeContent,
  pickEmoji,
  pickGradient,
} from "@/lib/content-formats";

/** Create or attach video asset to a content item */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const mediaUrl = String(body.mediaUrl || "").trim();
    if (!mediaUrl) {
      return NextResponse.json({ error: "Thiếu mediaUrl" }, { status: 400 });
    }

    const title =
      String(body.title || "").trim() ||
      body.fileName?.replace(/\.[^.]+$/, "") ||
      `Video ${new Date().toLocaleString("vi-VN")}`;

    const platform = (body.platform || "tiktok").toLowerCase();
    const caption = body.caption || body.description || "";
    const presetId = body.presetId || platform;

    const structured = {
      version: 1 as const,
      platform,
      type: "video",
      title,
      hook: body.hook || "",
      caption,
      body: caption || `Video upload · preset ${presetId}`,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      cta: body.cta || "",
      authorName: session.user.name || "Roni Creator",
      authorHandle: "@roni.creator",
      coverEmoji: pickEmoji(title),
      coverGradient: pickGradient(title + platform),
      beats: body.beats || [],
    };

    const content = await prisma.content.create({
      data: {
        title,
        body: serializeContent(structured),
        type: "video",
        status: "DRAFT",
        platform,
        authorId: session.user.id,
        mediaUrl,
        thumbnailUrl: body.thumbnailUrl || null,
        mediaMime: body.mediaMime || null,
        mediaSize: body.mediaSize != null ? Number(body.mediaSize) : null,
        mediaDuration:
          body.mediaDuration != null ? Number(body.mediaDuration) : null,
        mediaWidth: body.mediaWidth != null ? Number(body.mediaWidth) : null,
        mediaHeight: body.mediaHeight != null ? Number(body.mediaHeight) : null,
        aspectRatio: body.aspectRatio || null,
      },
      include: {
        author: { select: { id: true, name: true } },
        publishes: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPLOAD_VIDEO",
        entity: "Content",
        entityId: content.id,
        metadata: JSON.stringify({
          platform,
          presetId,
          size: body.mediaSize,
          duration: body.mediaDuration,
        }),
      },
    });

    return NextResponse.json({ content }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được video content" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const id = body.id as string;
    if (!id) {
      return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
    }

    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (
      existing.authorId !== session.user.id &&
      session.user.role === "AGENT"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.platform !== undefined) data.platform = body.platform;
    if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl;
    if (body.thumbnailUrl !== undefined) data.thumbnailUrl = body.thumbnailUrl;
    if (body.mediaDuration !== undefined)
      data.mediaDuration = body.mediaDuration;
    if (body.aspectRatio !== undefined) data.aspectRatio = body.aspectRatio;
    if (body.status !== undefined) data.status = body.status;

    if (body.caption !== undefined || body.structured) {
      const base = parseContentBody(existing.body, {
        title: existing.title,
        platform: existing.platform,
        type: existing.type,
      });
      const next = body.structured
        ? { ...base, ...body.structured, version: 1 as const }
        : {
            ...base,
            caption: body.caption ?? base.caption,
            body: body.caption ?? base.body,
            title: body.title || base.title,
          };
      data.body = serializeContent(next);
      if (next.title) data.title = next.title;
    }

    const content = await prisma.content.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true } },
        publishes: true,
      },
    });

    return NextResponse.json({ content });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

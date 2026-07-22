import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isLeaderOrAbove } from "@/lib/rbac";
import { createNotification, notifyUsers } from "@/lib/notifications";
import { buildPublishedUrl } from "@/lib/publish-url";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUS = new Set([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "SCHEDULED",
]);

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true } },
        team: true,
      },
    });
    if (!content) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (
      session.user.role === "AGENT" &&
      content.authorId !== session.user.id &&
      content.assigneeId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ content });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    const isOwner = existing.authorId === session.user.id;
    const leader = isLeaderOrAbove(session.user.role);
    if (!isOwner && !leader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.body !== undefined) data.body = body.body;
    if (body.type !== undefined) data.type = body.type;
    if (body.platform !== undefined) data.platform = body.platform;
    if (body.teamId !== undefined) data.teamId = body.teamId;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    if (body.status !== undefined) {
      if (!ALLOWED_STATUS.has(body.status)) {
        return NextResponse.json({ error: "Status không hợp lệ" }, { status: 400 });
      }
      // Agents: draft / review / schedule / publish own approved content
      if (!leader) {
        const allowedAgent = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED"];
        if (!allowedAgent.includes(body.status)) {
          return NextResponse.json(
            { error: "Agent không có quyền trạng thái này" },
            { status: 403 }
          );
        }
        if (
          body.status === "PUBLISHED" &&
          !["APPROVED", "SCHEDULED", "IN_REVIEW", "DRAFT"].includes(existing.status)
        ) {
          return NextResponse.json(
            { error: "Chỉ publish nội dung của bạn đã sẵn sàng" },
            { status: 403 }
          );
        }
      }
      data.status = body.status;
      if (body.status === "PUBLISHED") {
        data.publishedAt = new Date();

        // Resolve platform connection for real account URL context
        const platformKey = String(
          body.platform || existing.platform || "blog"
        ).toLowerCase();
        let accountId: string | null = null;
        let accountName: string | null = null;
        let config: Record<string, string> | null = null;
        try {
          const conn = await prisma.platformConnection.findUnique({
            where: { platform: platformKey },
          });
          if (conn) {
            accountId = conn.accountId;
            accountName = conn.accountName;
            if (conn.config) {
              try {
                config = JSON.parse(conn.config);
              } catch {
                config = null;
              }
            }
          }
        } catch {
          // ignore missing table during partial deploys
        }

        const title =
          body.title !== undefined ? String(body.title).trim() : existing.title;
        data.publishedUrl =
          body.publishedUrl ||
          buildPublishedUrl({
            contentId: id,
            title,
            platform: platformKey,
            accountId,
            accountName,
            config,
            explicitUrl: body.publishedUrl,
          });
      }
    }

    if (body.publishedUrl !== undefined && body.status !== "PUBLISHED") {
      data.publishedUrl = body.publishedUrl;
    }

    // Publish metrics mock update
    if (body.views !== undefined && leader) data.views = Number(body.views) || 0;
    if (body.likes !== undefined && leader) data.likes = Number(body.likes) || 0;
    if (body.shares !== undefined && leader) data.shares = Number(body.shares) || 0;

    const content = await prisma.content.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });

    // Notifications on status change
    if (body.status && body.status !== existing.status) {
      if (body.status === "APPROVED") {
        await createNotification({
          userId: content.authorId,
          type: "CONTENT_APPROVED",
          title: "Nội dung đã được duyệt",
          message: `«${content.title}» đã được phê duyệt.`,
          link: "/content-studio",
        });
      } else if (body.status === "REJECTED") {
        await createNotification({
          userId: content.authorId,
          type: "CONTENT_REJECTED",
          title: "Nội dung bị từ chối",
          message: `«${content.title}» cần chỉnh sửa lại.`,
          link: "/content-studio",
        });
      } else if (body.status === "PUBLISHED") {
        await createNotification({
          userId: content.authorId,
          type: "PUBLISH_SUCCESS",
          title: "Đăng bài thành công",
          message: `«${content.title}» đã được publish${content.platform ? ` lên ${content.platform}` : ""}.${content.publishedUrl ? ` Link: ${content.publishedUrl}` : ""}`,
          link: content.publishedUrl || "/publish",
        });
      } else if (body.status === "IN_REVIEW" && leader === false) {
        // notify leaders
        const leaders = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "LEADER"] }, status: "ACTIVE" },
          select: { id: true },
        });
        await notifyUsers(
          leaders.map((l) => l.id),
          {
            type: "TASK_ASSIGNED",
            title: "Nội dung chờ duyệt",
            message: `${session.user.name} gửi duyệt «${content.title}».`,
            link: "/content-studio",
          }
        );
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: body.status ? `STATUS_${body.status}` : "UPDATE_CONTENT",
        entity: "Content",
        entityId: id,
      },
    });

    return NextResponse.json({ content });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (
      existing.authorId !== session.user.id &&
      !isLeaderOrAbove(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.content.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

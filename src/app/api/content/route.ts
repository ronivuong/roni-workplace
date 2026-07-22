import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const teamId = searchParams.get("teamId");
    const role = session.user.role;

    const contents = await prisma.content.findMany({
      where: {
        ...(role === "AGENT" ? { authorId: session.user.id } : {}),
        ...(status ? { status } : {}),
        ...(type
          ? type === "video"
            ? { type: { in: ["video", "script"] } }
            : { type }
          : {}),
        ...(teamId ? { teamId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        author: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
        publishes: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });

    return NextResponse.json({ contents });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title || title.length < 2) {
      return NextResponse.json({ error: "Tiêu đề tối thiểu 2 ký tự" }, { status: 400 });
    }

    const content = await prisma.content.create({
      data: {
        title,
        body: body.body ? String(body.body) : null,
        type: body.type || "article",
        status: body.status || "DRAFT",
        platform: body.platform || null,
        authorId: session.user.id,
        assigneeId: body.assigneeId || null,
        teamId: body.teamId || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
      include: {
        author: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_CONTENT",
        entity: "Content",
        entityId: content.id,
      },
    });

    if (body.assigneeId && body.assigneeId !== session.user.id) {
      await createNotification({
        userId: body.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task được assign",
        message: `Bạn được giao xử lý «${content.title}».`,
        link: "/content-studio",
      });
    }

    return NextResponse.json({ content }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isLeaderOrAbove } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.agentJob.findMany({
      where:
        session.user.role === "AGENT" ? { userId: session.user.id } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ jobs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isLeaderOrAbove(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Thiếu tên job" }, { status: 400 });
    }

    const job = await prisma.agentJob.create({
      data: {
        name,
        description: body.description || null,
        cron: body.cron || "0 9 * * *",
        isActive: body.isActive !== false,
        userId: session.user.id,
        nextRunAt: new Date(Date.now() + 3600000),
        config: body.config ? JSON.stringify(body.config) : null,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
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

    const existing = await prisma.agentJob.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (
      existing.userId !== session.user.id &&
      !isLeaderOrAbove(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await prisma.agentJob.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: !!body.isActive } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.cron !== undefined ? { cron: body.cron } : {}),
        ...(body.runNow
          ? {
              lastRunAt: new Date(),
              nextRunAt: new Date(Date.now() + 24 * 3600000),
            }
          : {}),
      },
    });

    // Mock run: create reminder notifications for scheduled content
    if (body.runNow) {
      const scheduled = await prisma.content.findMany({
        where: { status: "SCHEDULED" },
        take: 10,
      });
      for (const c of scheduled) {
        await prisma.notification.create({
          data: {
            userId: c.authorId,
            type: "AI_SCHEDULE_REMINDER",
            title: "AI Agent nhắc lịch đăng bài",
            message: `Agent «${job.name}» nhắc: «${c.title}» đang ở trạng thái lên lịch.`,
            link: "/content-studio",
          },
        });
      }
    }

    return NextResponse.json({ job });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

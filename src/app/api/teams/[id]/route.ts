import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageTeams, isAdmin } from "@/lib/rbac";
import { updateTeamSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                status: true,
                title: true,
              },
            },
          },
        },
        children: true,
        parent: true,
        contents: {
          select: { views: true, likes: true, shares: true, status: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Không tìm thấy team" }, { status: 404 });
    }

    const stats = team.contents.reduce(
      (acc, c) => ({
        views: acc.views + c.views,
        likes: acc.likes + c.likes,
        shares: acc.shares + c.shares,
      }),
      { views: 0, likes: 0, shares: 0 }
    );

    return NextResponse.json({ team: { ...team, stats } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !canManageTeams(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.parentId === id) {
      return NextResponse.json({ error: "Team không thể là parent của chính nó" }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true },
            },
          },
        },
      },
    });

    if (data.leaderId) {
      await prisma.teamMember.updateMany({
        where: { teamId: id },
        data: { isLeader: false },
      });

      const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: data.leaderId } },
      });

      if (existing) {
        await prisma.teamMember.update({
          where: { id: existing.id },
          data: { isLeader: true },
        });
      } else {
        await prisma.teamMember.create({
          data: { teamId: id, userId: data.leaderId, isLeader: true },
        });
      }

      await createNotification({
        userId: data.leaderId,
        type: "TEAM_UPDATE",
        title: "Bạn được gán Leader team",
        message: `Bạn đã được chỉ định làm Leader của «${team.name}».`,
        link: "/teams",
      });
    }

    return NextResponse.json({ team });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Chỉ Admin xóa team" }, { status: 403 });
    }

    const { id } = await params;

    // Reparent children
    await prisma.team.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

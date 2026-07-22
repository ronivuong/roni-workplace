import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageTeams } from "@/lib/rbac";
import { teamMemberSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !canManageTeams(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teamId } = await params;
    const body = await req.json();
    const parsed = teamMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "Không tìm thấy team" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    const member = await prisma.teamMember.upsert({
      where: {
        teamId_userId: { teamId, userId: parsed.data.userId },
      },
      create: {
        teamId,
        userId: parsed.data.userId,
        isLeader: parsed.data.isLeader || false,
      },
      update: {
        isLeader: parsed.data.isLeader ?? false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });

    await createNotification({
      userId: parsed.data.userId,
      type: "TEAM_UPDATE",
      title: "Bạn được thêm vào team",
      message: `Bạn đã được thêm vào team «${team.name}»${parsed.data.isLeader ? " với vai trò Leader" : ""}.`,
      link: "/teams",
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !canManageTeams(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teamId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    if (team) {
      await createNotification({
        userId,
        type: "TEAM_UPDATE",
        title: "Bạn đã rời team",
        message: `Bạn đã được gỡ khỏi team «${team.name}».`,
        link: "/teams",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Chuyển thành viên giữa các team */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !canManageTeams(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: fromTeamId } = await params;
    const body = await req.json();
    const { userId, toTeamId } = body as { userId: string; toTeamId: string };

    if (!userId || !toTeamId) {
      return NextResponse.json({ error: "Thiếu userId hoặc toTeamId" }, { status: 400 });
    }

    const toTeam = await prisma.team.findUnique({ where: { id: toTeamId } });
    if (!toTeam) {
      return NextResponse.json({ error: "Team đích không tồn tại" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.teamMember.deleteMany({
        where: { teamId: fromTeamId, userId },
      }),
      prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: toTeamId, userId } },
        create: { teamId: toTeamId, userId, isLeader: false },
        update: {},
      }),
    ]);

    await createNotification({
      userId,
      type: "TEAM_UPDATE",
      title: "Chuyển team",
      message: `Bạn đã được chuyển sang team «${toTeam.name}».`,
      link: "/teams",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

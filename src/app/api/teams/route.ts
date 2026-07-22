import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageTeams, isAdmin } from "@/lib/rbac";
import { createTeamSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
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
              },
            },
          },
        },
        children: {
          select: { id: true, name: true, slug: true, color: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { members: true, contents: true },
        },
        contents: {
          select: { views: true, likes: true, shares: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = teams.map((t) => {
      const stats = t.contents.reduce(
        (acc, c) => ({
          views: acc.views + c.views,
          likes: acc.likes + c.likes,
          shares: acc.shares + c.shares,
        }),
        { views: 0, likes: 0, shares: 0 }
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { contents, ...rest } = t;
      return { ...rest, stats };
    });

    return NextResponse.json({ teams: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !canManageTeams(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let slug = slugify(data.name);
    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const team = await prisma.team.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        color: data.color || "#10B981",
        parentId: data.parentId || null,
        ...(data.leaderId
          ? {
              members: {
                create: {
                  userId: data.leaderId,
                  isLeader: true,
                },
              },
            }
          : {}),
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
      await createNotification({
        userId: data.leaderId,
        type: "TEAM_UPDATE",
        title: "Bạn được gán Leader team",
        message: `Bạn đã được chỉ định làm Leader của team «${team.name}».`,
        link: "/teams",
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_TEAM",
        entity: "Team",
        entityId: team.id,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Used only for bulk ops if needed
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Chỉ Admin xóa team" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

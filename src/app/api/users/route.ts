import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageUsers, isAdmin } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageUsers(session.user.role) && session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");
    const q = searchParams.get("q");

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        ...(teamId
          ? { teamMembers: { some: { teamId } } }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        phone: true,
        bio: true,
        title: true,
        createdAt: true,
        lastLoginAt: true,
        teamMembers: {
          include: {
            team: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: {
            contents: true,
            activities: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
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

    const allowLeader = true; // from AppSetting ideally
    if (!canManageUsers(session.user.role, allowLeader)) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo tài khoản" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Leader cannot create Admin
    if (session.user.role === "LEADER" && data.role !== "AGENT") {
      return NextResponse.json(
        { error: "Leader chỉ được tạo tài khoản Agent" },
        { status: 403 }
      );
    }

    if (!isAdmin(session.user.role) && data.role === "ADMIN") {
      return NextResponse.json({ error: "Không thể tạo Admin" }, { status: 403 });
    }

    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) {
      return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: passwordHash,
        role: data.role,
        status: data.status || "ACTIVE",
        phone: data.phone,
        bio: data.bio,
        title: data.title,
        ...(data.teamIds?.length
          ? {
              teamMembers: {
                create: data.teamIds.map((teamId) => ({ teamId })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await createNotification({
      userId: user.id,
      type: "SYSTEM",
      title: "Chào mừng đến Roni Workplace",
      message: `Tài khoản của bạn đã được tạo bởi ${session.user.name}. Hãy đăng nhập và bắt đầu sáng tạo!`,
      link: "/dashboard",
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

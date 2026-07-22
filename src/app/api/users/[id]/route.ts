import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canEditUser, canManageUsers, isAdmin } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Self or managers
    if (
      session.user.id !== id &&
      !canManageUsers(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        lastLoginAt: true,
        teamMembers: {
          include: {
            team: true,
          },
        },
        contents: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            views: true,
            createdAt: true,
          },
        },
        activities: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            contents: true,
            activities: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    const isSelf = session.user.id === id;
    const canEdit = canEditUser(
      session.user.role,
      target.role,
      session.user.id,
      id
    );

    if (!canEdit && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Role / status changes restricted
    if ((data.role || data.status) && !canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền đổi role/status" }, { status: 403 });
    }

    if (data.role === "ADMIN" && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Chỉ Admin mới gán role Admin" }, { status: 403 });
    }

    if (session.user.role === "LEADER" && data.role && data.role !== "AGENT") {
      return NextResponse.json({ error: "Leader chỉ quản lý Agent" }, { status: 403 });
    }

    // Prevent demoting last admin
    if (target.role === "ADMIN" && data.role && data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Không thể hạ cấp Admin cuối cùng" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.password) {
      updateData.password = await hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
        updatedAt: true,
      },
    });

    if (data.teamIds !== undefined && canManageUsers(session.user.role)) {
      await prisma.teamMember.deleteMany({ where: { userId: id } });
      if (data.teamIds.length) {
        await prisma.teamMember.createMany({
          data: data.teamIds.map((teamId) => ({ teamId, userId: id })),
        });
      }
    }

    if (data.password) {
      await createNotification({
        userId: id,
        type: "SYSTEM",
        title: "Mật khẩu đã được đặt lại",
        message: `Mật khẩu của bạn vừa được cập nhật bởi ${session.user.name}.`,
        link: "/settings",
      });
    }

    if (data.status === "INACTIVE") {
      await createNotification({
        userId: id,
        type: "SYSTEM",
        title: "Tài khoản bị vô hiệu hóa",
        message: "Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ Admin để được hỗ trợ.",
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER",
        entity: "User",
        entityId: id,
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Chỉ Admin mới xóa user" }, { status: 403 });
    }

    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json({ error: "Không thể xóa chính mình" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Không thể xóa Admin cuối cùng" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

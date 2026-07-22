import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = (formData.get("userId") as string) || session.user.id;

    if (!file) {
      return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
    }

    if (userId !== session.user.id && !canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File tối đa 2MB" }, { status: 400 });
    }

    let imageUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`avatars/${userId}-${Date.now()}.${file.type.split("/")[1]}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      imageUrl = blob.url;
    } else {
      // Local/dev fallback: store as data URL in DB
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      imageUrl = `data:${file.type};base64,${base64}`;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: { id: true, image: true, name: true },
    });

    return NextResponse.json({ url: imageUrl, user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload thất bại" }, { status: 500 });
  }
}

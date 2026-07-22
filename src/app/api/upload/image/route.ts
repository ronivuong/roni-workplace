import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { promises as fs } from "fs";
import { getSession } from "@/lib/auth";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB for article images
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];

/**
 * Upload image for Classic Editor / Article SEO.
 * Prefer Vercel Blob; fall back to public/uploads/images or data URL.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && !ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ảnh tối đa 8MB" }, { status: 400 });
    }

    const ext =
      file.type.split("/")[1]?.replace("jpeg", "jpg") ||
      file.name.split(".").pop() ||
      "jpg";
    const key = `articles/${session.user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    let url: string;
    let storage: "blob" | "local" | "data" = "local";

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(key, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || "image/jpeg",
      });
      url = blob.url;
      storage = "blob";
    } else {
      try {
        const dir = path.join(process.cwd(), "public", "uploads", "images");
        await fs.mkdir(dir, { recursive: true });
        const filename = key.split("/").pop()!;
        const buffer = Buffer.from(await file.arrayBuffer());
        // Guard local size for serverless memory
        if (buffer.length > 2 * 1024 * 1024) {
          const base64 = buffer.toString("base64");
          url = `data:${file.type};base64,${base64}`;
          storage = "data";
        } else {
          await fs.writeFile(path.join(dir, filename), buffer);
          url = `/uploads/images/${filename}`;
          storage = "local";
        }
      } catch {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        url = `data:${file.type};base64,${base64}`;
        storage = "data";
      }
    }

    return NextResponse.json({
      url,
      storage,
      name: file.name,
      size: file.size,
      mime: file.type,
    });
  } catch (e) {
    console.error("image upload", e);
    return NextResponse.json({ error: "Upload ảnh thất bại" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/mpeg",
];
const MAX_BYTES = 200 * 1024 * 1024; // 200MB via Blob client

/**
 * Dual mode:
 * 1) JSON body → Vercel Blob client upload handshake (large files)
 * 2) multipart formData → direct put / local public fallback (smaller / dev)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // —— Client upload token flow (recommended for production) ——
    if (contentType.includes("application/json")) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          {
            error:
              "Chưa cấu hình BLOB_READ_WRITE_TOKEN. Thêm Vercel Blob để upload video lớn, hoặc dùng form upload local (giới hạn).",
          },
          { status: 400 }
        );
      }

      const body = (await req.json()) as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }),
        onUploadCompleted: async () => {
          // optional: audit log
        },
      });
      return NextResponse.json(jsonResponse);
    }

    // —— Multipart direct upload ——
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Thiếu file video" }, { status: 400 });
    }

    if (!file.type.startsWith("video/") && !ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận video (MP4, MOV, WebM…)" },
        { status: 400 }
      );
    }

    const duration = form.get("duration")
      ? Number(form.get("duration"))
      : null;
    const width = form.get("width") ? Number(form.get("width")) : null;
    const height = form.get("height") ? Number(form.get("height")) : null;
    const aspectRatio = (form.get("aspectRatio") as string) || null;

    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      file.type.split("/")[1] ||
      "mp4";
    const key = `videos/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    let url: string;
    let storage: "blob" | "local" = "local";

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File tối đa 200MB" },
          { status: 400 }
        );
      }
      const blob = await put(key, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || "video/mp4",
      });
      url = blob.url;
      storage = "blob";
    } else {
      // Local/dev only — not durable on Vercel serverless
      if (file.size > 40 * 1024 * 1024) {
        return NextResponse.json(
          {
            error:
              "Không có Vercel Blob: giới hạn 40MB local. Thêm BLOB_READ_WRITE_TOKEN để upload lớn + production.",
          },
          { status: 400 }
        );
      }
      const dir = path.join(process.cwd(), "public", "uploads", "videos");
      await mkdir(dir, { recursive: true });
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, filename), buf);
      url = `/uploads/videos/${filename}`;
      storage = "local";
    }

    return NextResponse.json({
      url,
      storage,
      mime: file.type,
      size: file.size,
      name: file.name,
      duration,
      width,
      height,
      aspectRatio,
    });
  } catch (e) {
    console.error("video upload", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload thất bại" },
      { status: 500 }
    );
  }
}

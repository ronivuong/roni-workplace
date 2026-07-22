import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { aiConfigSchema } from "@/lib/validations";

function maskKey(key: string | null | undefined) {
  if (!key) return null;
  if (key.length < 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.aiConfig.findMany({ orderBy: { type: "asc" } });
    const safe = configs.map((c) => ({
      ...c,
      apiKey: maskKey(c.apiKey),
      hasKey: !!c.apiKey,
    }));

    return NextResponse.json({ configs: safe });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = aiConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.aiConfig.findUnique({ where: { type: data.type } });

    const config = await prisma.aiConfig.upsert({
      where: { type: data.type },
      create: {
        type: data.type,
        provider: data.provider,
        model: data.model,
        apiKey: data.apiKey || null,
        baseUrl: data.baseUrl,
        isEnabled: data.isEnabled ?? true,
      },
      update: {
        provider: data.provider,
        model: data.model,
        // only update key if provided and not masked
        ...(data.apiKey && !data.apiKey.includes("••••")
          ? { apiKey: data.apiKey }
          : {}),
        baseUrl: data.baseUrl,
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_AI_CONFIG",
        entity: "AiConfig",
        entityId: config.id,
        metadata: JSON.stringify({ type: data.type, previous: existing?.provider }),
      },
    });

    return NextResponse.json({
      config: {
        ...config,
        apiKey: maskKey(config.apiKey),
        hasKey: !!config.apiKey,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

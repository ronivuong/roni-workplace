import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isLeaderOrAbove } from "@/lib/rbac";
import { PLATFORM_CATALOG, maskSecret } from "@/lib/platforms";

function serialize(conn: {
  id: string;
  platform: string;
  name: string;
  isConnected: boolean;
  accountId: string | null;
  accountName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  config: string | null;
  lastTestedAt: Date | null;
  lastTestOk: boolean | null;
  lastError: string | null;
  connectedAt: Date | null;
  connectedBy: string | null;
  updatedAt: Date;
}) {
  let configObj: Record<string, string> = {};
  if (conn.config) {
    try {
      configObj = JSON.parse(conn.config);
    } catch {
      configObj = {};
    }
  }
  // Mask secrets in config
  const safeConfig: Record<string, string> = {};
  for (const [k, v] of Object.entries(configObj)) {
    if (/secret|token|password|key/i.test(k) && v) {
      safeConfig[k] = maskSecret(v) || "";
    } else {
      safeConfig[k] = v;
    }
  }

  return {
    id: conn.id,
    platform: conn.platform,
    name: conn.name,
    isConnected: conn.isConnected,
    accountId: conn.accountId,
    accountName: conn.accountName,
    hasToken: !!conn.accessToken,
    accessTokenMasked: maskSecret(conn.accessToken),
    config: safeConfig,
    lastTestedAt: conn.lastTestedAt,
    lastTestOk: conn.lastTestOk,
    lastError: conn.lastError,
    connectedAt: conn.connectedAt,
    connectedBy: conn.connectedBy,
    updatedAt: conn.updatedAt,
  };
}

/** Ensure catalog platforms exist as rows */
async function ensureCatalog() {
  for (const p of PLATFORM_CATALOG) {
    await prisma.platformConnection.upsert({
      where: { platform: p.key },
      create: {
        platform: p.key,
        name: p.name,
        isConnected: false,
      },
      update: { name: p.name },
    });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureCatalog();

    const connections = await prisma.platformConnection.findMany({
      orderBy: { name: "asc" },
    });

    const catalog = PLATFORM_CATALOG.map((p) => ({
      ...p,
      connection: serialize(
        connections.find((c) => c.platform === p.key) || {
          id: "",
          platform: p.key,
          name: p.name,
          isConnected: false,
          accountId: null,
          accountName: null,
          accessToken: null,
          refreshToken: null,
          config: null,
          lastTestedAt: null,
          lastTestOk: null,
          lastError: null,
          connectedAt: null,
          connectedBy: null,
          updatedAt: new Date(),
        }
      ),
    }));

    return NextResponse.json({
      platforms: catalog,
      connectedCount: connections.filter((c) => c.isConnected).length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isLeaderOrAbove(session.user.role)) {
      return NextResponse.json(
        { error: "Chỉ Admin/Leader được cấu hình kết nối nền tảng" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const platform = String(body.platform || "");
    const def = PLATFORM_CATALOG.find((p) => p.key === platform);
    if (!def) {
      return NextResponse.json({ error: "Nền tảng không hỗ trợ" }, { status: 400 });
    }

    await ensureCatalog();

    const existing = await prisma.platformConnection.findUnique({
      where: { platform },
    });

    // Merge config
    let prevConfig: Record<string, string> = {};
    if (existing?.config) {
      try {
        prevConfig = JSON.parse(existing.config);
      } catch {
        prevConfig = {};
      }
    }

    const incoming = (body.fields || {}) as Record<string, string>;
    const nextConfig = { ...prevConfig };

    let accessToken = existing?.accessToken || null;
    let accountId = existing?.accountId || null;
    let accountName = existing?.accountName || null;

    for (const field of def.fields) {
      const val = incoming[field.key];
      if (val === undefined || val === null || val === "") continue;
      // skip masked placeholders
      if (typeof val === "string" && val.includes("••••")) continue;

      if (field.key === "accessToken") {
        accessToken = val;
      } else if (field.key === "accountId") {
        accountId = val;
      } else if (field.key === "accountName") {
        accountName = val;
      } else if (field.key === "siteUrl") {
        accountId = val.replace(/\/$/, "");
        nextConfig.siteUrl = accountId;
      } else if (field.key === "username") {
        nextConfig.username = val;
      } else {
        nextConfig[field.key] = val;
      }
    }

    // WordPress uses siteUrl as accountId + username in config
    if (platform === "wordpress" && incoming.siteUrl && !incoming.siteUrl.includes("••••")) {
      accountId = incoming.siteUrl.replace(/\/$/, "");
    }
    if (platform === "wordpress" && incoming.username && !incoming.username.includes("••••")) {
      accountName = incoming.username;
      nextConfig.username = incoming.username;
    }

    const connect = body.connect !== false;

    if (connect) {
      // Validate required fields for connect
      for (const field of def.fields.filter((f) => f.required)) {
        const hasIncoming =
          incoming[field.key] && !String(incoming[field.key]).includes("••••");
        const hasExisting =
          field.key === "accessToken"
            ? !!accessToken
            : field.key === "accountId"
              ? !!accountId
              : field.key === "siteUrl"
                ? !!(nextConfig.siteUrl || accountId)
                : field.key === "username"
                  ? !!(nextConfig.username || accountName)
                  : !!(nextConfig[field.key] || prevConfig[field.key]);

        if (!hasIncoming && !hasExisting) {
          return NextResponse.json(
            { error: `Thiếu trường bắt buộc: ${field.label}` },
            { status: 400 }
          );
        }
      }
    }

    const conn = await prisma.platformConnection.update({
      where: { platform },
      data: {
        name: def.name,
        isConnected: connect,
        accountId,
        accountName,
        accessToken: connect ? accessToken : null,
        config: JSON.stringify(nextConfig),
        connectedAt: connect ? new Date() : null,
        connectedBy: connect ? session.user.id : null,
        lastError: null,
        ...(!connect
          ? { lastTestOk: null, lastTestedAt: null }
          : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: connect ? "CONNECT_PLATFORM" : "DISCONNECT_PLATFORM",
        entity: "PlatformConnection",
        entityId: conn.id,
        metadata: JSON.stringify({ platform }),
      },
    });

    return NextResponse.json({
      connection: serialize(conn),
      message: connect
        ? `Đã kết nối ${def.name}`
        : `Đã ngắt kết nối ${def.name}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

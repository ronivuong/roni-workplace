import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Calendar events: scheduled + published distributions */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 86400000);

    const role = session.user.role;
    const authorFilter =
      role === "AGENT" ? { content: { authorId: session.user.id } } : {};

    const publishes = await prisma.contentPublish.findMany({
      where: {
        ...authorFilter,
        OR: [
          {
            status: "SCHEDULED",
            scheduledAt: { gte: fromDate, lte: toDate },
          },
          {
            status: "PUBLISHED",
            publishedAt: { gte: fromDate, lte: toDate },
          },
        ],
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            author: { select: { name: true } },
          },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { publishedAt: "asc" }],
    });

    // Also include content-level scheduled without distribute records
    const loneScheduled = await prisma.content.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: fromDate, lte: toDate },
        ...(role === "AGENT" ? { authorId: session.user.id } : {}),
        publishes: { none: {} },
      },
      select: {
        id: true,
        title: true,
        platform: true,
        scheduledAt: true,
        status: true,
        type: true,
        author: { select: { name: true } },
      },
    });

    const events = [
      ...publishes.map((p) => ({
        id: p.id,
        contentId: p.contentId,
        title: p.content.title,
        platform: p.platform,
        status: p.status,
        at: p.status === "SCHEDULED" ? p.scheduledAt : p.publishedAt,
        publishedUrl: p.publishedUrl,
        author: p.content.author.name,
        type: p.content.type,
        source: "distribute" as const,
      })),
      ...loneScheduled.map((c) => ({
        id: `content-${c.id}`,
        contentId: c.id,
        title: c.title,
        platform: c.platform || "blog",
        status: "SCHEDULED",
        at: c.scheduledAt,
        publishedUrl: null as string | null,
        author: c.author.name,
        type: c.type,
        source: "content" as const,
      })),
    ].filter((e) => e.at);

    return NextResponse.json({ events, from: fromDate, to: toDate });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
